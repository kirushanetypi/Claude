import UIKit
import WebKit
import Observation

enum TrustState: Equatable {
    case none
    case insecure
    case secure
    case secureCustom(anchorName: String)
    case mixed
    case exception

    var symbol: String {
        switch self {
        case .none: return "magnifyingglass"
        case .insecure: return "exclamationmark.triangle.fill"
        case .secure: return "lock.fill"
        case .secureCustom: return "lock.shield.fill"
        case .mixed: return "lock.open.fill"
        case .exception: return "exclamationmark.lock.fill"
        }
    }
    var tint: UIColor {
        switch self {
        case .none: return .secondaryLabel
        case .insecure, .exception: return .systemRed
        case .secure: return .secondaryLabel
        case .secureCustom: return .systemOrange
        case .mixed: return .systemOrange
        }
    }
    var title: String {
        switch self {
        case .none: return "Нет соединения"
        case .insecure: return "Без шифрования (HTTP)"
        case .secure: return "Защищено. Сертификат проверен системными корнями iOS"
        case .secureCustom(let name): return "Защищено. Сертификат проверен пользовательским корнем: \(name)"
        case .mixed: return "HTTPS, но часть содержимого загружена без шифрования"
        case .exception: return "Сертификат НЕ проверен. Вы разрешили исключение для этого сайта"
        }
    }
}

struct PageError: Equatable {
    var code: Int
    var domain: String
    var message: String
    var failingURL: URL?
    var wouldTrustWith: [String] = []
    var httpFallback: URL?

    var isTLS: Bool {
        guard domain == NSURLErrorDomain else { return false }
        return [NSURLErrorServerCertificateUntrusted, NSURLErrorSecureConnectionFailed, NSURLErrorServerCertificateHasBadDate,
                NSURLErrorServerCertificateHasUnknownRoot, NSURLErrorServerCertificateNotYetValid, NSURLErrorClientCertificateRejected]
            .contains(code)
    }
}

/// Одна вкладка. Владеет WKWebView (создаётся лениво, сбрасывается при нехватке памяти) и всеми делегатами.
@Observable @MainActor
final class WebTab: NSObject, Identifiable {
    let id: UUID
    @ObservationIgnored private(set) weak var manager: TabManager?

    var url: URL?
    var title = ""
    var progress: Double = 0
    var isLoading = false
    var canGoBack = false
    var canGoForward = false
    var trust: TrustState = .none
    var pageError: PageError?
    var snapshot: UIImage?
    var isDesktop: Bool
    private(set) var webView: WKWebView?

    /// host -> id якоря, через который прошла проверка (для бейджа «Минцифры»).
    @ObservationIgnored private var customTrustedHosts: [String: String] = [:]
    /// host -> якоря, которые бы спасли невалидную цепочку (для кнопки на странице ошибки).
    @ObservationIgnored private var pendingWouldTrust: [String: [String]] = [:]
    @ObservationIgnored private(set) var chainSubjectsByHost: [String: [String]] = [:]
    @ObservationIgnored private var observations: [NSKeyValueObservation] = []
    @ObservationIgnored private var restoreState: Data?
    @ObservationIgnored private var initialURL: URL?
    @ObservationIgnored private var popupConfiguration: WKWebViewConfiguration?
    @ObservationIgnored private var lastUpgrade: (from: URL, to: URL)?

    init(manager: TabManager, record: TabRecord? = nil, url: URL? = nil, configuration: WKWebViewConfiguration? = nil) {
        self.id = record?.id ?? UUID()
        self.manager = manager
        self.url = record?.url ?? url
        self.title = record?.title ?? ""
        self.isDesktop = record?.isDesktop ?? manager.profile.settings.desktopMode
        self.restoreState = record?.interactionState
        self.initialURL = record == nil ? url : (record?.interactionState == nil ? record?.url : nil)
        self.popupConfiguration = configuration
        super.init()
    }

    var showsStartPage: Bool { webView == nil && url == nil && pageError == nil }
    var displayHost: String {
        guard let h = url?.host else { return "" }
        return h.hasPrefix("www.") ? String(h.dropFirst(4)) : h
    }

    // MARK: - WebView lifecycle

    /// Создаёт WKWebView только если вкладке есть что показать (восстановление или URL).
    func prepareForDisplay() {
        if webView == nil, (restoreState != nil || initialURL != nil || popupConfiguration != nil) {
            ensureWebView()
        }
    }

