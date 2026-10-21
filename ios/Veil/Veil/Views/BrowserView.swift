import SwiftUI
import WebKit

struct BrowserView: View {
    @Bindable var tabs: TabManager
    @Environment(AppState.self) private var app
    @Environment(\.horizontalSizeClass) private var hSize
    @State private var addressText = ""
    @FocusState private var addressFocused: Bool
    @State private var sheet: Sheet?

    enum Sheet: Identifiable {
        case tabs, profiles, profileSettings, appSettings, bookmarks, history, downloads, siteInfo
        var id: Self { self }
    }

    private var isRegular: Bool { hSize == .regular }
    private var tab: WebTab? { tabs.selectedTab }

    var body: some View {
        VStack(spacing: 0) {
            if isRegular {
                topBar
                TabStripView(tabs: tabs)
            }
            content
            if !isRegular { bottomBars }
        }
        .background(Color(.systemBackground))
        .sheet(item: $sheet) { s in sheetView(s) }
        .modifier(JSDialogModifier(tabs: tabs))
        .onAppear { syncAddress() }
        .onChange(of: tab?.url) { _, _ in if !addressFocused { syncAddress() } }
        .onChange(of: tabs.selectedTabID) { _, _ in addressFocused = false; syncAddress() }
        .onChange(of: addressFocused) { _, focused in
            if focused { addressText = tab?.url?.absoluteString ?? "" } else { syncAddress() }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)) { _ in
            tabs.memoryWarning()
        }
        .background { shortcuts }
    }

    private func syncAddress() {
        addressText = tab?.displayHost ?? ""
    }

    // MARK: - Content

    private var content: some View {
        ZStack(alignment: .top) {
            Color(.systemBackground)
            if let tab {
                if let wv = tab.webView {
                    WebViewContainer(webView: wv)
                        .ignoresSafeArea(.keyboard)
                }
                if tab.showsStartPage {
                    StartPageView(tabs: tabs)
                }
                if let err = tab.pageError {
                    ErrorPageView(tabs: tabs, tab: tab, error: err)
                }
                if tab.isLoading {
                    ProgressView(value: min(max(tab.progress, 0.04), 1))
                        .progressViewStyle(.linear)
                        .tint(tabs.profile.color)
                }
                if addressFocused {
                    SuggestionsView(tabs: tabs, query: addressText) { url in
                        addressFocused = false
                        tab.load(url)
                    } onDismiss: {
                        addressFocused = false
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Bars

    private var topBar: some View {
        HStack(spacing: 10) {
            navButtons
            AddressBarView(tabs: tabs, text: $addressText, focused: $addressFocused) { sheet = .siteInfo }
                .frame(maxWidth: 760)
            Button { tabs.newTab(url: nil) } label: { Image(systemName: "plus") }
            tabsButton
            profileButton
            menuButton
        }
        .font(.title3)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.bar)
    }

    private var bottomBars: some View {
        VStack(spacing: 8) {
            AddressBarView(tabs: tabs, text: $addressText, focused: $addressFocused) { sheet = .siteInfo }
                .padding(.horizontal, 10)
            if !addressFocused {
                HStack {
                    navButtons
                    Spacer()
                    profileButton
                    Spacer()
                    tabsButton
                    Spacer()
                    menuButton
                }
                .font(.title2)
                .padding(.horizontal, 22)
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(.bar)
    }

    private var navButtons: some View {
        HStack(spacing: 22) {
            Button { tab?.goBack() } label: { Image(systemName: "chevron.left") }
                .disabled(!(tab?.canGoBack ?? false))
            Button { tab?.goForward() } label: { Image(systemName: "chevron.right") }
                .disabled(!(tab?.canGoForward ?? false))
        }
    }

    private var profileButton: some View {
        Button { sheet = .profiles } label: { ProfileBadge(profile: tabs.profile, size: 28) }
            .accessibilityLabel("Профиль \(tabs.profile.name)")
    }

    private var tabsButton: some View {
        Button { sheet = .tabs } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 5).stroke(lineWidth: 2).frame(width: 22, height: 22)
                Text("\(tabs.tabs.count)").font(.caption.bold()).monospacedDigit()
            }
        }
        .keyboardShortcut("\\", modifiers: [.command, .shift])
    }

    private var menuButton: some View {
        Menu {
            Button { tabs.newTab(url: nil) } label: { Label("Новая вкладка", systemImage: "plus.square") }
            if let tab, let url = tab.url {
                Button { tabs.toggleBookmark(url: url, title: tab.title) } label: {
                    Label(tabs.isBookmarked(url) ? "Убрать из закладок" : "В закладки",
                          systemImage: tabs.isBookmarked(url) ? "star.fill" : "star")
                }
                .keyboardShortcut("d", modifiers: .command)
                ShareLink(item: url) { Label("Поделиться", systemImage: "square.and.arrow.up") }
                Button { tab.showFindPanel() } label: { Label("Найти на странице", systemImage: "doc.text.magnifyingglass") }
                    .keyboardShortcut("f", modifiers: .command)
                Toggle(isOn: Binding(get: { tab.isDesktop }, set: { tab.setDesktop($0) })) {
                    Label("Версия для ПК", systemImage: "desktopcomputer")
                }
                Button { sheet = .siteInfo } label: { Label("О сайте и сертификате", systemImage: "lock.shield") }
            }
            Divider()
            Button { sheet = .bookmarks } label: { Label("Закладки", systemImage: "book") }
            Button { sheet = .history } label: { Label("История", systemImage: "clock") }
            Button { sheet = .downloads } label: { Label("Загрузки", systemImage: "arrow.down.circle") }
            Divider()
            Button { sheet = .profiles } label: { Label("Профили", systemImage: "person.2") }
            Button { sheet = .profileSettings } label: { Label("Настройки профиля «\(tabs.profile.name)»", systemImage: "slider.horizontal.3") }
            Button { sheet = .appSettings } label: { Label("Настройки приложения", systemImage: "gearshape") }
            if let tab {
                Divider()
                Button(role: .destructive) { tabs.close(tab) } label: { Label("Закрыть вкладку", systemImage: "xmark") }
                    .keyboardShortcut("w", modifiers: .command)
            }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
    }

    private var shortcuts: some View {
        Group {
            Button("") { tab?.goBack() }.keyboardShortcut("[", modifiers: .command)
            Button("") { tab?.goForward() }.keyboardShortcut("]", modifiers: .command)
            Button("") { tab?.reload() }.keyboardShortcut("r", modifiers: .command)
            Button("") { addressFocused = true }.keyboardShortcut("l", modifiers: .command)
            Button("") { tabs.newTab(url: nil) }.keyboardShortcut("t", modifiers: .command)
        }
        .opacity(0)
        .frame(width: 0, height: 0)
    }

    // MARK: - Sheets

    @ViewBuilder
    private func sheetView(_ s: Sheet) -> some View {
        switch s {
        case .tabs: TabSwitcherView(tabs: tabs)
        case .profiles: ProfileSwitcherView()
        case .profileSettings: ProfileEditorView(profile: tabs.profile, mode: .edit)
        case .appSettings: SettingsView(settings: app.settings)
        case .bookmarks: BookmarksView(tabs: tabs)
        case .history: HistoryView(tabs: tabs)
        case .downloads: DownloadsView(tabs: tabs)
        case .siteInfo:
            if let tab {
                SiteInfoView(tabs: tabs, tab: tab)
                    .presentationDetents([.medium, .large])
            }
        }
    }
}

// MARK: - Address bar

struct AddressBarView: View {
    @Bindable var tabs: TabManager
    @Binding var text: String
    var focused: FocusState<Bool>.Binding
    var onSiteInfo: () -> Void

    var body: some View {
        let tab = tabs.selectedTab
        HStack(spacing: 8) {
            Button(action: onSiteInfo) { TrustBadge(state: tab?.trust ?? .none) }
                .buttonStyle(.plain)
                .disabled(tab?.url == nil)

            TextField("Поиск или адрес", text: $text)
                .focused(focused)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.webSearch)
                .submitLabel(.go)
                .font(.body)
                .multilineTextAlignment(focused.wrappedValue ? .leading : .center)
                .onSubmit {
                    tab?.submit(text)
                    focused.wrappedValue = false
                }

            if focused.wrappedValue {
                if !text.isEmpty {
                    Button { text = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                        .buttonStyle(.plain)
                }
            } else if let tab, tab.url != nil {
                Button { tab.isLoading ? tab.stop() : tab.reload() } label: {
                    Image(systemName: tab.isLoading ? "xmark" : "arrow.clockwise")
                }
                .buttonStyle(.plain)
            }
        }
        .font(.body)
        .padding(.horizontal, 12)
        .frame(height: 40)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color(.secondarySystemBackground)))
    }
}

struct SuggestionsView: View {
    @Bindable var tabs: TabManager
    let query: String
    var onPick: (URL) -> Void
    var onDismiss: () -> Void

    var body: some View {
        let items = tabs.suggestions(for: query)
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        VStack(alignment: .leading, spacing: 0) {
            if !trimmed.isEmpty, let url = SearchEngine.resolve(trimmed, engine: tabs.profile.settings.searchEngine) {
                let isSearch = trimmed.contains(" ") || !(trimmed.contains(".") || trimmed.contains("://"))
                row(icon: isSearch ? "magnifyingglass" : "globe",
                    title: isSearch ? "Искать «\(trimmed)»" : trimmed,
                    subtitle: isSearch ? tabs.profile.settings.searchEngine.title : "Открыть адрес") { onPick(url) }
            }
            ForEach(items) { e in
                row(icon: tabs.isBookmarked(e.url) ? "star" : "clock", title: e.title, subtitle: e.url.absoluteString) { onPick(e.url) }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(.regularMaterial)
        .contentShape(Rectangle())
        .onTapGesture(perform: onDismiss)
    }

    @ViewBuilder
    private func row(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon).foregroundStyle(.secondary).frame(width: 20)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).lineLimit(1).foregroundStyle(.primary)
                    Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        Divider().padding(.leading, 48)
    }
}

// MARK: - iPad tab strip

struct TabStripView: View {
    @Bindable var tabs: TabManager

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 4) {
                ForEach(tabs.tabs) { tab in
                    chip(tab)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
        .background(Color(.secondarySystemBackground))
    }

    private func chip(_ tab: WebTab) -> some View {
        let selected = tab.id == tabs.selectedTabID
        let title = tab.title.isEmpty ? (tab.displayHost.isEmpty ? "Новая вкладка" : tab.displayHost) : tab.title
        return HStack(spacing: 6) {
            if tab.isLoading { ProgressView().controlSize(.mini) }
            Text(title).font(.footnote).lineLimit(1)
            Button { tabs.close(tab) } label: { Image(systemName: "xmark").font(.caption2) }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(minWidth: 100, maxWidth: 220)
        .background(RoundedRectangle(cornerRadius: 8).fill(selected ? Color(.systemBackground) : .clear))
        .contentShape(Rectangle())
        .onTapGesture { tabs.select(tab) }
    }
}
