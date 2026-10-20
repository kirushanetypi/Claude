import Foundation

struct ParsedProxy {
    var type: ProxyType
    var host: String
    var port: Int
    var username = ""
    var password = ""

    func apply(to profile: inout Profile) {
        profile.proxyType = type
        profile.host = host
        profile.port = port
        profile.username = username
        profile.password = password
    }
}

/// Поддерживает:
///   socks5://user:pass@host:port   http://user:pass@host:port
///   host:port:user:pass            user:pass@host:port            host:port
/// Без схемы тип = defaultType (по умолчанию SOCKS5).
enum ProxyParser {
    static func parse(_ raw: String, defaultType: ProxyType = .socks5) -> ParsedProxy? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty else { return nil }

        var type = defaultType == .none ? .socks5 : defaultType
        if let r = s.range(of: "://") {
            switch s[..<r.lowerBound].lowercased() {
            case "socks5", "socks5h", "socks": type = .socks5
            case "http", "https": type = .httpConnect
            default: return nil
            }
            s = String(s[r.upperBound...])
        }
        s = s.trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        // user:pass@host:port
        if let at = s.lastIndex(of: "@") {
            let cred = s[..<at].split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false)
            guard var p = hostPort(String(s[s.index(after: at)...]), type: type) else { return nil }
            p.username = decode(cred[0])
            p.password = cred.count > 1 ? decode(cred[1]) : ""
            return p
        }

        let parts = s.split(separator: ":", maxSplits: 3, omittingEmptySubsequences: false).map(String.init)
        switch parts.count {
        case 2:
            return hostPort(s, type: type)
        case 4: // host:port:user:pass
            guard var p = hostPort("\(parts[0]):\(parts[1])", type: type) else { return nil }
            p.username = parts[2]
            p.password = parts[3]
            return p
        default:
            return nil
        }
    }

    /// Каждая непустая строка — отдельный прокси.
    static func parseList(_ text: String, defaultType: ProxyType = .socks5) -> (ok: [ParsedProxy], bad: [String]) {
        var ok: [ParsedProxy] = [], bad: [String] = []
        for line in text.split(whereSeparator: \.isNewline) {
            let l = line.trimmingCharacters(in: .whitespaces)
            guard !l.isEmpty, !l.hasPrefix("#") else { continue }
            if let p = parse(l, defaultType: defaultType) { ok.append(p) } else { bad.append(l) }
        }
        return (ok, bad)
    }

    private static func hostPort(_ s: String, type: ProxyType) -> ParsedProxy? {
        let parts = s.split(separator: ":", omittingEmptySubsequences: false)
        guard parts.count == 2, !parts[0].isEmpty,
              let port = Int(parts[1]), (1...65535).contains(port) else { return nil }
        return ParsedProxy(type: type, host: String(parts[0]), port: port)
    }

    private static func decode(_ s: Substring) -> String {
        String(s).removingPercentEncoding ?? String(s)
    }
}
