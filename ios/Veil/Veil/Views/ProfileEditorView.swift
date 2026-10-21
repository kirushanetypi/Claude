import SwiftUI
import UniformTypeIdentifiers

struct ProfileEditorView: View {
    enum Mode { case create, edit }

    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    let mode: Mode
    @State private var draft: BrowserProfile
    @State private var proxyPassword = ""
    @State private var showImporter = false
    @State private var importMessage: String?
    @State private var confirmDelete = false
    @State private var confirmClear = false

    private static let languages = ["ru-RU", "en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "it-IT", "tr-TR", "uk-UA", "kk-KZ", "pl-PL", "zh-CN", "ja-JP"]
    private static let timeZones = ["Europe/Moscow", "Europe/Kaliningrad", "Europe/Samara", "Asia/Yekaterinburg", "Asia/Novosibirsk",
                                    "Asia/Vladivostok", "Europe/Kyiv", "Europe/Minsk", "Asia/Almaty", "Asia/Tbilisi", "Asia/Yerevan",
                                    "Europe/Istanbul", "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Dubai", "Asia/Bangkok",
                                    "Asia/Shanghai", "Asia/Tokyo", "America/New_York", "America/Chicago", "America/Los_Angeles", "UTC"]

    init(profile: BrowserProfile, mode: Mode) {
        self.mode = mode
        _draft = State(initialValue: profile)
    }

    var body: some View {
        NavigationStack {
            Form {
                basics
                certificates
                proxy
                identity
                protection
                search
                if mode == .edit { danger }
            }
            .navigationTitle(mode == .create ? "Новый профиль" : "Профиль")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Готово") { save() }
                        .disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear { proxyPassword = KeychainHelper.get(draft.proxyKeychainKey) ?? "" }
            .fileImporter(isPresented: $showImporter, allowedContentTypes: [.x509Certificate, .data]) { handleImport($0) }
            .alert("Сертификаты", isPresented: Binding(get: { importMessage != nil }, set: { if !$0 { importMessage = nil } })) {
                Button("OK") {}
            } message: {
                Text(importMessage ?? "")
            }
            .confirmationDialog("Удалить профиль «\(draft.name)»?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Удалить вместе со всеми данными", role: .destructive) {
                    Task { await app.delete(draft); dismiss() }
                }
            }
            .confirmationDialog("Очистить данные профиля?", isPresented: $confirmClear, titleVisibility: .visible) {
                Button("Очистить cookies, кэш, историю, вкладки", role: .destructive) {
                    Task { await app.clearData(of: draft) }
                }
            }
        }
    }

    // MARK: - Sections

