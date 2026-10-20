# MinBrowser

Минималистичный браузер для iPad/iPhone (SwiftUI, iOS 17+) на WKWebView: изолированные профили, свой прокси на профиль, корень Минцифры только внутри приложения. Без внешних зависимостей, без аналитики.

## Сборка

```bash
brew install xcodegen      # нужен только для генерации .xcodeproj
cd ios/MinBrowser
xcodegen generate
open MinBrowser.xcodeproj
```

Без XcodeGen: создай в Xcode проект iOS App (SwiftUI, iOS 17), удали сгенерированные `ContentView`/`App`, перетащи папку `MinBrowser/` в проект.

В `project.yml` поменяй `PRODUCT_BUNDLE_IDENTIFIER` и выбери свою команду подписи.

## Структура

```
MinBrowser/
├── MinBrowserApp.swift          точка входа
├── Models/Profile.swift         Profile, ProxyType, сборка ProxyConfiguration, Color(hex:)
├── Storage/Keychain.swift       пароли прокси
├── Storage/ProfileStore.swift   profiles.json в Application Support + удаление WKWebsiteDataStore
├── Proxy/ProxyParser.swift      разбор строк прокси и списков
├── Proxy/ProxyChecker.swift     IP / страна / пинг через прокси
├── Browser/MincifryCert.swift   загрузка .cer и проверка цепочки
├── Browser/Tab.swift            WKWebView вкладки, навигация, server trust, анти-WebRTC
├── Browser/BrowserModel.swift   вкладки и хранилища всех профилей
├── Views/                       BrowserView, ProfileListView, ProfileEditView, ImportProxiesView, WebViewContainer
└── Resources/russian_trusted_root_ca.cer
```

Сертификат скачан с `gu-st.ru` (официальный адрес Госуслуг), сохранён в DER.
SHA-256: `D2:6D:2D:02:31:B7:C3:9F:92:CC:73:85:12:BA:54:10:35:19:E4:40:5D:68:B5:BD:70:3E:97:88:CA:8E:CF:31`, действует до 27.02.2032.

## Как работает

- **Изоляция**: у каждого профиля свой `WKWebsiteDataStore(forIdentifier: profile.id)`. При удалении профиля сначала закрываются все его WebView, потом `WKWebsiteDataStore.remove(forIdentifier:)` — иначе WebKit откажется удалять.
- **Прокси**: `dataStore.proxyConfigurations = [ProxyConfiguration(...)]`, `allowFailover = false`. Если прокси включён, но хост/порт пустые — подставляется заведомо мёртвый `127.0.0.1:9`, загрузка заблокирована. При смене прокси вкладки профиля пересоздаются, чтобы старые keep-alive соединения не жили дальше.
- **Проверка прокси**: `URLSession` с тем же `ProxyConfiguration`. IP — `api.ipify.org`, пинг — второй запрос по уже открытому соединению, страна — `ipapi.co` (тоже через прокси).
- **Минцифры**: в `webView(_:respondTo:)` (async-форма `didReceive:completionHandler:`) при включённом флаге: `SecTrustSetAnchorCertificates` + `SecTrustSetAnchorCertificatesOnly(false)` + `SecTrustEvaluateWithError` в фоне. Успех — `.useCredential`, иначе `.cancelAuthenticationChallenge`. Флаг выключен — `.performDefaultHandling`.
- **WebRTC**: user script на `.atDocumentStart` во всех фреймах удаляет `RTCPeerConnection`, `webkitRTCPeerConnection` и `navigator.mediaDevices` и запрещает их переопределять.

## Ограничения (честно)

Код не собирался и не запускался в этой сессии (нет macOS/Xcode). Перед использованием проверь на устройстве.

1. **Подресурсы с сертификатом Минцифры.** WebKit пересылает server-trust challenge в navigation delegate и для подресурсов (картинки, CSS, XHR/fetch) — они должны грузиться. Под риском:
   - `<video>/<audio>` — медиа на iOS может грузиться через AVFoundation в обход делегата → видео с таких доменов может не играть;
   - Service Worker / Web Worker и `wss://` — у них может не быть страницы-делегата, тогда соединение отклонится.
   Проверка: открыть сайт, чей сертификат выдан `Russian Trusted Sub CA`, и посмотреть, грузятся ли картинки и данные.
2. **WebRTC-скрипт** не попадает в Web Workers и, возможно, в `about:blank`/`srcdoc` iframe — теоретически сайт может достать `RTCPeerConnection` оттуда. Публичного API отключить WebRTC в WKWebView нет. Проверяй на `browserleaks.com/webrtc`.
3. **DNS**: при SOCKS5 имя хоста передаётся прокси, но проверь утечку DNS на browserleaks — гарантий от Apple на это нет.
4. **Fail closed** держится на `allowFailover = false` у `ProxyConfiguration`. Обязательно проверь: выключи прокси-сервер — страницы должны падать с ошибкой, а не открываться.
