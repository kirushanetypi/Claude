import Foundation
import Security
import CryptoKit
import Observation

struct TrustedCertificate: Identifiable, Hashable {
    /// SHA-256 отпечаток DER в hex — стабильный идентификатор.
    let id: String
    let der: Data
    let certificate: SecCertificate
    let subject: String
    let isBundled: Bool

    static func == (lhs: TrustedCertificate, rhs: TrustedCertificate) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    var fingerprintFormatted: String {
        stride(from: 0, to: id.count, by: 2).map { i -> String in
            let s = id.index(id.startIndex, offsetBy: i)
            let e = id.index(s, offsetBy: 2)
            return String(id[s..<e]).uppercased()
        }.joined(separator: ":")
    }
    var isRussianTrusted: Bool { subject.localizedCaseInsensitiveContains("Russian Trusted") }
}

/// Встроенные сертификаты Минцифры (из Resources/Certificates) + импортированные пользователем.
@Observable @MainActor
final class CertificateStore {
    private(set) var bundled: [TrustedCertificate] = []
    private(set) var imported: [TrustedCertificate] = []
    var all: [TrustedCertificate] { bundled + imported }

    @ObservationIgnored private let importDirectory = Persistence.directory("certificates")

    init() {
        loadBundled()
        reloadImported()
    }

    func enabledCertificates(for profile: BrowserProfile) -> [TrustedCertificate] {
        var result: [TrustedCertificate] = []
        if profile.settings.trustRussianCA { result += bundled }
        result += imported.filter { profile.settings.trustedCertificateIDs.contains($0.id) }
        return result
    }

    func certificate(withID id: String) -> TrustedCertificate? { all.first { $0.id == id } }

    @discardableResult
    func importCertificates(from data: Data) throws -> [TrustedCertificate] {
        let ders = Self.derCertificates(from: data)
        var added: [TrustedCertificate] = []
        for der in ders {
            guard let cert = Self.make(der: der, bundled: false) else { continue }
            if all.contains(cert) { continue }
            let url = importDirectory.appendingPathComponent("\(cert.id).der")
            try der.write(to: url, options: [.atomic, .completeFileProtection])
            imported.append(cert)
            added.append(cert)
        }
        if added.isEmpty && ders.isEmpty { throw ImportError.notACertificate }
        if added.isEmpty { throw ImportError.alreadyExists }
        return added
    }

    func removeImported(_ cert: TrustedCertificate) {
        guard !cert.isBundled else { return }
        imported.removeAll { $0.id == cert.id }
        try? FileManager.default.removeItem(at: importDirectory.appendingPathComponent("\(cert.id).der"))
    }

    enum ImportError: LocalizedError {
        case notACertificate, alreadyExists
        var errorDescription: String? {
            switch self {
            case .notACertificate: return "Файл не похож на сертификат X.509 (PEM или DER)."
            case .alreadyExists: return "Такой сертификат уже есть в списке."
            }
        }
    }

    // MARK: - Loading

    private func loadBundled() {
        let urls = Bundle.main.urls(forResourcesWithExtension: "pem", subdirectory: nil) ?? []
        bundled = urls.sorted { $0.lastPathComponent < $1.lastPathComponent }.flatMap { url -> [TrustedCertificate] in
            guard let data = try? Data(contentsOf: url) else { return [] }
            return Self.derCertificates(from: data).compactMap { Self.make(der: $0, bundled: true) }
        }
    }

    func reloadImported() {
        let files = (try? FileManager.default.contentsOfDirectory(at: importDirectory, includingPropertiesForKeys: nil)) ?? []
        imported = files.filter { $0.pathExtension == "der" }.compactMap { url in
            guard let der = try? Data(contentsOf: url) else { return nil }
            return Self.make(der: der, bundled: false)
        }
    }

    // MARK: - Parsing

    static func derCertificates(from data: Data) -> [Data] {
        if let text = String(data: data, encoding: .utf8), text.contains("-----BEGIN CERTIFICATE-----") {
            return text.components(separatedBy: "-----BEGIN CERTIFICATE-----").dropFirst().compactMap { part in
                guard let end = part.range(of: "-----END CERTIFICATE-----") else { return nil }
                let b64 = String(part[..<end.lowerBound].filter { !$0.isWhitespace })
                return Data(base64Encoded: b64)
            }
        }
        return [data]
    }

    static func make(der: Data, bundled: Bool) -> TrustedCertificate? {
        guard let cert = SecCertificateCreateWithData(nil, der as CFData) else { return nil }
        let id = SHA256.hash(data: der).map { String(format: "%02x", $0) }.joined()
        let subject = (SecCertificateCopySubjectSummary(cert) as String?) ?? "Без имени"
        return TrustedCertificate(id: id, der: der, certificate: cert, subject: subject, isBundled: bundled)
    }
}
