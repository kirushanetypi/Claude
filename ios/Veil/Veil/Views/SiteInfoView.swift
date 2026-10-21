import SwiftUI

struct SiteInfoView: View {
    @Bindable var tabs: TabManager
    let tab: WebTab
    @Environment(\.dismiss) private var dismiss

    private var host: String { tab.url?.host ?? "" }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Label {
                        Text(tab.trust.title)
                    } icon: {
                        Image(systemName: tab.trust.symbol).foregroundStyle(Color(uiColor: tab.trust.tint))
                    }
                    if let url = tab.url {
                        Text(url.absoluteString).font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled)
                    }
                } header: {
                    Text(host)
                }

                let chain = tab.chainSubjects
                if !chain.isEmpty {
                    Section("Цепочка сертификатов") {
                        ForEach(Array(chain.enumerated()), id: \.offset) { i, subject in
                            HStack(alignment: .top, spacing: 8) {
                                Text(i == 0 ? "сайт" : (i == chain.count - 1 ? "корень" : "CA"))
                                    .font(.caption2).foregroundStyle(.secondary).frame(width: 44, alignment: .leading)
                                Text(subject).font(.footnote.monospaced())
                            }
                        }
                    }
                }

                Section("Профиль «\(tabs.profile.name)»") {
                    LabeledContent("Сертификаты Минцифры", value: tabs.profile.settings.trustRussianCA ? "включены" : "выключены")
                    LabeledContent("Прокси", value: tabs.profile.settings.proxy.summary)
                    LabeledContent("Трекеры", value: tabs.profile.settings.blockTrackers ? "блокируются" : "разрешены")
                    LabeledContent("Сторонние cookie", value: tabs.profile.settings.blockThirdPartyCookies ? "блокируются" : "разрешены")
                    LabeledContent("JavaScript", value: tabs.profile.settings.javaScriptEnabled ? "включён" : "выключен")
                }

                if !host.isEmpty {
                    Section {
                        Button("Очистить данные этого сайта", role: .destructive) {
                            Task {
                                await tabs.runtime.clearData(forHost: host)
                                tab.reload()
                                dismiss()
                            }
                        }
                    } footer: {
                        Text("Удалит cookies, localStorage, кэш и прочее для \(host) только в этом профиле.")
                    }
                }
            }
            .navigationTitle("О сайте")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Готово") { dismiss() } } }
        }
    }
}
