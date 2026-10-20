import Foundation
import WebKit

/// Профили — JSON в Application Support, пароли — в Keychain.
@MainActor
final class ProfileStore: ObservableObject {
    @Published private(set) var profiles: [Profile] = []
    private let fileURL: URL

    init() {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        fileURL = dir.appendingPathComponent("profiles.json")
        load()
        if profiles.isEmpty { upsert(Profile(name: "Основной")) }
    }

    func profile(_ id: UUID?) -> Profile? {
        profiles.first { $0.id == id }
    }

    func upsert(_ profile: Profile) {
        Keychain.set(profile.password, for: profile.id.uuidString)
        if let i = profiles.firstIndex(where: { $0.id == profile.id }) {
            profiles[i] = profile
        } else {
            profiles.append(profile)
        }
        save()
    }

    /// Перед вызовом все WKWebView профиля должны быть закрыты,
    /// иначе WebKit откажется удалять хранилище.
    func delete(_ profile: Profile) async {
        Keychain.delete(profile.id.uuidString)
        profiles.removeAll { $0.id == profile.id }
        if profiles.isEmpty { upsert(Profile(name: "Основной")) } else { save() }
        do {
            try await WKWebsiteDataStore.remove(forIdentifier: profile.id)
        } catch {
            print("Не удалось удалить данные профиля: \(error)")
        }
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              var list = try? JSONDecoder().decode([Profile].self, from: data) else { return }
        for i in list.indices {
            list[i].password = Keychain.get(list[i].id.uuidString)
        }
        profiles = list
    }

    private func save() {
        do {
            try JSONEncoder().encode(profiles).write(to: fileURL, options: [.atomic, .completeFileProtection])
        } catch {
            print("Не удалось сохранить профили: \(error)")
        }
    }
}