    @discardableResult
    func ensureWebView() -> WKWebView {
        if let webView { return webView }
        let config = popupConfiguration ?? manager?.runtime.makeConfiguration() ?? WKWebViewConfiguration()
        popupConfiguration = nil
        if isDesktop { config.defaultWebpagePreferences.preferredContentMode = .desktop }

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.navigationDelegate = self
        wv.uiDelegate = self
        wv.allowsBackForwardNavigationGestures = true
        wv.allowsLinkPreview = true
        wv.isFindInteractionEnabled = true
        wv.scrollView.keyboardDismissMode = .onDrag
        if let m = manager {
            wv.customUserAgent = m.profile.settings.userAgent.string(custom: m.profile.settings.customUserAgent)
        }
        #if DEBUG
        wv.isInspectable = true
        #endif
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        wv.scrollView.refreshControl = refresh

        observe(wv)
        webView = wv

        if let state = restoreState {
            restoreState = nil
            wv.interactionState = state
        } else if let u = initialURL {
            initialURL = nil
            wv.load(URLRequest(url: u))
        }
        return wv
    }

    /// Освобождает WKWebView (память / смена настроек), сохраняя сессию навигации.
    func discardWebView() {
        guard let wv = webView else { return }
        if let state = wv.interactionState as? Data { restoreState = state } else if let u = wv.url { initialURL = u }
        observations.removeAll()
        wv.stopLoading()
        wv.navigationDelegate = nil
        wv.uiDelegate = nil
        wv.removeFromSuperview()
        webView = nil
        isLoading = false
        progress = 0
    }

    func teardown() {
        observations.removeAll()
        webView?.stopLoading()
        webView?.navigationDelegate = nil
        webView?.uiDelegate = nil
        webView?.removeFromSuperview()
        webView = nil
    }

    func record() -> TabRecord {
        TabRecord(id: id, url: url, title: title,
                  interactionState: (webView?.interactionState as? Data) ?? restoreState, isDesktop: isDesktop)
    }

    private func observe(_ wv: WKWebView) {
        observations = [
            wv.observe(\.estimatedProgress, options: [.new]) { [weak self] wv, _ in
                let v = wv.estimatedProgress
                MainActor.assumeIsolated { self?.progress = v }
            },
            wv.observe(\.title, options: [.new]) { [weak self] wv, _ in
                let t = wv.title ?? ""
                let u = wv.url
                MainActor.assumeIsolated {
                    self?.title = t
                    if let u, !t.isEmpty { self?.manager?.updateHistoryTitle(for: u, title: t) }
                }
            },
            wv.observe(\.url, options: [.new]) { [weak self] wv, _ in
                let u = wv.url
                MainActor.assumeIsolated {
                    if let u { self?.url = u }
                    self?.updateTrust()
                }
            },
            wv.observe(\.isLoading, options: [.new]) { [weak self] wv, _ in
                let v = wv.isLoading
                MainActor.assumeIsolated { self?.isLoading = v }
            },
            wv.observe(\.canGoBack, options: [.new]) { [weak self] wv, _ in
                let v = wv.canGoBack
                MainActor.assumeIsolated { self?.canGoBack = v }
            },
            wv.observe(\.canGoForward, options: [.new]) { [weak self] wv, _ in
                let v = wv.canGoForward
                MainActor.assumeIsolated { self?.canGoForward = v }
            },
            wv.observe(\.hasOnlySecureContent, options: [.new]) { [weak self] _, _ in
                MainActor.assumeIsolated { self?.updateTrust() }
            }
        ]
    }

    // MARK: - Actions

    func load(_ url: URL) {
        pageError = nil
        self.url = url
        ensureWebView().load(URLRequest(url: url))
    }

    func submit(_ text: String) {
        guard let m = manager, let url = SearchEngine.resolve(text, engine: m.profile.settings.searchEngine) else { return }
        load(url)
    }

    func reload() {
        pageError = nil
        if let wv = webView, wv.url != nil { wv.reload() }
        else if let u = url { load(u) }
    }

    func stop() { webView?.stopLoading() }

    /// Убрать страницу ошибки. Если под ней ничего не загружено — вернуться к стартовой странице.
    func dismissError() {
        pageError = nil
        if let wv = webView, let current = wv.url {
            url = current
        } else {
            url = nil
            discardWebView()
            restoreStateCleared()
        }
    }

    private func restoreStateCleared() {
        restoreState = nil
        initialURL = nil
    }
    func goBack() { pageError = nil; webView?.goBack() }
    func goForward() { pageError = nil; webView?.goForward() }

    func setDesktop(_ desktop: Bool) {
        isDesktop = desktop
        discardWebView()
        prepareForDisplay()
    }

    func showFindPanel() {
        webView?.findInteraction?.presentFindNavigator(showingReplace: false)
    }

