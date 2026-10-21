import SwiftUI

@main
struct VeilApp: App {
    @State private var app = AppState()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
                .task { await app.bootstrap() }
                .onOpenURL { url in app.handleIncoming(url: url) }
        }
        .onChange(of: scenePhase) { _, phase in
            app.scenePhaseChanged(phase)
        }
    }
}

struct RootView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        @Bindable var app = app
        ZStack {
            Group {
                if let tabs = app.activeTabManager {
                    BrowserView(tabs: tabs)
                        .id(tabs.profile.id)
                } else {
                    ProgressView("Загрузка профиля…")
                }
            }
            .blur(radius: app.shouldShield ? 24 : 0)
            .animation(.easeOut(duration: 0.15), value: app.shouldShield)

            if app.lock.isLocked {
                LockScreenView()
                    .transition(.opacity)
            } else if app.isInactive {
                PrivacyShieldView()
                    .transition(.opacity)
            }
        }
        .alert(item: $app.pendingAlert) { a in
            Alert(title: Text(a.title), message: Text(a.message), dismissButton: .default(Text("OK")))
        }
    }
}
