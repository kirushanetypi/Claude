# Veil — многопрофильный браузер для iPhone и iPad

SwiftUI + WKWebView, iOS 17+, без сторонних зависимостей. Задача: профили как в Octo (изоляция, прокси, отпечаток),
переключаемые сертификаты Минцифры и максимум приватности, который вообще даёт iOS.

## Что умеет

**Профили** — каждый физически отдельное хранилище WebKit (`WKWebsiteDataStore(forIdentifier:)`): cookies, localStorage,
IndexedDB, кэш, сессии. Свои вкладки (восстанавливаются после перезапуска вместе с историей назад/вперёд), закладки,
история, папка загрузок. Удаление профиля сносит хранилище через `WKWebsiteDataStore.remove(forIdentifier:)`.
Профиль «инкогнито» живёт только в памяти. На профиль можно повесить Face ID / Touch ID.

**Сертификаты Минцифры** — переключатель в настройках профиля. Технически: на каждом TLS-challenge цепочка сначала
проверяется системными корнями iOS; если не прошла, а в профиле включён якорь, цепочка проверяется на *копии* SecTrust
с якорями Russian Trusted Root CA + Sub CA (2022 и 2024), с проверкой имени хоста. В системный trust store ничего не
ставится, другие приложения и Safari не затрагиваются. Сайт, открытый через этот якорь, показывает оранжевый замок с
бейджем «RU», в «О сайте» видна цепочка. Если сертификат выключен — страница ошибки с кнопкой «Включить для профиля и
открыть». Можно импортировать свои CA (`.pem/.cer/.crt`) и включать их по профилям. Сертификаты лежат в
`Veil/Resources/Certificates/`, скачаны с gu-st.ru, SHA-256 корня `D2:6D:2D:02:31:B7:C3:9F:…:CA:8E:CF:31`.

**Прокси на профиль** — HTTP CONNECT (опционально с TLS до прокси) или SOCKS5 с логином/паролем (пароль в Keychain).
Это нативный `WKWebsiteDataStore.proxyConfigurations` (iOS 17), не JS-костыль: через прокси идёт весь трафик WebKit.
Failover выключен: упал прокси — трафик не уходит напрямую. С SOCKS5 DNS резолвит прокси.

**Отпечаток** — пресеты User-Agent (iPhone/iPad/Mac Safari, Chrome Android/Windows, Firefox) или свой; версия для ПК;
шум в canvas/WebGL/AudioContext с сидом от id профиля (стабильный между сессиями, разный между профилями);
отключение WebRTC; подмена `navigator.language` и часового пояса в JS.

**Защита** — блок трекеров (`WKContentRuleList`, ~95 доменов, список в `Resources/BlockLists/trackers.json`),
блок сторонних cookie, HTTPS-only (апгрейд + fallback с явным согласием), выключаемый JS, запрет камеры/микрофона/
геолокации/датчиков по умолчанию, Google Safe Browsing выключен по умолчанию (он шлёт префиксы хэшей URL в Google),
блокировка приложения Face ID, шторка в переключателе приложений, «стереть всё» одной кнопкой, файлы с
`NSFileProtectionComplete`, очистка данных конкретного сайта, долгое нажатие на ссылку без предзагрузки страницы.

**Браузер** — вкладки с превью, адресная строка с подсказками из истории/закладок, 5 поисковиков, загрузки в
Файлы → Veil → Downloads, поиск по странице, JS-диалоги, попапы в новую вкладку, pull-to-refresh, на iPad полоса
вкладок и шорткаты ⌘T ⌘W ⌘L ⌘R ⌘F ⌘D ⌘[ ⌘].

## Сборка

Нужен Xcode 16+ (проект использует synchronized folders — файлы в `Veil/` подхватываются автоматически).

1. `open ios/Veil/Veil.xcodeproj`
2. Target `Veil` → Signing & Capabilities → выбрать свою Team. Bundle ID `local.veil.browser` можно поменять.
3. Запустить на устройстве или симуляторе (iOS 17+).

Если Xcode проект не открывает (старая версия или что-то сломалось): `brew install xcodegen && cd ios/Veil && xcodegen generate`.

Бесплатный аккаунт разработчика подписывает на 7 дней, платный ($99/год) — на год. В App Store это не несите:
антидетект-функции и произвольные корневые сертификаты ревью не пропустит, да и не для этого делалось.

## Структура

```
Veil/App         VeilApp (вход, RootView), AppState (профили, активный профиль, блокировка, wipe)
Veil/Models      BrowserProfile + ProfileSettings, ProxySettings, UserAgentPreset, SearchEngine, записи сессии
Veil/Services    ProfileRuntime (data store, прокси, конфигурация WKWebView), TrustEvaluator (SecTrust),
                 CertificateStore (встроенные + импорт), ContentBlocker, FingerprintScripts (JS),
                 AppLock (LocalAuthentication), DownloadManager, Persistence (JSON + file protection), Keychain
Veil/Browser     WebTab (WKWebView + все делегаты), TabManager (вкладки/история/закладки/диалоги), WebViewContainer
Veil/Views       BrowserView (панели, меню, адрес), TabSwitcher, ProfileSwitcher, ProfileEditor, Certificates,
                 SiteInfo, ErrorPage (кнопка «включить Минцифры»), StartPage, списки, Settings, LockScreen
Veil/Resources   сертификаты (.pem), trackers.json, Assets
Config/Info.plist  usage descriptions, file sharing, URL-схема veil://open?url=
```

## Чего это НЕ делает (и не сможет — ограничения iOS)

- Движок всегда WebKit. Любой сайт видит это по поведению JS/CSS, UA-подмена косметическая.
- TLS-отпечаток (JA3/JA4) всегда Apple. Серьёзный антифрод (банки, рекламные сети) вычисляет по нему, а не по UA.
  Полноценный антидетект уровня Octo/Multilogin на iOS невозможен в принципе.
- Accept-Language и другие заголовки на все запросы не подменяются (WKWebView не даёт перехват сабресурсов).
- Без прокси DNS системный. DoH в приложении не сделать; либо SOCKS5, либо системный DNS-профиль.
- Нет Tor/VPN внутри; смена IP только вашим прокси.
- Расширения (uBlock) невозможны, только декларативные Content Blocker-правила.
- Скриншоты и запись экрана не блокируются.
- `veil://open?url=…` работает; стать браузером по умолчанию можно только с entitlement
  `com.apple.developer.web-browser`, который выдаёт Apple по заявке.

## Что я бы сделал следующим

1. Прогнать в Xcode: проект писался без компилятора под рукой, пара опечаток в SwiftUI-модификаторах возможна.
2. Заменить мой список трекеров на конвертированный EasyPrivacy (есть готовые конвертеры в формат WebKit).
3. Проверку отзыва сертификатов (OCSP) для цепочек Минцифры — сейчас только валидность цепочки и имени.
4. Экспорт/импорт профилей (настройки без данных) и резервную копию закладок.
