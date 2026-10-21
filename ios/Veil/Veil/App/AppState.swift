import SwiftUI
import WebKit
import Observation

@Observable @MainActor
final class AppState {
    private(set) var profiles: [BrowserProfile] = []
    private(set) var activeProfileID: UUID?
    private(set) var activeTabManager: TabManager?
    var isInactive = false
    var pendingAlert: AppAlert?
    private(set) var settings = AppSettings()

    let certificates = CertificateStore()
    let lock = AppLock()
    let downloads = DownloadManager()

    @ObservationIgnored private var runtimes: [UUID: ProfileRuntime] = [:]
    @ObservationIgnored private var tabManagers: [UUID: TabManager] = [:]
    @ObservationIgnored private var pendingURL: URL?
    @ObservationIgnored private var bootstrapped = false

    private static let profilesFile = Persistence.file("profiles.json")
    private static let settingsFile = Persistence.file("settings.json")
    private static let activeProfileKey = "activeProfileID"

    var activeProfile: BrowserProfile? { profiles.first { $0.id == activeProfileID } }
    var shouldShield: Bool { lock.isLocked || isInactive }

    // MARK: - Lifecycle

    func bootstrap() async {
        guard !bootstrapped else { return }
        bootstrapped = true
        settings = Persistence.load(AppSettings.self, from: Self.settingsFile) ?? AppSettings()
        lock.configure(enabled: settings.lockEnabled, grace: settings.lockGraceSeconds)
        if settings.lockEnabled { lock.isLocked = true }

        profiles = Persistence.load([BrowserProfile].self, from: Self.profilesFile) ?? []
        if profiles.isEmpty {
            profiles = BrowserProfile.defaults()
            saveProfiles()
        }
        await removeOrphanDataStores()

        let lastID = UserDefaults.standard.string(forKey: Self.activeProfileKey).flatMap(UUID.init)
        let target = profiles.first { $0.id == lastID && !$0.requiresAuth }
            ?? profiles.first { !$0.requiresAuth }
            ?? profiles[0]
        await activate(target, authenticate: target.requiresAuth)
    }

    func scenePhaseChanged(_ phase: ScenePhase) {
        switch phase {
        case .active:
            isInactive = false
            lock.didBecomeActive()
        case .inactive:
            isInactive = settings.shieldInSwitcher
        case .background:
            isInactive = true
            lock.didEnterBackground()
            tabManagers.values.forEach { $0.flush() }
        @unknown default:
            break
        }
    }

    func updateSettings(_ s: AppSettings) {
        settings = s
        Persistence.save(s, to: Self.settingsFile)
        lock.configure(enabled: s.lockEnabled, grace: s.lockGraceSeconds)
    }

    func handleIncoming(url: URL) {
        var target = url
        if url.scheme?.lowercased() == "veil" {
            guard let comps = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let raw = comps.queryItems?.first(where: { $0.name == "url" })?.value,
                  let u = URL(string: raw) else { return }
            target = u
        }
        guard ["http", "https"].contains(target.scheme?.lowercased() ?? "") else { return }
        if let tm = activeTabManager { tm.newTab(url: target) } else { pendingURL = target }
    }

    // MARK: - Profiles

    func runtime(for profile: BrowserProfile) -> ProfileRuntime {
        if let rt = runtimes[profile.id] { return rt }
        let rt = ProfileRuntime(profile: profile, certificates: certificates)
        runtimes[profile.id] = rt
        return rt
    }

    func tabManager(for profile: BrowserProfile) -> TabManager? { tabManagers[profile.id] }

    @discardableResult
    func activate(_ profile: BrowserProfile, authenticate: Bool) async -> Bool {
        if authenticate {
            let ok = await lock.authenticate(reason: "Открыть профиль «\(profile.name)»")
            guard ok else { return false }
        }
        let rt = runtime(for: profile)
        await rt.prepare()
        let tm: TabManager
        if let existing = tabManagers[profile.id] {
            tm = existing
        } else {
            tm = TabManager(profile: profile, runtime: rt, downloads: downloads, certificates: certificates)
            tabManagers[profile.id] = tm
        }
        activeProfileID = profile.id
        activeTabManager = tm
        UserDefaults.standard.set(profile.id.uuidString, forKey: Self.activeProfileKey)
        if let u = pendingURL {
            pendingURL = nil
            tm.newTab(url: u)
        }
        return true
    }

