import Foundation
import WebKit
import Observation

@Observable @MainActor
final class DownloadManager {
    struct Item: Identifiable {
        enum State: Equatable { case running, finished, failed(String) }
        let id: UUID
        let filename: String
        let profileID: UUID
        let fileURL: URL
        var progress: Double = 0
        var state: State = .running
    }

    private(set) var items: [Item] = []
    @ObservationIgnored private var idByDownload: [ObjectIdentifier: UUID] = [:]
    @ObservationIgnored private var downloads: [UUID: WKDownload] = [:]
    @ObservationIgnored private var observations: [UUID: NSKeyValueObservation] = [:]

    nonisolated static var baseDirectory: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let dir = docs.appendingPathComponent("Downloads", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true,
                                                 attributes: [.protectionKey: FileProtectionType.complete])
        return dir
    }

    static func directory(for profile: BrowserProfile) -> URL {
        let dir = baseDirectory.appendingPathComponent(profile.folderName, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true,
                                                 attributes: [.protectionKey: FileProtectionType.complete])
        return dir
    }

    func destination(for suggested: String, profile: BrowserProfile) -> URL {
        let dir = Self.directory(for: profile)
        var name = suggested.replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: ":", with: "_")
        if name.isEmpty { name = "file" }
        var url = dir.appendingPathComponent(name)
        var n = 1
        let base = (name as NSString).deletingPathExtension
        let ext = (name as NSString).pathExtension
        while FileManager.default.fileExists(atPath: url.path) {
            n += 1
            let candidate = ext.isEmpty ? "\(base) (\(n))" : "\(base) (\(n)).\(ext)"
            url = dir.appendingPathComponent(candidate)
        }
        return url
    }

    func track(_ download: WKDownload, profile: BrowserProfile, fileURL: URL) {
        let id = UUID()
        items.insert(Item(id: id, filename: fileURL.lastPathComponent, profileID: profile.id, fileURL: fileURL), at: 0)
        idByDownload[ObjectIdentifier(download)] = id
        downloads[id] = download
        observations[id] = download.progress.observe(\.fractionCompleted, options: [.new]) { [weak self] progress, _ in
            let value = progress.fractionCompleted
            MainActor.assumeIsolated { self?.setProgress(id, value) }
        }
    }

    private func setProgress(_ id: UUID, _ value: Double) {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].progress = value
    }

    func finished(_ download: WKDownload) {
        guard let id = idByDownload[ObjectIdentifier(download)], let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].progress = 1
        items[i].state = .finished
        cleanup(id, download)
    }

    func failed(_ download: WKDownload, error: Error) {
        guard let id = idByDownload[ObjectIdentifier(download)], let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].state = .failed(error.localizedDescription)
        cleanup(id, download)
    }

    func cancel(_ id: UUID) {
        downloads[id]?.cancel { _ in }
    }

    private func cleanup(_ id: UUID, _ download: WKDownload) {
        idByDownload[ObjectIdentifier(download)] = nil
        downloads[id] = nil
        observations[id] = nil
    }

    func completedFiles(for profile: BrowserProfile) -> [URL] {
        let dir = Self.directory(for: profile)
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        return files.sorted { a, b in
            let da = (try? a.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            let db = (try? b.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            return da > db
        }
    }

    func delete(_ url: URL) {
        try? FileManager.default.removeItem(at: url)
        items.removeAll { $0.fileURL == url }
    }

    func wipeAll() {
        try? FileManager.default.removeItem(at: Self.baseDirectory)
        items.removeAll()
    }
}
