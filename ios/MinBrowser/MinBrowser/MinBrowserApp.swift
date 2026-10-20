import SwiftUI

@main
struct MinBrowserApp: App {
    @StateObject private var store = ProfileStore()
    @StateObject private var browser = BrowserModel()

    var body: some Scene {
        WindowGroup {
            BrowserView()
                .environmentObject(store)
                .environmentObject(browser)
        }
    }
}
