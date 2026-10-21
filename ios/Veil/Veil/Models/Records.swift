import Foundation

struct TabRecord: Codable, Identifiable {
    var id: UUID
    var url: URL?
    var title: String
    var interactionState: Data?
    var isDesktop: Bool
}

struct ProfileSession: Codable {
    var tabs: [TabRecord]
    var selectedTabID: UUID?
}

struct Bookmark: Codable, Identifiable, Hashable {
    var id = UUID()
    var title: String
    var url: URL
    var createdAt = Date()
}

struct HistoryEntry: Codable, Identifiable, Hashable {
    var id = UUID()
    var title: String
    var url: URL
    var visitedAt = Date()
}

struct AppSettings: Codable, Equatable {
    var lockEnabled = false
    var lockGraceSeconds = 0
    var shieldInSwitcher = true

    init() {}
    private enum CodingKeys: String, CodingKey { case lockEnabled, lockGraceSeconds, shieldInSwitcher }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        lockEnabled = try c.decodeIfPresent(Bool.self, forKey: .lockEnabled) ?? false
        lockGraceSeconds = try c.decodeIfPresent(Int.self, forKey: .lockGraceSeconds) ?? 0
        shieldInSwitcher = try c.decodeIfPresent(Bool.self, forKey: .shieldInSwitcher) ?? true
    }
}

struct AppAlert: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}
