import Foundation
import WebKit
import Combine

/// Одна вкладка = один WKWebView на хранилище своего профиля.
@MainActor
final class Tab: NSObject, ObservableObject, Identifiable {
    let id = UUID()
    let webView: WKWebView
    var profile: Profile

    @Published var title = ""
    @Published var url: URL?
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var isLoading = false
    @Published var progress = 0.0
    @Published var error: String?

    init(profile: Profile, dataStore: WKWebsiteDataStore) {
        self.profile = profile

        let config = WKWebViewConfiguration()
        config.websiteDataStore = dataStore
        config.userContentController.addUserScript(
            WKUserScript(source: Tab.disableWebRTC, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        config.allowsInlineMediaPlayback = true

        webView = WKWebView(frame: .zero, configuration: config)
        super.init()

        webView.customUserAgent = profile.customUserAgent.isEmpty ? Profile.defaultUserAgent : profile.customUserAgent
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true

        webView.publisher(for: \.title).map { $0 ?? "" }.assign(to: &$title)
        webView.publisher(for: \.url).assign(to: &$url)
        webView.publisher(for: \.canGoBack).assign(to: &$canGoBack)
        webView.publisher(for: \.canGoForward).assign(to: &$canGoForward)
        webView.publisher(for: \.isLoading).assign(to: &$isLoading)
        webView.publisher(for: \.estimatedProgress).assign(to: &$progress)
    }

    var displayTitle: String {
        if !title.isEmpty { return title }
        return url?.host() ?? "Новая вкладка"
    }

    /// Адрес или поисковый запрос.
    func load(_ input: String) {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        // fail closed: прокси включён, но не настроен — никуда не ходим
        if profile.usesProxy && !profile.proxyIsValid {
            error = "Прокси включён, но не настроен. Загрузка заблокирована."
            return
        }

        let target: URL?
        if text.contains("://") {
            target = URL(string: text)
        } else if text.contains("."), !text.contains(" ") {
            target = URL(string: "https://" + text)
        } else {
            var c = URLComponents(string: "https://duckduckgo.com/")!
            c.queryItems = [URLQueryItem(name: "q", value: text)]
            target = c.url
        }
        guard let target else { return }
        error = nil
        webView.load(URLRequest(url: target))
    }

    func reload() {
        error = nil
        if webView.url == nil, let url { webView.load(URLRequest(url: url)) } else { webView.reload() }
    }

    // Снимаем WebRTC и mediaDevices до запуска любых скриптов страницы.
    static let disableWebRTC = """
    (function () {
      var names = ['RTCPeerConnection', 'webkitRTCPeerConnection', 'RTCDataChannel',
                   'RTCSessionDescription', 'RTCIceCandidate', 'RTCRtpSender', 'RTCRtpReceiver'];
      names.forEach(function (n) {
        try { delete window[n]; } catch (e) {}
        try { Object.defineProperty(window, n, { value: undefined, writable: false, configurable: false }); } catch (e) {}
      });
      try { delete Navigator.prototype.mediaDevices; } catch (e) {}
      try { delete navigator.mediaDevices; } catch (e) {}
      try {
        Object.defineProperty(Navigator.prototype, 'mediaDevices',
          { get: function () { return undefined; }, configurable: false });
      } catch (e) {}
    })();
    """
}

extension Tab: WKNavigationDelegate {
    // Это webView(_:didReceive:completionHandler:) в async-форме.
    // WebKit присылает сюда server trust и для главного документа, и для подресурсов.
    func webView(_ webView: WKWebView,
                 respondTo challenge: URLAuthenticationChallenge) async -> (URLSession.AuthChallengeDisposition, URLCredential?) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust,
              profile.trustMincifryCert else {
            return (.performDefaultHandling, nil)
        }
        // SecTrustEvaluateWithError может ходить в сеть — не на главном потоке
        let ok = await Task.detached(priority: .userInitiated) { MincifryCert.evaluate(trust) }.value
        if ok { return (.useCredential, URLCredential(trust: trust)) }

        let host = challenge.protectionSpace.host
        if host == webView.url?.host() {
            error = MincifryCert.certificate == nil
                ? "В бандле нет russian_trusted_root_ca.cer — проверка невозможна."
                : "Сертификат \(host) не прошёл проверку даже с корнем Минцифры."
        }
        return (.cancelAuthenticationChallenge, nil)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        error = nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        show(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        show(error)
    }

    private func show(_ error: Error) {
        let e = error as NSError
        // отмена / прерывание политикой — не ошибка
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return }
        if e.domain == "WebKitErrorDomain" && e.code == 102 { return }

        var text = e.localizedDescription
        if profile.usesProxy && e.domain == NSURLErrorDomain {
            switch e.code {
            case NSURLErrorCannotConnectToHost, NSURLErrorTimedOut, NSURLErrorNetworkConnectionLost,
                 NSURLErrorCannotFindHost, NSURLErrorDNSLookupFailed:
                text = "Прокси \(profile.host):\(profile.port) недоступен. Напрямую не ходим.\n\(e.localizedDescription)"
            default: break
            }
        }
        if !profile.trustMincifryCert && e.domain == NSURLErrorDomain
            && (e.code == NSURLErrorServerCertificateUntrusted || e.code == NSURLErrorSecureConnectionFailed) {
            text += "\nЕсли у сайта сертификат Минцифры — включи его в настройках профиля."
        }
        self.error = text
    }
}

extension Tab: WKUIDelegate {
    // target=_blank и window.open — открываем в этой же вкладке
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }
}
