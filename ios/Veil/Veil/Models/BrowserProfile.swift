import Foundation
import SwiftUI

/// Профиль браузера: полностью изолированное хранилище (cookies, localStorage, кэш),
/// свои вкладки, закладки, история, прокси, сертификаты и отпечаток.
struct BrowserProfile: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var icon: String
    var colorHex: String
    /// Инкогнито: хранилище живёт только в памяти, после закрытия приложения ничего не остаётся.
    var isEphemeral: Bool
    /// Требовать Face ID / Touch ID / код-пароль при открытии профиля.
    var requiresAuth: Bool
    /// Идентификатор WKWebsiteDataStore(forIdentifier:) — физически отдельная папка данных WebKit.
    var dataStoreID: UUID
    var settings: ProfileSettings
    var createdAt: Date

    init(id: UUID = UUID(),
         name: String,
         icon: String = "person.fill",
         colorHex: String = "587AFA",
         isEphemeral: Bool = false,
         requiresAuth: Bool = false,
         settings: ProfileSettings = ProfileSettings()) {
        self.id = id
        self.name = name
        self.icon = icon
        self.colorHex = colorHex
        self.isEphemeral = isEphemeral
        self.requiresAuth = requiresAuth
        self.dataStoreID = UUID()
        self.settings = settings
        self.createdAt = Date()
    }

    var color: Color { Color(hex: colorHex) }
    var proxyKeychainKey: String { "proxy.password.\(id.uuidString)" }
    var folderName: String {
        let allowed = name.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) || $0 == " " || $0 == "-" || $0 == "_" }
        let s = String(String.UnicodeScalarView(allowed)).trimmingCharacters(in: .whitespaces)
        return s.isEmpty ? id.uuidString : s
    }

    static let iconChoices = ["person.fill", "briefcase.fill", "cart.fill", "building.columns.fill", "gamecontroller.fill",
                              "creditcard.fill", "eye.slash.fill", "globe", "shield.fill", "bolt.fill", "star.fill", "flag.fill",
                              "house.fill", "graduationcap.fill", "airplane", "heart.fill"]
    static let colorChoices = ["587AFA", "F08C58", "58D2A0", "E05A7A", "A868F0", "F0C048", "48B8E0", "8A8F9E"]

    static func defaults() -> [BrowserProfile] {
        var main = ProfileSettings()
        main.trustRussianCA = false
        var ru = ProfileSettings()
        ru.trustRussianCA = true
        ru.searchEngine = .yandex
        return [
            BrowserProfile(name: "Основной", icon: "person.fill", colorHex: "587AFA", settings: main),
            BrowserProfile(name: "РФ · Минцифры", icon: "building.columns.fill", colorHex: "F08C58", settings: ru)
        ]
    }
}

struct ProfileSettings: Codable, Hashable {
    // Сертификаты
    var trustRussianCA = false
    var trustedCertificateIDs: Set<String> = []
    // Отпечаток
    var userAgent: UserAgentPreset = .default
    var customUserAgent = ""
    var desktopMode = false
    var fingerprintProtection = true
    var blockWebRTC = true
    var languageOverride = ""
    var timeZoneOverride = ""
    // Сеть
    var proxy = ProxySettings()
    var httpsOnly = true
    // Защита
    var blockTrackers = true
    var blockThirdPartyCookies = true
    var javaScriptEnabled = true
    var allowMediaCapture = false
    var allowGeolocation = false
    var safeBrowsing = false
    var clearOnLaunch = false
    // Поиск
    var searchEngine: SearchEngine = .duckDuckGo

    init() {}

    /// Что требует пересоздания WKWebView (конфигурация), а не применяется на лету.
    var configurationSignature: String {
        [userAgent.rawValue, customUserAgent, "\(desktopMode)", "\(fingerprintProtection)", "\(blockWebRTC)", languageOverride,
         timeZoneOverride, "\(httpsOnly)", "\(blockTrackers)", "\(blockThirdPartyCookies)", "\(javaScriptEnabled)",
         "\(allowGeolocation)", "\(safeBrowsing)", proxy.kind.rawValue, proxy.host, "\(proxy.port)", proxy.username, "\(proxy.useTLS)"]
            .joined(separator: "|")
    }

    private enum CodingKeys: String, CodingKey {
        case trustRussianCA, trustedCertificateIDs, userAgent, customUserAgent, desktopMode, fingerprintProtection, blockWebRTC,
             languageOverride, timeZoneOverride, proxy, httpsOnly, blockTrackers, blockThirdPartyCookies, javaScriptEnabled,
             allowMediaCapture, allowGeolocation, safeBrowsing, clearOnLaunch, searchEngine
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        trustRussianCA = try c.decodeIfPresent(Bool.self, forKey: .trustRussianCA) ?? false
        trustedCertificateIDs = try c.decodeIfPresent(Set<String>.self, forKey: .trustedCertificateIDs) ?? []
        userAgent = try c.decodeIfPresent(UserAgentPreset.self, forKey: .userAgent) ?? .default
        customUserAgent = try c.decodeIfPresent(String.self, forKey: .customUserAgent) ?? ""
        desktopMode = try c.decodeIfPresent(Bool.self, forKey: .desktopMode) ?? false
        fingerprintProtection = try c.decodeIfPresent(Bool.self, forKey: .fingerprintProtection) ?? true
        blockWebRTC = try c.decodeIfPresent(Bool.self, forKey: .blockWebRTC) ?? true
        languageOverride = try c.decodeIfPresent(String.self, forKey: .languageOverride) ?? ""
        timeZoneOverride = try c.decodeIfPresent(String.self, forKey: .timeZoneOverride) ?? ""
        proxy = try c.decodeIfPresent(ProxySettings.self, forKey: .proxy) ?? ProxySettings()
        httpsOnly = try c.decodeIfPresent(Bool.self, forKey: .httpsOnly) ?? true
        blockTrackers = try c.decodeIfPresent(Bool.self, forKey: .blockTrackers) ?? true
        blockThirdPartyCookies = try c.decodeIfPresent(Bool.self, forKey: .blockThirdPartyCookies) ?? true
        javaScriptEnabled = try c.decodeIfPresent(Bool.self, forKey: .javaScriptEnabled) ?? true
        allowMediaCapture = try c.decodeIfPresent(Bool.self, forKey: .allowMediaCapture) ?? false
        allowGeolocation = try c.decodeIfPresent(Bool.self, forKey: .allowGeolocation) ?? false
        safeBrowsing = try c.decodeIfPresent(Bool.self, forKey: .safeBrowsing) ?? false
        clearOnLaunch = try c.decodeIfPresent(Bool.self, forKey: .clearOnLaunch) ?? false
        searchEngine = try c.decodeIfPresent(SearchEngine.self, forKey: .searchEngine) ?? .duckDuckGo
    }
}

