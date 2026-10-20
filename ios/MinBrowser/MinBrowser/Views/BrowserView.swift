import SwiftUI

struct BrowserView: View {
    @EnvironmentObject private var store: ProfileStore
    @EnvironmentObject private var browser: BrowserModel
    @State private var showProfiles = false

    private var profile: Profile? { store.profile(browser.currentProfileID) }

    var body: some View {
        VStack(spacing: 0) {
            if let profile, let tab = browser.currentTab(profile.id) {
                Toolbar(tab: tab, profile: profile, showProfiles: $showProfiles)
                TabStrip(profile: profile)
                Divider()
                Page(tab: tab)
            } else {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onAppear(perform: ensureProfile)
        .onChange(of: store.profiles) { ensureProfile() }
        .sheet(isPresented: $showProfiles) { ProfileListView() }
    }

    private func ensureProfile() {
        if let p = profile {
            browser.switchTo(p)
        } else if let first = store.profiles.first {
            browser.switchTo(first)
        }
    }
}

// MARK: - Верхняя панель

private struct Toolbar: View {
    @ObservedObject var tab: Tab
    let profile: Profile
    @Binding var showProfiles: Bool
    @EnvironmentObject private var store: ProfileStore
    @EnvironmentObject private var browser: BrowserModel
    @State private var address = ""
    @FocusState private var editing: Bool

    var body: some View {
        HStack(spacing: 14) {
            profileMenu

            Button { tab.webView.goBack() } label: { Image(systemName: "chevron.left") }
                .disabled(!tab.canGoBack)
            Button { tab.webView.goForward() } label: { Image(systemName: "chevron.right") }
                .disabled(!tab.canGoForward)
            Button {
                tab.isLoading ? tab.webView.stopLoading() : tab.reload()
            } label: {
                Image(systemName: tab.isLoading ? "xmark" : "arrow.clockwise")
            }

            TextField("Адрес или запрос", text: $address)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.webSearch)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($editing)
                .onSubmit { tab.load(address); editing = false }

            Button { tab.load("https://browserleaks.com/ip") } label: {
                Label("Проверить утечки", systemImage: "shield.lefthalf.filled")
            }
            Button { browser.newTab(profile) } label: { Image(systemName: "plus") }
        }
        .labelStyle(.iconOnly)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .onAppear { address = tab.url?.absoluteString ?? "" }
        .onChange(of: tab.url) { if !editing { address = tab.url?.absoluteString ?? "" } }
        .onChange(of: tab.id) { address = tab.url?.absoluteString ?? "" }
    }

    private var profileMenu: some View {
        Menu {
            ForEach(store.profiles) { p in
                Button {
                    browser.switchTo(p)
                } label: {
                    Label(p.name, systemImage: p.id == profile.id ? "checkmark" : "person")
                }
            }
            Divider()
            Button { browser.refreshIP(profile) } label: { Label("Обновить IP", systemImage: "arrow.triangle.2.circlepath") }
            Button { showProfiles = true } label: { Label("Профили…", systemImage: "person.2") }
        } label: {
            HStack(spacing: 6) {
                Circle().fill(Color(hex: profile.color)).frame(width: 10, height: 10)
                Text(profile.name).lineLimit(1)
                Text(browser.externalIP[profile.id] ?? "…")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(hex: profile.color).opacity(0.15), in: Capsule())
        }
    }
}

// MARK: - Вкладки

private struct TabStrip: View {
    let profile: Profile
    @EnvironmentObject private var browser: BrowserModel

    var body: some View {
        let tabs = browser.tabs[profile.id] ?? []
        let selected = browser.currentTab(profile.id)?.id
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(tabs) { tab in
                    TabChip(tab: tab, isSelected: tab.id == selected, color: Color(hex: profile.color))
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 6)
        }
    }
}

private struct TabChip: View {
    @ObservedObject var tab: Tab
    let isSelected: Bool
    let color: Color
    @EnvironmentObject private var browser: BrowserModel

    var body: some View {
        HStack(spacing: 6) {
            Text(tab.displayTitle).lineLimit(1).frame(maxWidth: 180, alignment: .leading)
            Button { browser.close(tab) } label: { Image(systemName: "xmark").font(.caption2) }
                .buttonStyle(.plain)
        }
        .font(.footnote)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(isSelected ? color.opacity(0.2) : Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
        .onTapGesture { browser.select(tab) }
    }
}

// MARK: - Страница

private struct Page: View {
    @ObservedObject var tab: Tab

    var body: some View {
        ZStack(alignment: .top) {
            WebViewContainer(webView: tab.webView)
            if tab.isLoading {
                ProgressView(value: tab.progress).progressViewStyle(.linear)
            }
            if let error = tab.error {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle").font(.largeTitle)
                    Text(error).multilineTextAlignment(.center)
                    Button("Повторить") { tab.reload() }.buttonStyle(.borderedProminent)
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.background)
            }
        }
    }
}
