import SwiftUI

struct BookmarksView: View {
    @Bindable var tabs: TabManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(tabs.bookmarks) { b in
                    Button { tabs.selectedTab?.load(b.url); dismiss() } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(b.title).lineLimit(1).foregroundStyle(.primary)
                            Text(b.url.absoluteString).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                        }
                    }
                }
                .onDelete { tabs.removeBookmarks(at: $0) }
            }
            .overlay { if tabs.bookmarks.isEmpty { ContentUnavailableView("Нет закладок", systemImage: "book") } }
            .navigationTitle("Закладки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { EditButton() }
                ToolbarItem(placement: .confirmationAction) { Button("Готово") { dismiss() } }
            }
        }
    }
}

struct HistoryView: View {
    @Bindable var tabs: TabManager
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var confirmClear = false

    private var filtered: [HistoryEntry] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return tabs.history }
        return tabs.history.filter { $0.title.lowercased().contains(q) || $0.url.absoluteString.lowercased().contains(q) }
    }

    var body: some View {
        NavigationStack {
            List(filtered) { e in
                Button { tabs.selectedTab?.load(e.url); dismiss() } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(e.title).lineLimit(1).foregroundStyle(.primary)
                        HStack {
                            Text(e.url.host ?? e.url.absoluteString).lineLimit(1)
                            Spacer()
                            Text(e.visitedAt, style: .relative)
                        }
                        .font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            .searchable(text: $query, prompt: "Поиск в истории")
            .overlay {
                if tabs.history.isEmpty {
                    ContentUnavailableView(tabs.profile.isEphemeral ? "Инкогнито: история не ведётся" : "История пуста", systemImage: "clock")
                }
            }
            .navigationTitle("История")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Очистить", role: .destructive) { confirmClear = true }.disabled(tabs.history.isEmpty)
                }
                ToolbarItem(placement: .confirmationAction) { Button("Готово") { dismiss() } }
            }
            .confirmationDialog("Очистить историю профиля?", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Очистить", role: .destructive) { tabs.clearHistory() }
            }
        }
    }
}

struct DownloadsView: View {
    @Bindable var tabs: TabManager
    @Environment(\.dismiss) private var dismiss
    @State private var files: [URL] = []

    var body: some View {
        NavigationStack {
            List {
                let active = tabs.downloads.items.filter { $0.profileID == tabs.profile.id && $0.state == .running }
                if !active.isEmpty {
                    Section("Загружается") {
                        ForEach(active) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(item.filename).lineLimit(1)
                                    Spacer()
                                    Button { tabs.downloads.cancel(item.id) } label: { Image(systemName: "xmark.circle") }
                                        .buttonStyle(.plain)
                                }
                                ProgressView(value: item.progress)
                            }
                        }
                    }
                }
                let failed = tabs.downloads.items.filter { $0.profileID == tabs.profile.id && $0.state != .running && $0.state != .finished }
                if !failed.isEmpty {
                    Section("Ошибки") {
                        ForEach(failed) { item in
                            if case .failed(let msg) = item.state {
                                VStack(alignment: .leading) {
                                    Text(item.filename).lineLimit(1)
                                    Text(msg).font(.caption).foregroundStyle(.red)
                                }
                            }
                        }
                    }
                }
                Section("Файлы") {
                    ForEach(files, id: \.self) { url in
                        HStack {
                            Image(systemName: "doc").foregroundStyle(.secondary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(url.lastPathComponent).lineLimit(1)
                                Text(sizeString(url)).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            ShareLink(item: url) { Image(systemName: "square.and.arrow.up") }
                                .buttonStyle(.plain)
                        }
                        .swipeActions {
                            Button(role: .destructive) { tabs.downloads.delete(url); refresh() } label: { Label("Удалить", systemImage: "trash") }
                        }
                    }
                }
            }
            .overlay {
                if files.isEmpty && tabs.downloads.items.filter({ $0.profileID == tabs.profile.id }).isEmpty {
                    ContentUnavailableView("Нет загрузок", systemImage: "arrow.down.circle",
                                           description: Text("Файлы доступны и в приложении «Файлы» → Veil → Downloads."))
                }
            }
            .navigationTitle("Загрузки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Готово") { dismiss() } } }
            .onAppear(perform: refresh)
            .onChange(of: tabs.downloads.items.count) { _, _ in refresh() }
        }
    }

    private func refresh() { files = tabs.downloads.completedFiles(for: tabs.profile) }

    private func sizeString(_ url: URL) -> String {
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)
    }
}
