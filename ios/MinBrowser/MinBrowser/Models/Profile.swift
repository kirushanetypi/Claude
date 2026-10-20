import SwiftUI
import Network

enum ProxyType: String, Codable, CaseIterable, Identifiable {
    case none, socks5, httpConnect

    var id: String { rawValue }
    var title: String {
        switch self {
        case .none: "Нет"
        case .socks5: "SOCKS5"
        case .httpConnect: "HTTP"
        }
    }
}

struct Profile: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var color = "#007AFF"
    var proxyType: ProxyType = .none
    var host = ""
    var port = 0
    var username = ""
    var password = ""            // в JSON не пишется, живёт в Keychain
    var trustMincifryCert = false
    var customUserAgent = Profile.defaultUserAgent

    // password сознательно отсутствует
    enum CodingKeys: String, CodingKey {
        case id, name, color, proxyType, host, port, username, trustMincifryCert, customUserAgent
    }

    // То же, что шлёт Safari на iPad по умолчанию — самый массовый вариант.
    static let defaultUserAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

    var usesProxy: Bool { proxyType != .none }

    var proxyIsValid: Bool { !host.isEmpty && (1...65535).contains(port) }

    var proxyLabel: String { usesProxy ? "\(proxyType.title) \(host):\(port)" : "Без прокси" }

    /// nil — прокси не нужен. Если прокси включён, но настроен криво — отдаём
    /// заведомо мёртвый адрес, чтобы трафик никогда не пошёл напрямую.
    var proxyConfiguration: ProxyConfiguration? {
        guard usesProxy else { return nil }
        guard proxyIsValid, let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
            return Profile.blackholeProxy
        }
        let endpoint = NWEndpoint.hostPort(host: NWEndpoint.Host(host), port: nwPort)
        var config = proxyType == .socks5
            ? ProxyConfiguration(socksv5Proxy: endpoint)
            : ProxyConfiguration(httpCONNECTProxy: endpoint, tlsOptions: nil)
        if !username.isEmpty {
            config.applyCredential(username: username, password: password)
        }
        config.allowFailover = false
        return config
    }

    private static var blackholeProxy: ProxyConfiguration {
        var config = ProxyConfiguration(socksv5Proxy: .hostPort(host: "127.0.0.1", port: 9))
        config.allowFailover = false
        return config
    }
}

extension Color {
    init(hex: String) {
        let v = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0x007AFF
        self.init(red: Double((v >> 16) & 0xFF) / 255,
                  green: Double((v >> 8) & 0xFF) / 255,
                  blue: Double(v & 0xFF) / 255)
    }

    var hex: String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(self).getRed(&r, green: &g, blue: &b, alpha: &a)
        func c(_ x: CGFloat) -> Int { Int((min(max(x, 0), 1) * 255).rounded()) }
        return String(format: "#%02X%02X%02X", c(r), c(g), c(b))
    }
}
