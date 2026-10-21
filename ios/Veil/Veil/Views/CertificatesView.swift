import SwiftUI
import UniformTypeIdentifiers

struct CertificatesView: View {
    @Environment(AppState.self) private var app
    @State private var showImporter = false
    @State private var message: String?

    var body: some View {
        List {
            Section {
                ForEach(app.certificates.bundled) { CertificateRow(cert: $0) }
            } header: {
                Text("Встроенные · Минцифры России")
            } footer: {
                Text("Скачаны с gu-st.ru (официальная страница Госуслуг). Корневой действует до 27.02.2032. Включаются отдельно в каждом профиле.")
            }
            Section("Импортированные") {
                ForEach(app.certificates.imported) { CertificateRow(cert: $0) }
                    .onDelete { offsets in
                        let victims = offsets.map { app.certificates.imported[$0] }
                        victims.forEach { app.certificates.removeImported($0) }
                    }
                Button { showImporter = true } label: {
                    Label("Импортировать…", systemImage: "square.and.arrow.down")
                }
            }
        }
        .navigationTitle("Сертификаты")
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.x509Certificate, .data]) { result in
            switch result {
            case .failure(let e): message = e.localizedDescription
            case .success(let url):
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                do {
                    let added = try app.certificates.importCertificates(from: try Data(contentsOf: url))
                    message = "Добавлено: " + added.map(\.subject).joined(separator: ", ") + ". Включите в нужных профилях."
                } catch {
                    message = error.localizedDescription
                }
            }
        }
        .alert("Сертификаты", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
            Button("OK") {}
        } message: {
            Text(message ?? "")
        }
    }
}

struct CertificateRow: View {
    let cert: TrustedCertificate
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(cert.subject).font(.subheadline.weight(.medium))
            Text("SHA-256 " + cert.fingerprintFormatted)
                .font(.caption2.monospaced())
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
    }
}
