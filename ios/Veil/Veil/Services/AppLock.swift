import Foundation
import LocalAuthentication
import Observation

@Observable @MainActor
final class AppLock {
    var isLocked = false
    var isEnabled = false
    var graceSeconds = 0
    private(set) var isAuthenticating = false
    @ObservationIgnored private var backgroundedAt: Date?

    func configure(enabled: Bool, grace: Int) {
        isEnabled = enabled
        graceSeconds = grace
    }

    func didEnterBackground() { backgroundedAt = Date() }

    func didBecomeActive() {
        defer { backgroundedAt = nil }
        guard isEnabled, let at = backgroundedAt else { return }
        if Date().timeIntervalSince(at) >= Double(graceSeconds) { isLocked = true }
    }

    func unlock() async {
        guard !isAuthenticating else { return }
        isAuthenticating = true
        defer { isAuthenticating = false }
        if await authenticate(reason: "Разблокировать Veil") { isLocked = false }
    }

    /// true — успех. Если на устройстве нет код-пароля, проверять нечем: пропускаем.
    func authenticate(reason: String) async -> Bool {
        let ctx = LAContext()
        ctx.localizedCancelTitle = "Отмена"
        var err: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err) else { return true }
        do {
            return try await ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
        } catch {
            return false
        }
    }

    nonisolated static var biometryName: String {
        let ctx = LAContext()
        _ = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch ctx.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        default: return "код-пароль"
        }
    }
}
