import SwiftUI

struct ProfileBadge: View {
    let profile: BrowserProfile
    var size: CGFloat = 28

    var body: some View {
        ZStack {
            Circle().fill(profile.color)
            Image(systemName: profile.icon)
                .font(.system(size: size * 0.48, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(width: size, height: size)
        .overlay(alignment: .bottomTrailing) {
            if profile.isEphemeral {
                Image(systemName: "eye.slash.fill")
                    .font(.system(size: size * 0.32))
                    .padding(2)
                    .background(Circle().fill(Color(.systemBackground)))
                    .offset(x: 3, y: 3)
            }
        }
    }
}

struct TrustBadge: View {
    let state: TrustState

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: state.symbol)
                .foregroundStyle(Color(uiColor: state.tint))
            if case .secureCustom(let name) = state {
                Text(name.localizedCaseInsensitiveContains("Russian Trusted") ? "RU" : "CA")
                    .font(.caption2.bold())
                    .foregroundStyle(.orange)
            }
        }
        .frame(minWidth: 22)
    }
}

struct ProfileBadgesLine: View {
    let profile: BrowserProfile
    var tabCount: Int? = nil

    var body: some View {
        HStack(spacing: 8) {
            if profile.isEphemeral { tag("Инкогнито", "eye.slash") }
            if profile.settings.trustRussianCA { tag("Минцифры", "building.columns") }
            if profile.settings.proxy.isConfigured { tag(profile.settings.proxy.kind.title, "network") }
            if profile.requiresAuth { tag(AppLock.biometryName, "lock") }
            if let n = tabCount { tag("\(n) вкл.", "square.on.square") }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }

    private func tag(_ text: String, _ symbol: String) -> some View {
        Label(text, systemImage: symbol).labelStyle(.titleAndIcon)
    }
}

struct JSDialogModifier: ViewModifier {
    @Bindable var tabs: TabManager
    @State private var promptText = ""

    func body(content: Content) -> some View {
        content
            .alert(tabs.currentDialog?.host ?? "", isPresented: Binding(
                get: { tabs.currentDialog != nil },
                set: { _ in } // закрывается только кнопками — иначе completion WebKit уйдёт с неверным результатом
            ), presenting: tabs.currentDialog) { dialog in
                switch dialog.kind {
                case .alert:
                    Button("OK") { tabs.finishDialog(.dismissed) }
                case .confirm:
                    Button("OK") { tabs.finishDialog(.confirmed(true)) }
                    Button("Отмена", role: .cancel) { tabs.finishDialog(.confirmed(false)) }
                case .prompt:
                    TextField("", text: $promptText)
                    Button("OK") { tabs.finishDialog(.text(promptText)) }
                    Button("Отмена", role: .cancel) { tabs.finishDialog(.text(nil)) }
                }
            } message: { dialog in
                Text(dialog.message)
            }
            .onChange(of: tabs.currentDialog?.id) { _, _ in
                if case .prompt(let def)? = tabs.currentDialog?.kind { promptText = def } else { promptText = "" }
            }
    }
}

struct PrivacyShieldView: View {
    var body: some View {
        Rectangle()
            .fill(.ultraThinMaterial)
            .ignoresSafeArea()
            .overlay {
                Image(systemName: "eye.slash.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
            }
    }
}

struct LockScreenView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial).ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "lock.fill").font(.system(size: 56)).foregroundStyle(.secondary)
                Text("Veil заблокирован").font(.title2.bold())
                Button {
                    Task { await app.lock.unlock() }
                } label: {
                    Label("Разблокировать", systemImage: "faceid")
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .task { await app.lock.unlock() }
    }
}
