import SwiftUI

struct TabSwitcherView: View {
    @Bindable var tabs: TabManager
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    ForEach(tabs.tabs) { tab in
                        TabCard(tab: tab, isSelected: tab.id == tabs.selectedTabID, color: tabs.profile.color) {
                            tabs.select(tab)
                            dismiss()
                        } onClose: {
                            tabs.close(tab)
                        }
                    }
                }
                .padding()
            }
            .background(Color(.secondarySystemBackground))
            .navigationTitle("Вкладки · \(tabs.profile.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть все", role: .destructive) { tabs.closeAll(); dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { tabs.newTab(url: nil); dismiss() } label: { Image(systemName: "plus") }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") { dismiss() }
                }
            }
        }
    }
}

struct TabCard: View {
    let tab: WebTab
    let isSelected: Bool
    let color: Color
    var onSelect: () -> Void
    var onClose: () -> Void

    private var title: String {
        tab.title.isEmpty ? (tab.displayHost.isEmpty ? "Новая вкладка" : tab.displayHost) : tab.title
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                Group {
                    if let img = tab.snapshot {
                        Image(uiImage: img).resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Color(.tertiarySystemBackground)
                            .overlay(Image(systemName: "globe").font(.largeTitle).foregroundStyle(.tertiary))
                    }
                }
                .frame(height: 150)
                .frame(maxWidth: .infinity)
                .clipped()
                Button(action: onClose) {
                    Image(systemName: "xmark.circle.fill")
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, .black.opacity(0.55))
                        .font(.title3)
                }
                .padding(6)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.footnote.weight(.semibold)).lineLimit(1)
                Text(tab.displayHost).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            }
            .padding(8)
        }
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(isSelected ? color : Color(.separator), lineWidth: isSelected ? 2 : 0.5))
        .contentShape(Rectangle())
        .onTapGesture(perform: onSelect)
    }
}