struct ProxySettings: Codable, Hashable {
    enum Kind: String, Codable, CaseIterable, Identifiable {
        case none, http, socks5
        var id: String { rawValue }
        var title: String {
            switch self {
            case .none: return "Без прокси"
            case .http: return "HTTP CONNECT"
            case .socks5: return "SOCKS5"
            }
        }
    }
    var kind: Kind = .none
    var host = ""
    var port = 1080
    var username = ""
    /// TLS до самого прокси (HTTPS-прокси). Только для HTTP CONNECT.
    var useTLS = false

    var isConfigured: Bool { kind != .none && !host.trimmingCharacters(in: .whitespaces).isEmpty && (1...65535).contains(port) }
    var summary: String { isConfigured ? "\(kind.title) \(host):\(port)" : "Нет" }

    init() {}
    private enum CodingKeys: String, CodingKey { case kind, host, port, username, useTLS }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        kind = try c.decodeIfPresent(Kind.self, forKey: .kind) ?? .none
        host = try c.decodeIfPresent(String.self, forKey: .host) ?? ""
        port = try c.decodeIfPresent(Int.self, forKey: .port) ?? 1080
        username = try c.decodeIfPresent(String.self, forKey: .username) ?? ""
        useTLS = try c.decodeIfPresent(Bool.self, forKey: .useTLS) ?? false
    }
}

enum UserAgentPreset: String, Codable, CaseIterable, Identifiable {
    case `default`, safariIPhone, safariIPad, safariMac, chromeAndroid, chromeWindows, firefoxLinux, custom
    var id: String { rawValue }

    var title: String {
        switch self {
        case .default: return "Системный (Safari этого устройства)"
        case .safariIPhone: return "Safari · iPhone"
        case .safariIPad: return "Safari · iPad"
        case .safariMac: return "Safari · macOS"
        case .chromeAndroid: return "Chrome · Android"
        case .chromeWindows: return "Chrome · Windows"
        case .firefoxLinux: return "Firefox · Linux"
        case .custom: return "Свой"
        }
    }

    /// nil — не трогать UA (WebKit подставит честный UA устройства).
    func string(custom: String) -> String? {
        switch self {
        case .default: return nil
        case .safariIPhone:
            return "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
        case .safariIPad, .safariMac:
            return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15"
        case .chromeAndroid:
            return "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36"
        case .chromeWindows:
            return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
        case .firefoxLinux:
            return "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
        case .custom:
            let t = custom.trimmingCharacters(in: .whitespacesAndNewlines)
            return t.isEmpty ? nil : t
        }
    }

    /// Пресеты, где сайт ждёт десктопную вёрстку.
    var impliesDesktopLayout: Bool {
        switch self {
        case .safariIPad, .safariMac, .chromeWindows, .firefoxLinux: return true
        default: return false
        }
    }
}

enum SearchEngine: String, Codable, CaseIterable, Identifiable {
    case duckDuckGo, startpage, brave, google, yandex
    var id: String { rawValue }
    var title: String {
        switch self {
        case .duckDuckGo: return "DuckDuckGo"
        case .startpage: return "Startpage"
        case .brave: return "Brave Search"
        case .google: return "Google"
        case .yandex: return "Яндекс"
        }
    }
    private var template: String {
        switch self {
        case .duckDuckGo: return "https://duckduckgo.com/?q="
        case .startpage: return "https://www.startpage.com/do/search?q="
        case .brave: return "https://search.brave.com/search?q="
        case .google: return "https://www.google.com/search?q="
        case .yandex: return "https://yandex.ru/search/?text="
        }
    }
    func url(for query: String) -> URL? {
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "&+=?#")
        guard let q = query.addingPercentEncoding(withAllowedCharacters: allowed) else { return nil }
        return URL(string: template + q)
    }

    /// Пользователь что-то ввёл: это URL или поисковый запрос?
    static func resolve(_ input: String, engine: SearchEngine) -> URL? {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return nil }
        if text.contains(" ") { return engine.url(for: text) }
        if text.range(of: #"^[a-zA-Z][a-zA-Z0-9+.-]*://"#, options: .regularExpression) != nil, let u = URL(string: text) { return u }
        let looksLikeHost = text.contains(".") || text.hasPrefix("localhost") || text.contains(":")
        if looksLikeHost, !text.hasPrefix("."), let u = URL(string: "https://" + text), u.host != nil { return u }
        return engine.url(for: text)
    }
}

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r = Double((v >> 16) & 0xFF) / 255, g = Double((v >> 8) & 0xFF) / 255, b = Double(v & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
