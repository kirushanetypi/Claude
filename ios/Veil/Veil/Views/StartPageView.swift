import SwiftUI

struct StartPageView: View {
    @Bindable var tabs: TabManager

    private var profile: BrowserProfile { tabs.profile }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HStack(spacing: 12) {
                    ProfileBadge(profile: profile, size: 44)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(profile.name).font(.title2.bold())
                        ProfileBadgesLine(profile: profile)
                    }
                }

                if !tabs.bookmarks.isEmpty {
                    Text("Закладки").font(.headline)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 12)], spacing: 16) {
                        ForEach(tabs.bookmarks.prefix(12)) { b in
                            Button { tabs.selectedTab?.load(b.url) } label: {
                                VStack(spacing: 6) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 14).fill(profile.color.opacity(0.15))
                                        Text(String(b.title.prefix(1)).uppercased()).font(.title2.bold()).foregroundStyle(profile.color)
                                    }
                                    .frame(width: 56, height: 56)
                                    Text(b.title).font(.caption).lineLimit(2).multilineTextAlignment(.center).foregroundStyle(.primary)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                if !tabs.history.isEmpty {
                    Text("Недавние").font(.headline)
                    VStack(spacing: 0) {
                        ForEach(tabs.history.prefix(8)) { e in
                            Button { tabs.selectedTab?.load(e.url) } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(e.title).lineLimit(1).foregroundStyle(.primary)
                                        Text(e.url.host ?? e.url.absoluteString).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                    }
                                    Spacer()
                                }
                                .padding(.vertical, 8)
                            }
                            .buttonStyle(.plain)
                            Divider()
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Защита профиля").font(.headline)
                    line("Трекеры", profile.settings.blockTrackers ? "блокируются" : "не блокируются")
                    line("Сторонние cookie", profile.settings.blockThirdPartyCookies ? "блокируются" : "разрешены")
                    line("Только HTTPS", profile.settings.httpsOnly ? "да" : "нет")
                    line("Сертификаты Минцифры", profile.settings.trustRussianCA ? "включены" : "выключены")
                    line("Прокси", profile.settings.proxy.summary)
                    line("WebRTC", profile.settings.blockWebRTC ? "выключен" : "включён")
                }
                .font(.footnote)
            }
            .padding(20)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.immediately)
        .background(Color(.systemBackground))
    }

    private func line(_ k: String, _ v: String) -> some View {
        HStack {
            Text(k).foregroundStyle(.secondary)
            Spacer()
            Text(v)
        }
    }
}