    private var basics: some View {
        Section("Профиль") {
            TextField("Название", text: $draft.name)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(BrowserProfile.iconChoices, id: \.self) { icon in
                        Button { draft.icon = icon } label: {
                            Image(systemName: icon)
                                .frame(width: 36, height: 36)
                                .background(Circle().fill(draft.icon == icon ? draft.color : Color(.tertiarySystemFill)))
                                .foregroundStyle(draft.icon == icon ? .white : .primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)
            }
            HStack(spacing: 12) {
                ForEach(BrowserProfile.colorChoices, id: \.self) { hex in
                    Button { draft.colorHex = hex } label: {
                        Circle().fill(Color(hex: hex))
                            .frame(width: 28, height: 28)
                            .overlay(Circle().stroke(Color.primary, lineWidth: draft.colorHex == hex ? 2 : 0))
                    }
                    .buttonStyle(.plain)
                }
            }
            if mode == .create {
                Toggle("Инкогнито: ничего не сохранять на диск", isOn: $draft.isEphemeral)
            }
            Toggle("Требовать \(AppLock.biometryName) при открытии", isOn: $draft.requiresAuth)
        }
    }

    private var certificates: some View {
        Section {
            Toggle(isOn: $draft.settings.trustRussianCA) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Доверять сертификатам Минцифры")
                    Text("Russian Trusted Root CA + Sub CA 2022/2024. Только внутри этого профиля, система не трогается.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            ForEach(app.certificates.imported) { cert in
                Toggle(isOn: Binding(
                    get: { draft.settings.trustedCertificateIDs.contains(cert.id) },
                    set: { on in
                        if on { draft.settings.trustedCertificateIDs.insert(cert.id) } else { draft.settings.trustedCertificateIDs.remove(cert.id) }
                    })) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(cert.subject)
                        Text(String(cert.fingerprintFormatted.prefix(29)) + "…").font(.caption2.monospaced()).foregroundStyle(.secondary)
                    }
                }
            }
            Button { showImporter = true } label: {
                Label("Импортировать сертификат (.pem / .cer / .crt)", systemImage: "square.and.arrow.down")
            }
        } header: {
            Text("Доверенные корневые сертификаты")
        } footer: {
            Text("Выключено — сайты с такими сертификатами покажут ошибку с кнопкой «включить для профиля». Переключение применяется мгновенно.")
        }
    }

    private var proxy: some View {
        Section {
            Picker("Тип", selection: $draft.settings.proxy.kind) {
                ForEach(ProxySettings.Kind.allCases) { Text($0.title).tag($0) }
            }
            if draft.settings.proxy.kind != .none {
                TextField("Хост", text: $draft.settings.proxy.host)
                    .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL)
                TextField("Порт", value: $draft.settings.proxy.port, format: .number)
                    .keyboardType(.numberPad)
                TextField("Логин (необязательно)", text: $draft.settings.proxy.username)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                SecureField("Пароль", text: $proxyPassword)
                if draft.settings.proxy.kind == .http {
                    Toggle("TLS до прокси (HTTPS-прокси)", isOn: $draft.settings.proxy.useTLS)
                }
            }
        } header: {
            Text("Прокси")
        } footer: {
            Text("Пароль хранится в Keychain. Failover выключен: если прокси упал, трафик НЕ пойдёт напрямую. С SOCKS5 DNS резолвит прокси.")
        }
    }

    private var identity: some View {
        Section {
            Picker("User-Agent", selection: $draft.settings.userAgent) {
                ForEach(UserAgentPreset.allCases) { Text($0.title).tag($0) }
            }
            if draft.settings.userAgent == .custom {
                TextField("Строка User-Agent", text: $draft.settings.customUserAgent, axis: .vertical)
                    .font(.caption.monospaced())
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
            }
            Toggle("Сайты в версии для ПК", isOn: $draft.settings.desktopMode)
            Toggle("Шум в Canvas / WebGL / Audio", isOn: $draft.settings.fingerprintProtection)
            Toggle("Блокировать WebRTC (утечка реального IP)", isOn: $draft.settings.blockWebRTC)
            Picker("Язык страниц (navigator.language)", selection: $draft.settings.languageOverride) {
                Text("Системный").tag("")
                ForEach(Self.languages, id: \.self) { Text($0).tag($0) }
            }
            Picker("Часовой пояс (JS)", selection: $draft.settings.timeZoneOverride) {
                Text("Системный").tag("")
                ForEach(timeZoneOptions, id: \.self) { Text($0).tag($0) }
            }
        } header: {
            Text("Отпечаток")
        } footer: {
            Text("Честно: движок всегда WebKit, TLS-отпечаток всегда Apple. Подмена UA и часового пояса — косметика, серьёзный антифрод её видит. Accept-Language в заголовках подменить нельзя.")
        }
    }

    private var timeZoneOptions: [String] {
        var list = Self.timeZones
        let current = TimeZone.current.identifier
        if !list.contains(current) { list.insert(current, at: 0) }
        if !draft.settings.timeZoneOverride.isEmpty, !list.contains(draft.settings.timeZoneOverride) {
            list.append(draft.settings.timeZoneOverride)
        }
        return list
    }

    private var protection: some View {
        Section {
            Toggle("Блокировать трекеры", isOn: $draft.settings.blockTrackers)
            Toggle("Блокировать сторонние cookie", isOn: $draft.settings.blockThirdPartyCookies)
            Toggle("Только HTTPS", isOn: $draft.settings.httpsOnly)
            Toggle("JavaScript", isOn: $draft.settings.javaScriptEnabled)
            Toggle("Разрешать камеру и микрофон сайтам", isOn: $draft.settings.allowMediaCapture)
            Toggle("Разрешать геолокацию сайтам", isOn: $draft.settings.allowGeolocation)
            Toggle("Предупреждать о мошеннических сайтах", isOn: $draft.settings.safeBrowsing)
            Toggle("Очищать данные при каждом запуске", isOn: $draft.settings.clearOnLaunch)
        } header: {
            Text("Защита")
        } footer: {
            Text("«Предупреждать о мошеннических сайтах» = Google Safe Browsing (в Китае — Tencent): префиксы хэшей URL уходят на их серверы. По умолчанию выключено.")
        }
    }

    private var search: some View {
        Section("Поиск") {
            Picker("Поисковик", selection: $draft.settings.searchEngine) {
                ForEach(SearchEngine.allCases) { Text($0.title).tag($0) }
            }
        }
    }

    private var danger: some View {
        Section {
            Button("Очистить все данные профиля", role: .destructive) { confirmClear = true }
            Button("Удалить профиль", role: .destructive) { confirmDelete = true }
        }
    }

    // MARK: - Actions

    private func save() {
        KeychainHelper.set(proxyPassword, for: draft.proxyKeychainKey)
        draft.name = draft.name.trimmingCharacters(in: .whitespaces)
        if mode == .create { app.add(draft) } else { app.update(draft) }
        dismiss()
    }

    private func handleImport(_ result: Result<URL, Error>) {
        switch result {
        case .failure(let e):
            importMessage = e.localizedDescription
        case .success(let url):
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            do {
                let data = try Data(contentsOf: url)
                let added = try app.certificates.importCertificates(from: data)
                added.forEach { draft.settings.trustedCertificateIDs.insert($0.id) }
                importMessage = "Добавлено и включено для профиля: " + added.map(\.subject).joined(separator: ", ")
            } catch {
                importMessage = error.localizedDescription
            }
        }
    }
}
