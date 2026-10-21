import Foundation
import WebKit
import Network

/// Живое состояние одного профиля: его WKWebsiteDataStore, прокси, правила блокировки, якоря доверия.
@MainActor
final class ProfileRuntime {
    private(set) var profile: BrowserProfile
    let dataStore: WKWebsiteDataStore
    let processPool = WKProcessPool()
    private(set) var ruleLists: [WKContentRuleList] = []
    private(set) var anchors: [TrustedCertificate] = []
    private(set) var knownAnchors: [TrustedCertificate] = []
    /// Хосты, для которых пользователь разрешил невалидный TLS (только до закрытия приложения).
    var sessionTrustExceptions: Set<String> = []
    /// Хосты, для которых пользователь разрешил чистый HTTP при включённом HTTPS-only (до закрытия приложения).
    var httpAllowedHosts: Set<String> = []
    private var prepared = false
    private unowned let certificates: CertificateStore

    init(profile: BrowserProfile, certificates: CertificateStore) {
        self.profile = profile
        self.certificates = certificates
        self.dataStore = profile.isEphemeral ? .nonPersistent() : WKWebsiteDataStore(forIdentifier: profile.dataStoreID)
    }

    func prepare() async {
        guard !prepared else { return }
        prepared = true
        if profile.settings.clearOnLaunch { await clearAllData() }
        await reloadSettings()
    }

    /// Синхронная часть обновления: якоря доверия и прокси применяются сразу, до await.
    func applyImmediate(profile: BrowserProfile) {
        self.profile = profile
        refreshTrust()
        applyProxy()
    }

    func update(profile: BrowserProfile) async {
        applyImmediate(profile: profile)
        ruleLists = await ContentBlocker.shared.ruleLists(for: profile.settings)
    }

    func refreshTrust() {
        anchors = certificates.enabledCertificates(for: profile)
        knownAnchors = certificates.all
    }

    private func reloadSettings() async {
        ruleLists = await ContentBlocker.shared.ruleLists(for: profile.settings)
        refreshTrust()
        applyProxy()
    }

    private func applyProxy() {
        let password = KeychainHelper.get(profile.proxyKeychainKey) ?? ""
        if let cfg = ProxyBuilder.make(profile.settings.proxy, password: password) {
            dataStore.proxyConfigurations = [cfg]
        } else {
            dataStore.proxyConfigurations = []
        }
    }

    func makeConfiguration() -> WKWebViewConfiguration {
        let s = profile.settings
        let c = WKWebViewConfiguration()
        c.websiteDataStore = dataStore
        c.processPool = processPool
        c.allowsInlineMediaPlayback = true
        c.upgradeKnownHostsToHTTPS = s.httpsOnly
        c.defaultWebpagePreferences.allowsContentJavaScript = s.javaScriptEnabled
        c.defaultWebpagePreferences.preferredContentMode = (s.desktopMode || s.userAgent.impliesDesktopLayout) ? .desktop : .recommended
        c.preferences.javaScriptCanOpenWindowsAutomatically = false
        c.preferences.isFraudulentWebsiteWarningEnabled = s.safeBrowsing
        c.preferences.isElementFullscreenEnabled = true
        // Делает дефолтный UA неотличимым от Safari (по умолчанию WKWebView светит "Mobile/15E148" без Safari-токена).
        c.applicationNameForUserAgent = "Version/18.5 Mobile/15E148 Safari/604.1"

        let ucc = WKUserContentController()
        ruleLists.forEach { ucc.add($0) }
        FingerprintScripts.userScripts(for: profile).forEach { ucc.addUserScript($0) }
        c.userContentController = ucc
        return c
    }

    func clearAllData() async {
        await dataStore.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), modifiedSince: .distantPast)
        sessionTrustExceptions.removeAll()
        httpAllowedHosts.removeAll()
    }

    func clearData(forHost host: String) async {
        let records = await dataStore.dataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes())
        let matching = records.filter { host == $0.displayName || host.hasSuffix("." + $0.displayName) }
        guard !matching.isEmpty else { return }
        await dataStore.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), for: matching)
    }

    // MARK: - Data store lifecycle (iOS 17 API)

    static func allDataStoreIdentifiers() async -> [UUID] {
        await withCheckedContinuation { cont in
            WKWebsiteDataStore.fetchAllDataStoreIdentifiers { cont.resume(returning: $0) }
        }
    }

    static func removeDataStore(id: UUID) async throws {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            WKWebsiteDataStore.remove(forIdentifier: id) { error in
                if let error { cont.resume(throwing: error) } else { cont.resume() }
            }
        }
    }
}

enum ProxyBuilder {
    static func make(_ p: ProxySettings, password: String) -> ProxyConfiguration? {
        guard p.isConfigured, let port = NWEndpoint.Port(rawValue: UInt16(clamping: p.port)) else { return nil }
        let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(p.host.trimmingCharacters(in: .whitespaces)), port: port)
        let config: ProxyConfiguration
        switch p.kind {
        case .none:
            return nil
        case .http:
            config = ProxyConfiguration(httpCONNECTProxy: endpoint, tlsOptions: p.useTLS ? NWProtocolTLS.Options() : nil)
        case .socks5:
            config = ProxyConfiguration(socksv5Proxy: endpoint)
        }
        if !p.username.isEmpty {
            config.applyCredential(username: p.username, password: password)
        }
        // Критично для анонимности: если прокси упал — НЕ ходить напрямую.
        config.allowFailover = false
        return config
    }
}
