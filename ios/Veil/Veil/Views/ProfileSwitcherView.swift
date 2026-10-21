import SwiftUI

struct ProfileSwitcherView: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var editing: BrowserProfile?
    @State private var creating = false
    @State private var deleting: BrowserProfile?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(app.profiles) { p in
                        Button {
                            Task { if await app.activate(p, authenticate: p.requiresAuth) { dismiss() } }
                        } label: {
                            HStack(spacing: 12) {
                                ProfileBadge(profile: p, size: 36)
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(p.name).font(.headline).foregroundStyle(.primary)
                                        if p.id == app.activeProfileID {
                                            Image(systemName: "checkmark.circle.fill").foregroundStyle(p.color)
                                        }
                                    }
                                    ProfileBadgesLine(profile: p, tabCount: app.tabManager(for: p)?.tabs.count)
                                }
                                Spacer()
                                Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) { deleting = p } label: { Label("Удалить", systemImage: "trash") }
                            Button { editing = p } label: { Label("Изменить", systemImage: "pencil") }.tint(.blue)
                        }
                        .contextMenu {
                            Button { editing = p } label: { Label("Изменить", systemImage: "pencil") }
                            Button(role: .destructive) { deleting = p } label: { Label("Удалить", systemImage: "trash") }
                        }
                    }
                } footer: {
                    Text("Каждый профиль — физически отдельное хранилище WebKit: cookies, localStorage, кэш, сессии, история, закладки, прокси и сертификаты не пересекаются.")
                }
            }
            .navigationTitle("Профили")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Закрыть") { dismiss() } }
                ToolbarItem(placement: .primaryAction) {
                    Button { creating = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(item: $editing) { ProfileEditorView(profile: $0, mode: .edit) }
            .sheet(isPresented: $creating) { ProfileEditorView(profile: BrowserProfile(name: ""), mode: .create) }
            .confirmationDialog("Удалить профиль?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }),
                                titleVisibility: .visible, presenting: deleting) { p in
                Button("Удалить «\(p.name)» и все его данные", role: .destructive) {
                    Task { await app.delete(p) }
                }
            } message: { _ in
                Text("Cookies, кэш, история, закладки, загрузки и сессии будут стёрты. Необратимо.")
            }
        }
    }
}
