import Foundation
import WebKit

/// JS, который внедряется до загрузки страницы и сглаживает отпечаток.
/// Честно: это НЕ анти-детект уровня Octo. Движок всегда WebKit, TLS-отпечаток всегда Apple.
/// Скрипты лишь делают canvas/audio/WebGL-хэши уникальными для профиля и режут WebRTC/геолокацию.
enum FingerprintScripts {
    static func userScripts(for profile: BrowserProfile) -> [WKUserScript] {
        var scripts: [WKUserScript] = []
        let s = profile.settings

        if s.fingerprintProtection || s.blockWebRTC || !s.languageOverride.isEmpty || !s.timeZoneOverride.isEmpty {
            let src = build(profile: profile)
            scripts.append(WKUserScript(source: src, injectionTime: .atDocumentStart, forMainFrameOnly: false, in: .page))
        }
        if !s.allowGeolocation {
            scripts.append(WKUserScript(source: geolocationDeny, injectionTime: .atDocumentStart, forMainFrameOnly: false, in: .page))
        }
        return scripts
    }

    private static func seed(for profile: BrowserProfile) -> UInt32 {
        profile.id.uuidString.utf8.reduce(UInt32(5381)) { ($0 &<< 5) &+ $0 &+ UInt32($1) }
    }

    private static func build(profile: BrowserProfile) -> String {
        let s = profile.settings
        let seed = seed(for: profile)
        let cores = [2, 4, 6, 8][Int(seed % 4)]
        let tz = TimeZone(identifier: s.timeZoneOverride)
        let tzOffsetMinutes = tz.map { -$0.secondsFromGMT() / 60 } ?? 0
        let lang = s.languageOverride.replacingOccurrences(of: "'", with: "")
        let tzName = (tz?.identifier ?? "").replacingOccurrences(of: "'", with: "")

        return template
            .replacingOccurrences(of: "__SEED__", with: "\(seed)")
            .replacingOccurrences(of: "__CORES__", with: "\(cores)")
            .replacingOccurrences(of: "__FP__", with: s.fingerprintProtection ? "true" : "false")
            .replacingOccurrences(of: "__WEBRTC__", with: s.blockWebRTC ? "true" : "false")
            .replacingOccurrences(of: "__LANG__", with: lang)
            .replacingOccurrences(of: "__TZ__", with: tzName)
            .replacingOccurrences(of: "__TZOFF__", with: "\(tzOffsetMinutes)")
    }

    private static let template = #"""
    (function () {
      'use strict';
      var seed = __SEED__ >>> 0;
      function rnd() {
        seed = (seed + 0x6D2B79F5) >>> 0;
        var t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      function define(obj, prop, value) {
        try { Object.defineProperty(obj, prop, { get: function () { return value; }, configurable: true }); } catch (e) {}
      }

      if (__FP__) {
        define(Navigator.prototype, 'hardwareConcurrency', __CORES__);

        var noise = function (data) {
          for (var i = 0; i < data.length; i += 4 * 101) {
            var n = (rnd() * 3 | 0) - 1;
            var v = data[i] + n;
            data[i] = v < 0 ? 0 : (v > 255 ? 255 : v);
          }
        };
        var C2D = CanvasRenderingContext2D.prototype;
        var origGetImageData = C2D.getImageData;
        C2D.getImageData = function () {
          var img = origGetImageData.apply(this, arguments);
          try { noise(img.data); } catch (e) {}
          return img;
        };
        var HC = HTMLCanvasElement.prototype;
        var salt = function (canvas) {
          try {
            var ctx = canvas.getContext('2d');
            if (ctx && canvas.width > 0 && canvas.height > 0) {
              var img = origGetImageData.call(ctx, 0, 0, canvas.width, canvas.height);
              noise(img.data);
              ctx.putImageData(img, 0, 0);
            }
          } catch (e) {}
        };
        var origToDataURL = HC.toDataURL;
        HC.toDataURL = function () { salt(this); return origToDataURL.apply(this, arguments); };
        var origToBlob = HC.toBlob;
        HC.toBlob = function () { salt(this); return origToBlob.apply(this, arguments); };

        [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(function (ctor) {
          if (!ctor) return;
          var p = ctor.prototype, orig = p.getParameter;
          p.getParameter = function (param) {
            if (param === 37445) return 'Apple Inc.';
            if (param === 37446) return 'Apple GPU';
            return orig.call(this, param);
          };
        });

        if (window.AudioBuffer) {
          var origGCD = AudioBuffer.prototype.getChannelData;
          AudioBuffer.prototype.getChannelData = function () {
            var d = origGCD.apply(this, arguments);
            if (d && !d.__veil) {
              for (var i = 0; i < d.length; i += 97) d[i] = d[i] + (rnd() - 0.5) * 1e-7;
              try { Object.defineProperty(d, '__veil', { value: true }); } catch (e) {}
            }
            return d;
          };
        }
      }

      if (__WEBRTC__) {
        ['RTCPeerConnection', 'webkitRTCPeerConnection', 'RTCDataChannel', 'RTCSessionDescription', 'RTCIceCandidate']
          .forEach(function (n) { try { Object.defineProperty(window, n, { value: undefined, configurable: true }); } catch (e) {} });
        if (navigator.mediaDevices) {
          try { navigator.mediaDevices.enumerateDevices = function () { return Promise.resolve([]); }; } catch (e) {}
        }
      }

      var lang = '__LANG__';
      if (lang) {
        define(Navigator.prototype, 'language', lang);
        define(Navigator.prototype, 'languages', Object.freeze([lang, lang.split('-')[0]]));
      }

      var tz = '__TZ__';
      if (tz) {
        var off = __TZOFF__;
        Date.prototype.getTimezoneOffset = function () { return off; };
        var origRO = Intl.DateTimeFormat.prototype.resolvedOptions;
        Intl.DateTimeFormat.prototype.resolvedOptions = function () {
          var o = origRO.call(this);
          o.timeZone = tz;
          return o;
        };
      }
    })();
    """#

    private static let geolocationDeny = #"""
    (function () {
      if (!navigator.geolocation) return;
      var deny = function (ok, err) {
        if (typeof err === 'function') {
          setTimeout(function () { err({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1 }); }, 0);
        }
      };
      try {
        Object.defineProperty(navigator, 'geolocation', {
          value: { getCurrentPosition: deny, watchPosition: function (ok, err) { deny(ok, err); return 0; }, clearWatch: function () {} },
          configurable: true
        });
      } catch (e) {}
    })();
    """#
}