    func captureSnapshot() {
        guard let wv = webView, wv.url != nil, pageError == nil, wv.bounds.width > 0 else { return }
        let cfg = WKSnapshotConfiguration()
        cfg.snapshotWidth = NSNumber(value: 320)
        wv.takeSnapshot(with: cfg) { [weak self] image, _ in
            MainActor.assumeIsolated { if let image { self?.snapshot = image } }
        }
    }

    @objc private func handleRefresh() {
        webView?.scrollView.refreshControl?.endRefreshing()
        reload()
    }

    // MARK: - Trust

    private func updateTrust() {
        guard let wv = webView, let u = wv.url, let scheme = u.scheme?.lowercased() else { trust = .none; return }
        let host = u.host ?? ""
        switch scheme {
        case "http":
            trust = .insecure
        case "https":
            if let anchorID = customTrustedHosts[host] {
                let name = manager?.certificateName(for: anchorID) ?? "пользовательский CA"
                trust = .secureCustom(anchorName: name)
            } else if manager?.runtime.sessionTrustExceptions.contains(host) == true {
                trust = .exception
            } else if !wv.hasOnlySecureContent {
                trust = .mixed
            } else {
                trust = .secure
            }
        default:
            trust = .none
        }
    }

    var chainSubjects: [String] { chainSubjectsByHost[url?.host ?? ""] ?? [] }

    private func handle(_ error: Error) {
        let ns = error as NSError
        if ns.domain == NSURLErrorDomain, ns.code == NSURLErrorCancelled { return }
        if ns.domain == "WebKitErrorDomain", ns.code == 102 { return } // frame load interrupted by policy change (загрузка/редирект)
        var failing: URL?
        if let u = ns.userInfo[NSURLErrorFailingURLErrorKey] as? URL { failing = u }
        else if let s = ns.userInfo[NSURLErrorFailingURLStringErrorKey] as? String { failing = URL(string: s) }
        failing = failing ?? webView?.url ?? url

        var pe = PageError(code: ns.code, domain: ns.domain, message: ns.localizedDescription, failingURL: failing)
        if pe.isTLS, let host = failing?.host { pe.wouldTrustWith = pendingWouldTrust[host] ?? [] }
        if let up = lastUpgrade, up.to == failing { pe.httpFallback = up.from }
        pageError = pe
        isLoading = false
    }
}

// MARK: - WKNavigationDelegate

extension WebTab: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 preferences: WKWebpagePreferences,
                 decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void) {
        guard let url = navigationAction.request.url, let manager else { decisionHandler(.cancel, preferences); return }
        let scheme = url.scheme?.lowercased() ?? ""

        if !["http", "https", "about", "blob", "data", "file", "javascript"].contains(scheme) {
            decisionHandler(.cancel, preferences)
            if ["mailto", "tel", "sms", "facetime"].contains(scheme) { manager.openExternal(url) }
            return
        }
        if navigationAction.shouldPerformDownload {
            decisionHandler(.download, preferences)
            return
        }
        let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
        if scheme == "http", isMainFrame, manager.profile.settings.httpsOnly,
           let host = url.host, !manager.runtime.httpAllowedHosts.contains(host),
           var comps = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            comps.scheme = "https"
            if comps.port == 80 { comps.port = nil }
            if let https = comps.url {
                lastUpgrade = (from: url, to: https)
                decisionHandler(.cancel, preferences)
                webView.load(URLRequest(url: https))
                return
            }
        }
        preferences.preferredContentMode = isDesktop ? .desktop : .recommended
        preferences.allowsContentJavaScript = manager.profile.settings.javaScriptEnabled
        decisionHandler(.allow, preferences)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let disposition = (navigationResponse.response as? HTTPURLResponse)?
            .value(forHTTPHeaderField: "Content-Disposition")?.lowercased() ?? ""
        if !navigationResponse.canShowMIMEType || disposition.hasPrefix("attachment") {
            decisionHandler(.download)
        } else {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        pageError = nil
        if let h = webView.url?.host { customTrustedHosts[h] = nil }
        updateTrust()
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        updateTrust()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        updateTrust()
        if let u = webView.url { manager?.recordVisit(url: u, title: webView.title ?? "") }
        lastUpgrade = nil
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(400))
            self?.captureSnapshot()
        }
        manager?.scheduleSave()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if manager?.selectedTabID == id { webView.reload() } else { discardWebView() }
    }

    func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge,
                 completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        let space = challenge.protectionSpace
        guard space.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = space.serverTrust, let manager else {
            completionHandler(.performDefaultHandling, nil)
            return
        }
        let host = space.host
        let runtime = manager.runtime
        let enabled = runtime.anchors
        let known = runtime.knownAnchors
        let hasException = runtime.sessionTrustExceptions.contains(host)

        DispatchQueue.global(qos: .userInitiated).async {
            let verdict = TrustEvaluator.evaluate(serverTrust: trust, host: host, enabledAnchors: enabled, knownAnchors: known)
            let subjects = TrustEvaluator.chainSubjects(of: trust)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self.chainSubjectsByHost[host] = subjects
                    switch verdict {
                    case .systemTrusted:
                        completionHandler(.performDefaultHandling, nil)
                    case .customTrusted(let anchorID):
                        self.customTrustedHosts[host] = anchorID
                        completionHandler(.useCredential, URLCredential(trust: trust))
                        self.updateTrust()
                    case .untrusted(let would):
                        if hasException {
                            completionHandler(.useCredential, URLCredential(trust: trust))
                        } else {
                            self.pendingWouldTrust[host] = would
                            completionHandler(.performDefaultHandling, nil)
                        }
                    }
                }
            }
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }
}

