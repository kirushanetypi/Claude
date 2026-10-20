import Foundation
import WebKit

/// Вкладки и хранилища всех профилей. Вкладки живут в памяти,
/// cookies/localStorage/кэш — в WKWebsiteDataStore профиля.
@MainActor
final class BrowserModel: ObservableObject {
    @Published var currentProfileID: UUID?
    @Published private(set) var tabs: [UUID: [Tab]] = [:]
    @Published private(set) var selectedTab: [UUID: UUID] = [:]
    @Published private(set) var externalIP: [UUID: String] = [:]

    private var stores: [UUID: WKWebsiteDataStore] = [:]

    static let startPage = "https://duckduckgo.com"

    func currentTab(_ profileID: UUID) -> Tab? {
        tabs[profileID]?.first { $0.id == selectedTab[profileID] } ?? tabs[profileID]?.first
    }

    func switchTo(_ profile: Profile) {
        currentProfileID = profile.id
        if tabs[profile.id, default: []].isEmpty { newTab(profile) }
        if externalIP[profile.id] == nil { refreshIP(profile) }
    }

    func newTab(_ profile: Profile, url: String = BrowserModel.startPage) {
        let tab = Tab(profile: profile, dataStore: dataStore(for: profile))
        tabs[profile.id, default: []].append(tab)
        selectedTab[profile.id] = tab.id
        tab.load(url)
    }

    func select(_ tab: Tab) {
        selectedTab[tab.profile.id] = tab.id
    }

    func close(_ tab: Tab) {
        let pid = tab.profile.id
        tab.webView.stopLoading()
        tabs[pid]?.removeAll { $0.id == tab.id }
        if selectedTab[pid] == tab.id { selectedTab[pid] = tabs[pid]?.last?.id }
    }

    /// Профиль изменили в настройках.
    func apply(_ old: Profile, _ new: Profile) {
        let proxyChanged = old.proxyType != new.proxyType || old.host != new.host || old.port != new.port
            || old.username != new.username || old.password != new.password

        if proxyChanged {
            // Пересоздаём хранилище и вкладки: старые keep-alive соединения
            // не должны пережить смену прокси.
            let urls = tabs[new.id, default: []].compactMap { $0.url?.absoluteString }
            closeAll(new.id)
            externalIP[new.id] = nil
            if currentProfileID == new.id {
                urls.forEach { newTab(new, url: $0) }
                if urls.isEmpty { newTab(new) }
            }
            refreshIP(new)
        } else {
            for tab in tabs[new.id, default: []] {
                tab.profile = new
                tab.webView.customUserAgent = new.customUserAgent.isEmpty ? Profile.defaultUserAgent : new.customUserAgent
            }
        }
    }

    /// Закрыть все вкладки профиля и отпустить хранилище (нужно перед удалением).
    func closeAll(_ profileID: UUID) {
        tabs[profileID]?.forEach { $0.webView.stopLoading() }
        tabs[profileID] = nil
        selectedTab[profileID] = nil
        stores[profileID] = nil
    }

    func forget(_ profileID: UUID) {
        closeAll(profileID)
        externalIP[profileID] = nil
        if currentProfileID == profileID { currentProfileID = nil }
    }

    func refreshIP(_ profile: Profile) {
        externalIP[profile.id] = "…"
        Task {
            let text: String
            do {
                let r = try await ProxyChecker.check(profile)
                text = r.ip
            } catch {
                text = "нет связи"
            }
            // профиль могли удалить, пока шла проверка
            if externalIP[profile.id] != nil { externalIP[profile.id] = text }
        }
    }

    private func dataStore(for profile: Profile) -> WKWebsiteDataStore {
        if let store = stores[profile.id] {
            return store
        }
        let store = WKWebsiteDataStore(forIdentifier: profile.id)
        store.proxyConfigurations = profile.proxyConfiguration.map { [$0] } ?? []
        stores[profile.id] = store
        return store
    }
}