    func add(_ profile: BrowserProfile) {
        profiles.append(profile)
        saveProfiles()
    }

    func update(_ profile: BrowserProfile) {
        guard let i = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        let old = profiles[i]
        profiles[i] = profile
        saveProfiles()
        guard let rt = runtimes[profile.id] else { return }
        let rebuild = old.settings.configurationSignature != profile.settings.configurationSignature
            || old.isEphemeral != profile.isEphemeral
        rt.applyImmediate(profile: profile)
        Task {
            await rt.update(profile: profile)
            tabManagers[profile.id]?.profileChanged(profile, rebuild: rebuild)
        }
    }

    /// Включить якорь доверия (Минцифры или импортированный CA) для профиля. Применяется мгновенно.
    func enableTrust(anchorID: String, for profileID: UUID) {
        guard var p = profiles.first(where: { $0.id == profileID }),
              let cert = certificates.certificate(withID: anchorID) else { return }
        if cert.isBundled { p.settings.trustRussianCA = true } else { p.settings.trustedCertificateIDs.insert(anchorID) }
        update(p)
    }

    func delete(_ profile: BrowserProfile) async {
        guard profiles.count > 1 else {
            pendingAlert = AppAlert(title: "Нельзя удалить", message: "Должен остаться хотя бы один профиль.")
            return
        }
        if activeProfileID == profile.id {
            guard let next = profiles.first(where: { $0.id != profile.id }) else { return }
            let ok = await activate(next, authenticate: next.requiresAuth)
            guard ok else { return }
        }
        tabManagers[profile.id]?.teardown()
        tabManagers[profile.id] = nil
        runtimes[profile.id] = nil
        profiles.removeAll { $0.id == profile.id }
        saveProfiles()
        Persistence.deleteProfileFiles(profile.id)
        KeychainHelper.delete(profile.proxyKeychainKey)
        try? FileManager.default.removeItem(at: DownloadManager.directory(for: profile))
        if !profile.isEphemeral { await removeDataStoreWithRetry(profile.dataStoreID) }
    }

    func clearData(of profile: BrowserProfile) async {
        let rt = runtime(for: profile)
        await rt.clearAllData()
        tabManagers[profile.id]?.clearHistory()
        tabManagers[profile.id]?.closeAll()
    }

    /// Тревожная кнопка: всё в ноль.
    func panicWipe() async {
        activeTabManager = nil
        activeProfileID = nil
        tabManagers.values.forEach { $0.teardown() }
        tabManagers.removeAll()
        runtimes.removeAll()
        for p in profiles where !p.isEphemeral { await removeDataStoreWithRetry(p.dataStoreID) }
        for id in await ProfileRuntime.allDataStoreIdentifiers() { await removeDataStoreWithRetry(id) }
        await WKWebsiteDataStore.default().removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast)
        Persistence.wipeAll()
        KeychainHelper.deleteAll()
        downloads.wipeAll()
        UserDefaults.standard.removeObject(forKey: Self.activeProfileKey)
        certificates.reloadImported()
        profiles = BrowserProfile.defaults()
        saveProfiles()
        await activate(profiles[0], authenticate: false)
    }

    // MARK: - Private

    private func saveProfiles() { Persistence.save(profiles, to: Self.profilesFile) }

    private func removeOrphanDataStores() async {
        let known = Set(profiles.map(\.dataStoreID))
        for id in await ProfileRuntime.allDataStoreIdentifiers() where !known.contains(id) {
            await removeDataStoreWithRetry(id)
        }
    }

    private func removeDataStoreWithRetry(_ id: UUID) async {
        for attempt in 0..<4 {
            do {
                try await ProfileRuntime.removeDataStore(id: id)
                return
            } catch {
                if attempt == 3 { print("[AppState] remove data store \(id) failed: \(error)") }
                try? await Task.sleep(for: .milliseconds(300))
            }
        }
    }
}