// MARK: - WKDownloadDelegate

extension WebTab: WKDownloadDelegate {
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        guard let manager else { completionHandler(nil); return }
        let dest = manager.downloads.destination(for: suggestedFilename, profile: manager.profile)
        manager.downloads.track(download, profile: manager.profile, fileURL: dest)
        completionHandler(dest)
    }

    func downloadDidFinish(_ download: WKDownload) {
        manager?.downloads.finished(download)
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        manager?.downloads.failed(download, error: error)
    }
}

// MARK: - WKUIDelegate

extension WebTab: WKUIDelegate {
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let manager else { return nil }
        let tab = manager.newTab(url: nil, select: true, configuration: configuration)
        return tab.webView
    }

    func webViewDidClose(_ webView: WKWebView) {
        manager?.close(self)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard let manager else { completionHandler(); return }
        manager.present(JSDialog(host: frame.securityOrigin.host, message: message, kind: .alert) { _ in completionHandler() })
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard let manager else { completionHandler(false); return }
        manager.present(JSDialog(host: frame.securityOrigin.host, message: message, kind: .confirm) { result in
            if case .confirmed(let ok) = result { completionHandler(ok) } else { completionHandler(false) }
        })
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        guard let manager else { completionHandler(nil); return }
        manager.present(JSDialog(host: frame.securityOrigin.host, message: prompt, kind: .prompt(defaultText: defaultText ?? "")) { result in
            if case .text(let s) = result { completionHandler(s) } else { completionHandler(nil) }
        })
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(manager?.profile.settings.allowMediaCapture == true ? .prompt : .deny)
    }

    func webView(_ webView: WKWebView, requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.deny)
    }

    func webView(_ webView: WKWebView, contextMenuConfigurationForElement elementInfo: WKContextMenuElementInfo,
                 completionHandler: @escaping (UIContextMenuConfiguration?) -> Void) {
        guard let link = elementInfo.linkURL else { completionHandler(nil); return }
        // Свой preview без подгрузки страницы: ничего не утекает, пока пользователь не нажал.
        let config = UIContextMenuConfiguration(identifier: nil, previewProvider: {
            let vc = UIViewController()
            let label = UILabel()
            label.text = link.absoluteString
            label.numberOfLines = 4
            label.font = .preferredFont(forTextStyle: .footnote)
            label.textColor = .secondaryLabel
            label.translatesAutoresizingMaskIntoConstraints = false
            vc.view.addSubview(label)
            NSLayoutConstraint.activate([
                label.leadingAnchor.constraint(equalTo: vc.view.leadingAnchor, constant: 12),
                label.trailingAnchor.constraint(equalTo: vc.view.trailingAnchor, constant: -12),
                label.topAnchor.constraint(equalTo: vc.view.topAnchor, constant: 12),
                label.bottomAnchor.constraint(equalTo: vc.view.bottomAnchor, constant: -12)
            ])
            vc.preferredContentSize = CGSize(width: 280, height: 90)
            return vc
        }, actionProvider: { [weak self] _ in
            UIMenu(children: [
                UIAction(title: "Открыть в новой вкладке", image: UIImage(systemName: "plus.square.on.square")) { _ in
                    self?.manager?.newTab(url: link, select: false)
                },
                UIAction(title: "Скопировать ссылку", image: UIImage(systemName: "doc.on.doc")) { _ in
                    UIPasteboard.general.url = link
                }
            ])
        })
        completionHandler(config)
    }
}
