import Foundation
import Security

enum TrustVerdict {
    /// Цепочка валидна по системным корням iOS.
    case systemTrusted
    /// Валидна только благодаря включённому в профиле якорю (например, Минцифры).
    case customTrusted(anchorID: String)
    /// Не валидна. wouldTrustWith — известные, но выключенные якоря, с которыми сайт бы открылся.
    case untrusted(wouldTrustWith: [String])
}

/// Оценка TLS-доверия. Системная проверка — на оригинальном SecTrust,
/// пользовательские якоря — на копии, чтобы не подмешивать их в оценку WebKit.
enum TrustEvaluator {
    static func evaluate(serverTrust: SecTrust, host: String,
                         enabledAnchors: [TrustedCertificate], knownAnchors: [TrustedCertificate]) -> TrustVerdict {
        var cfError: CFError?
        if SecTrustEvaluateWithError(serverTrust, &cfError) { return .systemTrusted }

        let chain = certificateChain(of: serverTrust)
        guard !chain.isEmpty else { return .untrusted(wouldTrustWith: []) }

        if !enabledAnchors.isEmpty, let id = anchorThatValidates(chain: chain, host: host, anchors: enabledAnchors) {
            return .customTrusted(anchorID: id)
        }
        let disabled = knownAnchors.filter { k in !enabledAnchors.contains(where: { $0.id == k.id }) }
        if !disabled.isEmpty, let id = anchorThatValidates(chain: chain, host: host, anchors: disabled) {
            return .untrusted(wouldTrustWith: [id])
        }
        return .untrusted(wouldTrustWith: [])
    }

    static func certificateChain(of trust: SecTrust) -> [SecCertificate] {
        (SecTrustCopyCertificateChain(trust) as? [SecCertificate]) ?? []
    }

    static func chainSubjects(of trust: SecTrust) -> [String] {
        certificateChain(of: trust).map { (SecCertificateCopySubjectSummary($0) as String?) ?? "?" }
    }

    private static func anchorThatValidates(chain: [SecCertificate], host: String, anchors: [TrustedCertificate]) -> String? {
        let policy = SecPolicyCreateSSL(true, host as CFString)
        var copy: SecTrust?
        guard SecTrustCreateWithCertificates(chain as CFArray, policy, &copy) == errSecSuccess, let trust = copy else { return nil }
        guard SecTrustSetAnchorCertificates(trust, anchors.map(\.certificate) as CFArray) == errSecSuccess,
              SecTrustSetAnchorCertificatesOnly(trust, true) == errSecSuccess else { return nil }
        var err: CFError?
        guard SecTrustEvaluateWithError(trust, &err) else { return nil }
        if let root = certificateChain(of: trust).last {
            let rootDER = SecCertificateCopyData(root) as Data
            if let match = anchors.first(where: { $0.der == rootDER }) { return match.id }
        }
        return anchors.first?.id
    }
}
