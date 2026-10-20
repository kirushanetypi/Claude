import Foundation

struct ProxyCheckResult {
    let ip: String
    let country: String
    let pingMs: Int
}

/// Проверка ходит через тот же ProxyConfiguration, что и WebView.
enum ProxyChecker {
    struct CheckError: LocalizedError {
        let errorDescription: String?
    }

    static func check(_ profile: Profile) async throws -> ProxyCheckResult {
        if profile.usesProxy && !profile.proxyIsValid {
            throw CheckError(errorDescription: "Не заполнен хост или порт прокси")
        }

        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 15
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpAdditionalHeaders = ["User-Agent": profile.customUserAgent]
        if let proxy = profile.proxyConfiguration {
            config.proxyConfigurations = [proxy]
        }
        let session = URLSession(configuration: config)
        defer { session.invalidateAndCancel() }

        do {
            let ipURL = URL(string: "https://api.ipify.org")!
            let ip = try await text(session, ipURL)
            guard !ip.isEmpty else { throw CheckError(errorDescription: "Пустой ответ от api.ipify.org") }

            // Второй запрос идёт по уже открытому соединению — это и есть «пинг» через прокси.
            let start = Date()
            _ = try await text(session, ipURL)
            let ping = Int(Date().timeIntervalSince(start) * 1000)

            let country = (try? await text(session, URL(string: "https://ipapi.co/\(ip)/country_name/")!)) ?? ""
            return ProxyCheckResult(ip: ip, country: country.isEmpty ? "—" : country, pingMs: ping)
        } catch let error as URLError {
            throw CheckError(errorDescription: humanize(error, profile: profile))
        }
    }

    private static func text(_ session: URLSession, _ url: URL) async throws -> String {
        let (data, response) = try await session.data(from: url)
        if let http = response as? HTTPURLResponse, http.statusCode != 200 {
            throw CheckError(errorDescription: "\(url.host() ?? "") ответил кодом \(http.statusCode)")
        }
        return String(decoding: data, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func humanize(_ e: URLError, profile: Profile) -> String {
        let via = profile.usesProxy ? "Прокси \(profile.host):\(profile.port)" : "Сеть"
        switch e.code {
        case .timedOut: return "\(via): нет ответа за 15 секунд"
        case .cannotFindHost, .dnsLookupFailed: return "\(via): хост не найден"
        case .cannotConnectToHost: return "\(via): соединение отклонено (неверный порт или прокси лежит)"
        case .networkConnectionLost: return "\(via): соединение оборвалось (часто — неверный логин/пароль или тип прокси)"
        case .userAuthenticationRequired: return "\(via): требуется авторизация или логин/пароль неверные"
        case .notConnectedToInternet: return "Нет интернета"
        case .secureConnectionFailed, .serverCertificateUntrusted:
            return "\(via): ошибка TLS (прокси подменяет сертификат или режет HTTPS)"
        default: return "\(via): \(e.localizedDescription)"
        }
    }
}
