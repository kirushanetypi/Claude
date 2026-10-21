import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var draft: AppSettings
    @State private var confirmWipe = false
    @State private var wiping = false

    init(settings: AppSettings) {
        _draft = State(initialValue: settings)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Требовать \(AppLock.biometryName) при входе", isOn: $draft.lockEnabled)
                    Picker("Блокировать после сворачивания", selection: $draft.lockGraceSeconds) {
                        Text("Сразу").tag(0)
                        Text("Через 1 мин").tag(60)
                        Text("Через 5 мин").tag(300)
                        Text("Через 15 мин").tag(900)
                    }
                    .disabled(!draft.lockEnabled)
                    Toggle("Скрывать содержимое в переключателе приложений", isOn: $draft.shieldInSwitcher)
                } header: {
                    Text("Блокировка")
                } footer: {
                    Text("Защищённые профили (с замком) дополнительно спрашивают \(AppLock.biometryName) при каждом открытии.")
                }

                Section("Сертификаты") {
                    NavigationLink("Доверенные корневые сертификаты") { CertificatesView() }
                }

                Section {
                    Button(role: .destructive) { confirmWipe = true } label: {
                        HStack {
                            Label("Стереть всё", systemImage: "flame")
                            if wiping { Spacer(); ProgressView() }
                        }
                    }
                    .disabled(wiping)
                } header: {
                    Text("Тревожная кнопка")
                } footer: {
                    Text("Удаляет все профили, их хранилища WebKit, историю, закладки, загрузки, пароли прокси и импортированные сертификаты. Создаёт профили по умолчанию заново. Необратимо.")
                }

                Section("Что приложение НЕ может (ограничения iOS)") {
                    Text(Self.limitations).font(.footnote).foregroundStyle(.secondary)
                }

                Section {
                    LabeledContent("Версия", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?")
                    LabeledContent("Движок", value: "WKWebView (системный WebKit)")
                }
            }
            .navigationTitle("Настройки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Готово") { dismiss() } } }
            .onChange(of: draft) { _, new in app.updateSettings(new) }
            .confirmationDialog("Стереть все данные?", isPresented: $confirmWipe, titleVisibility: .visible) {
                Button("Стереть всё", role: .destructive) {
                    wiping = true
                    Task {
                        await app.panicWipe()
                        wiping = false
                        dismiss()
                    }
                }
            }
        }
    }

    static let limitations = """
    • Движок рендеринга только WebKit — другой на iOS запрещён. Любой сайт видит WebKit/Safari, как бы ни подменялся User-Agent.
    • TLS-отпечаток (JA3/JA4) всегда Apple. Для серьёзного антифрода это надёжнее любого UA.
    • Accept-Language и прочие заголовки на уровне всех запросов не подменяются.
    • Без прокси DNS идёт через системный резолвер. DoH внутри приложения невозможен; используйте SOCKS5 или системный профиль DNS.
    • Скриншоты и запись экрана заблокировать нельзя.
    • Смена IP — только через ваш прокси. Встроенного VPN/Tor нет.
    • Расширения (uBlock и т.п.) не поддерживаются — только Content Blocker-правила.
    """
}
