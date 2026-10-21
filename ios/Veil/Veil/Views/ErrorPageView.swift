import SwiftUI

struct ErrorPageView: View {
    @Environment(AppState.self) private var app
    @Bindable var tabs: TabManager
    let tab: WebTab
    let error: PageError

    private var host: String { error.failingURL?.host ?? "" }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                Image(systemName: error.isTLS ? "lock.slash" : "wifi.exclamationmark")
                    .font(.system(size: 52))
                    .foregroundStyle(.secondary)
                Text(error.isTLS ? "Небезопасное соединение" : "Не удалось открыть страницу")
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
                if !host.isEmpty {
                    Text(host).font(.callout.monospaced()).foregroundStyle(.secondary)
                }
                Text(error.message)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                if error.isTLS, let anchorID = error.wouldTrustWith.first,
                   let cert = app.certificates.certificate(withID: anchorID) {
                    GroupBox {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(cert.isRussianTrusted
                                 ? "Сайт использует сертификат Минцифры России. В профиле «\(tabs.profile.name)» он выключен."
                                 : "Сайт подписан известным сертификатом «\(cert.subject)», но он выключен в профиле «\(tabs.profile.name)».")
                                .font(.callout)
                            Button {
                                app.enableTrust(anchorID: anchorID, for: tabs.profile.id)
                                if let u = error.failingURL { tab.load(u) }
                            } label: {
                                Label(cert.isRussianTrusted ? "Включить сертификаты Минцифры и открыть" : "Доверять этому сертификату и открыть",
                                      systemImage: "checkmark.shield")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }
                }

                if error.isTLS, !host.isEmpty {
                    Button(role: .destructive) {
                        tabs.runtime.sessionTrustExceptions.insert(host)
                        if let u = error.failingURL { tab.load(u) }
                    } label: {
                        Text("Открыть всё равно (сертификат не проверен, до перезапуска)")
                            .font(.footnote)
                    }
                }

                if let http = error.httpFallback, let h = http.host {
                    Button(role: .destructive) {
                        tabs.runtime.httpAllowedHosts.insert(h)
                        tab.load(http)
                    } label: {
                        Text("Сайт не отвечает по HTTPS. Открыть по HTTP без шифрования")
                            .font(.footnote)
                    }
                }

                HStack(spacing: 16) {
                    Button("Назад") { tab.dismissError() }
                    Button("Повторить") { if let u = error.failingURL { tab.load(u) } else { tab.reload() } }
                        .buttonStyle(.bordered)
                }
                .padding(.top, 8)
            }
            .padding(24)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        .background(Color(.systemBackground))
    }
}
