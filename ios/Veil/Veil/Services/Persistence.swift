import Foundation

/// JSON-файлы в Application Support/Veil с NSFileProtectionComplete (зашифрованы, пока устройство заблокировано).
enum Persistence {
    static let root: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Veil", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true,
                                                 attributes: [.protectionKey: FileProtectionType.complete])
        return base
    }()

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()
    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    static func directory(_ name: String) -> URL {
        let u = root.appendingPathComponent(name, isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true,
                                                 attributes: [.protectionKey: FileProtectionType.complete])
        return u
    }

    static func file(_ name: String) -> URL { root.appendingPathComponent(name) }

    static func profileFile(_ id: UUID, _ name: String) -> URL {
        directory("profiles/\(id.uuidString)").appendingPathComponent(name)
    }

    static func deleteProfileFiles(_ id: UUID) {
        try? FileManager.default.removeItem(at: root.appendingPathComponent("profiles/\(id.uuidString)", isDirectory: true))
    }

    static func load<T: Decodable>(_ type: T.Type, from url: URL) -> T? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? decoder.decode(type, from: data)
    }

    static func save<T: Encodable>(_ value: T, to url: URL) {
        do {
            let data = try encoder.encode(value)
            try data.write(to: url, options: [.atomic, .completeFileProtection])
        } catch {
            print("[Persistence] save failed \(url.lastPathComponent): \(error)")
        }
    }

    static func delete(_ url: URL) { try? FileManager.default.removeItem(at: url) }

    static func wipeAll() {
        try? FileManager.default.removeItem(at: root)
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true,
                                                 attributes: [.protectionKey: FileProtectionType.complete])
    }
}
