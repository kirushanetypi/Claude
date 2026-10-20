import SwiftUI

struct ProfileListView: View {
    @EnvironmentObject private var store: ProfileStore
    @EnvironmentObject private var browser: BrowserModel
    @Environment(\.dismiss) private var dismiss

    @State private var editing: Profile?
    @State private var showImport = false
    @State private var toDelete: Profile?

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.profiles) { p in
                    Button { editing = p } label: { row(p) }
                        .swipeActions {
                            Button("Удалить", role: .destructive) { toDelete = p }
                        }
                }
            }
            .navigationTitle("Профили")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Готово") { dismiss() } }
                ToolbarItemGroup(placement: .primaryAction) {
                    Button { showImport = true } label: { Label("Импорт списка", systemImage: "list.bullet.rectangle") }
                    Button { editing = Profile(name: "Профиль \(store.profiles.count + 1)", color: randomColor()) } label: {
                        Label("Новый", systemImage: "plus")
                    }
                }
            }
            .sheet(item: $editing) { p in
                ProfileEditView(profile: p) { saved in
                    let old = store.profile(saved.id)
                    store.upsert(saved)
                    if let old { browser.apply(old, saved) }
                }
            }
            .sheet(isPresented: $showImport) { ImportProxiesView() }
            .confirmationDialog("Удалить профиль и все его данные (cookies, кэш, вкладки)?",
                                isPresented: Binding(get: { toDelete != nil }, set: { if !$0 { toDelete = nil } }),
                                titleVisibility: .visible) {
                Button("Удалить", role: .destructive) {
                    guard let p = toDelete else { return }
                    browser.forget(p.id)          // сначала закрыть WebView, иначе хранилище не удалится
                    Task { await store.delete(p) }
                }
            }
        }
    }

    private func row(_ p: Profile) -> some View {
        HStack(spacing: 12) {
            Circle().fill(Color(hex: p.color)).frame(width: 14, height: 14)
            VStack(alignment: .leading, spacing: 2) {
                Text(p.name).foregroundStyle(.primary)
                Text(p.proxyLabel + (p.trustMincifryCert ? " · Минцифры" : ""))
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if p.id == browser.currentProfileID {
                Image(systemName: "checkmark").foregroundStyle(.tint)
            }
        }
    }
}

func randomColor() -> String {
    ["#007AFF", "#34C759", "#FF9500", "#FF2D55", "#AF52DE", "#5AC8FA", "#FFCC00", "#8E8E93"].randomElement()!
}
