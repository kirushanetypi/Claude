import Foundation
import UIKit
import WebKit
import Observation

struct JSDialog: Identifiable {
    enum Kind { case alert, confirm, prompt(defaultText: String) }
    enum Result { case dismissed, confirmed(Bool), text(String?) }
    let id = UUID()
    let host: String
    let message: String
    let kind: Kind
    let completion: (Result) -> Void
}

/// Вкладки, закладки, история и JS-диалоги одного профиля.
@Observable @MainActor
final class TabManager {
    private(set) var profile: BrowserProfile
    let runtime: ProfileRuntime
    let downloads: DownloadManager
    private unowned let certificates: CertificateStore

    private(set) var tabs: [WebTab] = []
    private(set) var selectedTabID: UUID?
    private(set) var bookmarks: [Bookmark] = []
    private(set) var history: [HistoryEntry] = []
    var currentDialog: JSDialog?

    @ObservationIgnored private var dialogQueue: [JSDialog] = []
    @ObservationIgnored private var saveTask: Task<Void, Never>?

    var selectedTab: WebTab? { tabs.first { $0.id == selectedTabID } }

    init(profile: BrowserProfile, runtime: ProfileRuntime, downloads: DownloadManager, certificates: CertificateStore) {
        self.profile = profile
        self.runtime = runtime
        self.downloads = downloads
        self.certificates = certificates
        if !profile.isEphemeral {
            bookmarks = Persistence.load([Bookmark].self, from: Persistence.profileFile(profile.id, "bookmarks.json")) ?? []
            history = Persistence.load([HistoryEntry].self, from: Persistence.profileFile(profile.id, "history.json")) ?? []
            if let session = Persistence.load(ProfileSession.self, from: Persistence.profileFile(profile.id, "session.json")) {
                tabs = session.tabs.map { WebTab(manager: self, record: $0) }
                selectedTabID = session.selectedTabID.flatMap { id in tabs.contains { $0.id == id } ? id : nil } ?? tabs.first?.id
            }
        }
        if tabs.isEmpty { newTab(url: nil) }
        selectedTab?.prepareForDisplay()
    }

    func certificateName(for id: String) -> String? { certificates.certificate(withID: id)?.subject }

    func profileChanged(_ p: BrowserProfile, rebuild: Bool) {
        profile = p
        guard rebuild else { return }
        tabs.forEach { $0.discardWebView() }
        selectedTab?.prepareForDisplay()
    }

    // MARK: - Tabs

    @discardableResult
    func newTab(url: URL?, select: Bool = true, configuration: WKWebViewConfiguration? = nil) -> WebTab {
        let tab = WebTab(manager: self, url: url, configuration: configuration)
        if let sel = selectedTabID, let i = tabs.firstIndex(where: { $0.id == sel }) {
            tabs.insert(tab, at: i + 1)
        } else {
            tabs.append(tab)
        }
        if configuration != nil { tab.ensureWebView() }
        if select { self.select(tab) }
        scheduleSave()
        return tab
    }

    func select(_ tab: WebTab) {
        if let cur = selectedTab, cur.id != tab.id { cur.captureSnapshot() }
        selectedTabID = tab.id
        tab.prepareForDisplay()
        scheduleSave()
    }

    func close(_ tab: WebTab) {
        guard let i = tabs.firstIndex(where: { $0.id == tab.id }) else { return }
        tabs.remove(at: i)
        tab.teardown()
        if selectedTabID == tab.id {
            if let next = tabs.indices.contains(i) ? tabs[i] : tabs.last {
                select(next)
            } else {
                selectedTabID = nil
                newTab(url: nil)
            }
        }
        scheduleSave()
    }

    func closeAll() {
        tabs.forEach { $0.teardown() }
        tabs.removeAll()
        selectedTabID = nil
        newTab(url: nil)
    }

    func memoryWarning() {
        tabs.filter { $0.id != selectedTabID }.forEach { $0.discardWebView() }
    }

    /// Полная остановка (удаление профиля / wipe).
    func teardown() {
        tabs.forEach { $0.teardown() }
        tabs.removeAll()
        selectedTabID = nil
        saveTask?.cancel()
        let pending = dialogQueue + (currentDialog.map { [$0] } ?? [])
        dialogQueue.removeAll()
        currentDialog = nil
        pending.forEach { $0.completion(.dismissed) }
    }

    // MARK: - History & bookmarks

    func recordVisit(url: URL, title: String) {
        guard !profile.isEphemeral, let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else { return }
        let name = title.isEmpty ? (url.host ?? url.absoluteString) : title
        if let first = history.first, first.url == url {
            history[0].title = name
            history[0].visitedAt = Date()
        } else {
            history.insert(HistoryEntry(title: name, url: url), at: 0)
            if history.count > 3000 { history.removeLast(history.count - 3000) }
        }
        scheduleSave()
    }

    func updateHistoryTitle(for url: URL, title: String) {
        guard let i = history.firstIndex(where: { $0.url == url }), history[i].title != title else { return }
        history[i].title = title
        scheduleSave()
    }

    func clearHistory() {
        history.removeAll()
        flush()
    }

    func isBookmarked(_ url: URL?) -> Bool {
        guard let url else { return false }
        return bookmarks.contains { $0.url == url }
    }

    func toggleBookmark(url: URL?, title: String) {
        guard let url else { return }
        if let i = bookmarks.firstIndex(where: { $0.url == url }) {
            bookmarks.remove(at: i)
        } else {
            bookmarks.insert(Bookmark(title: title.isEmpty ? (url.host ?? url.absoluteString) : title, url: url), at: 0)
        }
        flush()
    }

    func removeBookmarks(at offsets: IndexSet) {
        bookmarks.remove(atOffsets: offsets)
        flush()
    }

    func suggestions(for query: String) -> [HistoryEntry] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard q.count >= 2 else { return [] }
        var seen = Set<URL>()
        let fromBookmarks = bookmarks.map { HistoryEntry(title: $0.title, url: $0.url, visitedAt: $0.createdAt) }
        return (fromBookmarks + history).filter {
            $0.url.absoluteString.lowercased().contains(q) || $0.title.lowercased().contains(q)
        }.filter { seen.insert($0.url).inserted }.prefix(8).map { $0 }
    }

    // MARK: - Persistence

    func scheduleSave() {
        guard !profile.isEphemeral else { return }
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(1))
            guard !Task.isCancelled else { return }
            self?.flush()
        }
    }

    func flush() {
        guard !profile.isEphemeral else { return }
        let session = ProfileSession(tabs: tabs.map { $0.record() }, selectedTabID: selectedTabID)
        Persistence.save(session, to: Persistence.profileFile(profile.id, "session.json"))
        Persistence.save(bookmarks, to: Persistence.profileFile(profile.id, "bookmarks.json"))
        Persistence.save(history, to: Persistence.profileFile(profile.id, "history.json"))
    }

    // MARK: - Dialogs & external

    func present(_ dialog: JSDialog) {
        if currentDialog == nil { currentDialog = dialog } else { dialogQueue.append(dialog) }
    }

    func finishDialog(_ result: JSDialog.Result) {
        guard let d = currentDialog else { return }
        currentDialog = nil
        d.completion(result)
        guard !dialogQueue.isEmpty else { return }
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(350))
            guard let self, self.currentDialog == nil, !self.dialogQueue.isEmpty else { return }
            self.currentDialog = self.dialogQueue.removeFirst()
        }
    }

    func openExternal(_ url: URL) {
        UIApplication.shared.open(url)
    }
}
