import SwiftUI

struct ProfileEditView: View {
    @State var profile: Profile
    let onSave: (Profile) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var proxyInput = ""
    @State private var parseError: String?
    @State private var checking = false
    @State private var checkResult: String?
    @State private var checkFailed = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Профиль") {
                    TextField("Название", text: $profile.name)
                    ColorPicker("Цвет", selection: Binding(
                        get: { Color(hex: profile.color) },
                        set: { profile.color = $0.hex }), supportsOpacity: false)
                }

                Section {
                    HStack {
                        TextField("Вставить прокси", text: $proxyInput)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onSubmit { parse(proxyInput) }
                        Button {
                            proxyInput = UIPasteboard.general.string ?? ""
                            parse(proxyInput)
                        } label: { Image(systemName: "doc.on.clipboard") }
                    }
                    if let parseError {
                        Text(parseError).font(.caption).foregroundStyle(.red)
                    }

                    Picker("Тип", selection: $profile.proxyType) {
                        ForEach(ProxyType.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    if profile.usesProxy {
                        TextField("Хост", text: $profile.host)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                        TextField("Порт", value: $profile.port, format: .number.grouping(.never))
                            .keyboardType(.numberPad)
                        TextField("Логин", text: $profile.username)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                        SecureField("Пароль", text: $profile.password)
                    }

                    HStack {
                        Button("Проверить", action: check).disabled(checking)
                        if checking { ProgressView().padding(.leading, 8) }
                    }
                    if let checkResult {
                        Text(checkResult)
                            .font(.callout.monospaced())
                            .foregroundStyle(checkFailed ? .red : .primary)
                    }
                } header: {
                    Text("Прокси")
                } footer: {
                    Text("socks5://user:pass@host:port, http://user:pass@host:port, host:port:user:pass, user:pass@host:port, host:port. Без схемы — SOCKS5. Если прокси недоступен, страницы не грузятся (напрямую не ходим).")
                }

                Section {
                    Toggle("Доверять сертификату Минцифры", isOn: $profile.trustMincifryCert)
                    if profile.trustMincifryCert && MincifryCert.certificate == nil {
                        Text("Файл russian_trusted_root_ca.cer не найден в бандле — такие сайты открываться не будут.")
                            .font(.caption).foregroundStyle(.red)
                    }
                } footer: {
                    Text("Сертификат используется только внутри этого профиля и не устанавливается в систему.")
                }

                Section("User-Agent") {
                    TextField("User-Agent", text: $profile.customUserAgent, axis: .vertical)
                        .font(.caption.monospaced())
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    Button("Сбросить на стандартный") { profile.customUserAgent = Profile.defaultUserAgent }
                }
            }
            .navigationTitle(profile.name.isEmpty ? "Профиль" : profile.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        profile.host = profile.host.trimmingCharacters(in: .whitespaces)
                        onSave(profile)
                        dismiss()
                    }
                    .disabled(profile.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func parse(_ text: String) {
        let defaultType = profile.proxyType == .none ? .socks5 : profile.proxyType
        guard let p = ProxyParser.parse(text, defaultType: defaultType) else {
            parseError = text.isEmpty ? "Буфер обмена пуст" : "Не понял формат прокси"
            return
        }
        parseError = nil
        p.apply(to: &profile)
        checkResult = nil
    }

    private func check() {
        checking = true
        checkResult = nil
        let snapshot = profile
        Task {
            do {
                let r = try await ProxyChecker.check(snapshot)
                checkResult = "IP: \(r.ip)\nСтрана: \(r.country)\nПинг: \(r.pingMs) мс"
                checkFailed = false
            } catch {
                checkResult = error.localizedDescription
                checkFailed = true
            }
            checking = false
        }
    }
}
