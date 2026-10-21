import Foundation
import WebKit

/// Компилирует WKContentRuleList'ы: трекеры (из trackers.json), блок сторонних cookie, апгрейд до HTTPS.
@MainActor
final class ContentBlocker {
    static let shared = ContentBlocker()
    private var cache: [String: WKContentRuleList] = [:]
    private let version = "1"

    func ruleLists(for settings: ProfileSettings) async -> [WKContentRuleList] {
        var lists: [WKContentRuleList] = []
        if settings.blockTrackers, let l = await list(id: "trackers", json: Self.trackersJSON()) { lists.append(l) }
        if settings.blockThirdPartyCookies, let l = await list(id: "cookies3p", json: Self.thirdPartyCookiesJSON) { lists.append(l) }
        if settings.httpsOnly, let l = await list(id: "https", json: Self.httpsJSON) { lists.append(l) }
        return lists
    }

    private func list(id: String, json: String?) async -> WKContentRuleList? {
        let key = "veil.\(id).v\(version)"
        if let cached = cache[key] { return cached }
        guard let json, let store = WKContentRuleListStore.default() else { return nil }
        if let existing = await lookUp(store, key) {
            cache[key] = existing
            return existing
        }
        do {
            let compiled = try await compile(store, key, json)
            cache[key] = compiled
            return compiled
        } catch {
            print("[ContentBlocker] compile \(key) failed: \(error)")
            return nil
        }
    }

    private func lookUp(_ store: WKContentRuleListStore, _ key: String) async -> WKContentRuleList? {
        await withCheckedContinuation { cont in
            store.lookUpContentRuleList(forIdentifier: key) { list, _ in cont.resume(returning: list) }
        }
    }

    private struct CompileError: Error {}

    private func compile(_ store: WKContentRuleListStore, _ key: String, _ json: String) async throws -> WKContentRuleList {
        try await withCheckedThrowingContinuation { cont in
            store.compileContentRuleList(forIdentifier: key, encodedContentRuleList: json) { list, error in
                if let error { cont.resume(throwing: error) }
                else if let list { cont.resume(returning: list) }
                else { cont.resume(throwing: CompileError()) }
            }
        }
    }

    private static func trackersJSON() -> String? {
        guard let url = Bundle.main.url(forResource: "trackers", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static let thirdPartyCookiesJSON = """
    [{"trigger":{"url-filter":".*","load-type":["third-party"]},"action":{"type":"block-cookies"}}]
    """

    private static let httpsJSON = """
    [{"trigger":{"url-filter":"^http://.*"},"action":{"type":"make-https"}}]
    """
}
