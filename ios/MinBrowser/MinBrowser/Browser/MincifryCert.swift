import Foundation
import Security

/// Корневой сертификат Минцифры из бандла. В систему не ставится —
/// используется только как дополнительный якорь при проверке TLS.
enum MincifryCert {
    static let certificate: SecCertificate? = {
        guard let url = Bundle.main.url(forResource: "russian_trusted_root_ca", withExtension: "cer"),
              var data = try? Data(contentsOf: url) else { return nil }
        // Файл бывает и в DER, и в PEM — PEM разворачиваем в DER.
        if let pem = String(data: data, encoding: .ascii), pem.contains("-----BEGIN CERTIFICATE-----") {
            let base64 = pem
                .components(separatedBy: .newlines)
                .filter { !$0.hasPrefix("-----") }
                .joined()
            guard let der = Data(base64Encoded: base64) else { return nil }
            data = der
        }
        return SecCertificateCreateWithData(nil, data as CFData)
    }()

    /// Проверка цепочки: системные корни + сертификат Минцифры.
    /// Вызывать не на главном потоке — оценка может ходить в сеть (OCSP/CRL).
    static func evaluate(_ trust: SecTrust) -> Bool {
        guard let cert = certificate else { return false }
        SecTrustSetAnchorCertificates(trust, [cert] as CFArray)
        SecTrustSetAnchorCertificatesOnly(trust, false)
        var error: CFError?
        return SecTrustEvaluateWithError(trust, &error)
    }
}
