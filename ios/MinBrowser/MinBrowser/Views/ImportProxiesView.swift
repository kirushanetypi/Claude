import SwiftUI

/// Вставить много строк — получить по профилю на каждую.
struct ImportProxiesView: View {
    @EnvironmentObject private var store: ProfileStore
    @Environment(\.dismiss) private var dismiss

    @State private var text = ""
    @State private var defaultType: ProxyType = .socks5
    @State private var trustMincifry = false

    private var parsed: (ok: [ParsedProxy], bad: [String]) {
        ProxyParser.parseList(text, defaultType: defaultType)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextEditor(text: $text)
                        .font(.callout.monospaced())
                        .frame(minHeight: 200)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button("Вставить из буфера") { text = UIPasteboard.general.string ?? "" }
                } header: {
                    Text("Прокси — по одному на строку")
                }

                Section {
                    Picker("Тип для строк без схемы", selection: $defaultType) {
                        Text("SOCKS5").tag(ProxyType.socks5)
                        Text("HTTP").tag(ProxyType.httpConnect)
                    }
                    .pickerStyle(.segmented)
                    Toggle("Доверять сертификату Минцифры", isOn: $trustMincifry)
                }

                let result = parsed
                Section {
                    Text("Распознано: \(result.ok.count)")
                    if !result.bad.isEmpty {
                        Text("Не распознано (\(result.bad.count)):\n" + result.bad.prefix(10).joined(separator: "\n"))
                            .font(.caption.monospaced())
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Импорт прокси")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Отмена") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Создать") { create() }.disabled(parsed.ok.isEmpty)
                }
            }
        }
    }

    private func create() {
        for p in parsed.ok {
            var profile = Profile(name: "\(p.host):\(p.port)", color: randomColor())
            p.apply(to: &profile)
            profile.trustMincifryCert = trustMincifry
            store.upsert(profile)
        }
        dismiss()
    }
}
