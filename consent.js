/* Tono — cookie consent banner.
 *
 * Shown only to visitors who look like they're in the EEA/UK, where the
 * ePrivacy Directive wants consent BEFORE an analytics cookie is set.
 * Google Consent Mode v2 does the authoritative work (see the inline block
 * in each page's <head>, which denies analytics_storage by region); this
 * file is the UI that lets an EEA visitor grant it.
 *
 * Two independent region checks, on purpose:
 *   - Google's `region:` list decides whether the COOKIE is allowed.
 *   - The timezone guess below decides whether the BANNER is shown.
 * Over-including here is harmless (an extra visitor gets asked); missing
 * someone is not, so the guess errs wide and fails open to showing it.
 *
 * Text follows the site's language picker: index.html sets
 * document.documentElement.lang, and a MutationObserver re-renders on change.
 * Machine-authored translations — worth a native pass.
 */
(function () {
  'use strict';

  var STORE_KEY = 'tono_consent';   // 'granted' | 'denied'
  var LANG_KEY = 'tono_lang';

  /* ---------- copy ---------- */

  var T = {
    en: {
      body: "We'd like to use Google Analytics cookies to see which pages people find useful. No ads, and we never sell data.",
      accept: 'Accept', decline: 'Decline',
      privacy: 'Privacy policy', settings: 'Cookie settings', label: 'Cookie consent'
    },
    ko: {
      body: '어떤 페이지가 도움이 되는지 확인하기 위해 Google Analytics 쿠키를 사용하고자 합니다. 광고는 없으며, 데이터를 판매하지 않습니다.',
      accept: '동의', decline: '거부',
      privacy: '개인정보처리방침', settings: '쿠키 설정', label: '쿠키 동의'
    },
    ja: {
      body: 'どのページが役に立っているかを把握するため、Google アナリティクスの Cookie を使用したいと考えています。広告はなく、データを販売することもありません。',
      accept: '同意する', decline: '拒否する',
      privacy: 'プライバシーポリシー', settings: 'Cookie 設定', label: 'Cookie の同意'
    },
    zh: {
      body: '我们希望使用 Google Analytics Cookie，以了解哪些页面对访客有帮助。我们不投放广告，也绝不出售数据。',
      accept: '接受', decline: '拒绝',
      privacy: '隐私政策', settings: 'Cookie 设置', label: 'Cookie 同意'
    },
    'zh-Hant': {
      body: '我們希望使用 Google Analytics Cookie，以了解哪些頁面對訪客有幫助。我們不投放廣告，也絕不販售資料。',
      accept: '接受', decline: '拒絕',
      privacy: '隱私權政策', settings: 'Cookie 設定', label: 'Cookie 同意'
    },
    'zh-HK': {
      body: '我哋想用 Google Analytics Cookie，睇吓邊啲頁面幫到訪客。我哋唔賣廣告，亦都唔會賣你嘅資料。',
      accept: '接受', decline: '拒絕',
      privacy: '私隱政策', settings: 'Cookie 設定', label: 'Cookie 同意'
    },
    es: {
      body: 'Nos gustaría usar cookies de Google Analytics para saber qué páginas resultan útiles. Sin publicidad y sin vender nunca tus datos.',
      accept: 'Aceptar', decline: 'Rechazar',
      privacy: 'Política de privacidad', settings: 'Configuración de cookies', label: 'Consentimiento de cookies'
    },
    fr: {
      body: 'Nous aimerions utiliser des cookies Google Analytics pour savoir quelles pages sont utiles. Pas de publicité, et vos données ne sont jamais vendues.',
      accept: 'Accepter', decline: 'Refuser',
      privacy: 'Politique de confidentialité', settings: 'Paramètres des cookies', label: 'Consentement aux cookies'
    },
    de: {
      body: 'Wir würden gerne Google-Analytics-Cookies verwenden, um zu sehen, welche Seiten hilfreich sind. Keine Werbung, und wir verkaufen niemals Daten.',
      accept: 'Akzeptieren', decline: 'Ablehnen',
      privacy: 'Datenschutzerklärung', settings: 'Cookie-Einstellungen', label: 'Cookie-Einwilligung'
    },
    vi: {
      body: 'Chúng tôi muốn dùng cookie của Google Analytics để biết trang nào hữu ích với mọi người. Không quảng cáo và không bao giờ bán dữ liệu.',
      accept: 'Đồng ý', decline: 'Từ chối',
      privacy: 'Chính sách quyền riêng tư', settings: 'Cài đặt cookie', label: 'Đồng ý cookie'
    },
    id: {
      body: 'Kami ingin menggunakan cookie Google Analytics untuk melihat halaman mana yang bermanfaat. Tanpa iklan, dan kami tidak pernah menjual data.',
      accept: 'Terima', decline: 'Tolak',
      privacy: 'Kebijakan privasi', settings: 'Pengaturan cookie', label: 'Persetujuan cookie'
    },
    th: {
      body: 'เราต้องการใช้คุกกี้ของ Google Analytics เพื่อดูว่าหน้าใดเป็นประโยชน์ เราไม่มีโฆษณาและไม่เคยขายข้อมูลของคุณ',
      accept: 'ยอมรับ', decline: 'ปฏิเสธ',
      privacy: 'นโยบายความเป็นส่วนตัว', settings: 'ตั้งค่าคุกกี้', label: 'ความยินยอมคุกกี้'
    }
  };

  function resolveLang() {
    var raw = document.documentElement.lang;
    if (!raw) { try { raw = localStorage.getItem(LANG_KEY); } catch (e) {} }
    if (!raw) raw = navigator.language || 'en';
    if (T[raw]) return raw;
    var lower = raw.toLowerCase();
    if (lower.indexOf('zh') === 0) {
      if (lower.indexOf('hk') > -1 || lower.indexOf('yue') > -1) return 'zh-HK';
      if (lower.indexOf('hant') > -1 || lower.indexOf('tw') > -1 || lower.indexOf('mo') > -1) return 'zh-Hant';
      return 'zh';
    }
    var two = lower.slice(0, 2);
    return T[two] ? two : 'en';
  }

  /* ---------- who gets asked ---------- */

  // Timezones covering the EEA + UK + Switzerland, including the EU's
  // outermost regions, which sit outside Europe/* but inside the GDPR.
  var EXTRA_TZ = {
    'Atlantic/Canary': 1, 'Atlantic/Madeira': 1, 'Atlantic/Azores': 1,
    'Atlantic/Reykjavik': 1, 'Atlantic/Faroe': 1, 'Atlantic/Jan_Mayen': 1,
    'Arctic/Longyearbyen': 1, 'Asia/Nicosia': 1, 'Asia/Famagusta': 1,
    'Indian/Reunion': 1, 'Indian/Mayotte': 1, 'America/Cayenne': 1,
    'America/Guadeloupe': 1, 'America/Martinique': 1, 'America/Miquelon': 1
  };

  function looksEuropean() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return true;                       // unknown → ask anyway
      return tz.indexOf('Europe/') === 0 || !!EXTRA_TZ[tz];
    } catch (e) {
      return true;                                // no Intl → ask anyway
    }
  }

  function stored() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }

  function remember(value) {
    try { localStorage.setItem(STORE_KEY, value); } catch (e) {}
  }

  function grant() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  function revoke() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  }

  /* ---------- styles ---------- */

  // Colours come from whichever page we're on: index.html adapts --fg/--dim,
  // privacy.html adapts --ink/--muted, and both adapt --card/--hair/--jjok.
  // The accept fill is a fixed deep indigo so white text stays legible in
  // dark mode, where --jjok lightens.
  var CSS = [
    '.tono-cc{position:fixed;left:50%;transform:translateX(-50%) translateY(0);',
    'bottom:max(16px,env(safe-area-inset-bottom));z-index:9999;',
    'width:min(680px,calc(100vw - 32px));',
    'background:var(--card,#fff);color:var(--fg,var(--ink,#14171E));',
    'border:1px solid var(--card-hair,var(--hair,rgba(20,23,30,.12)));border-radius:14px;',
    'box-shadow:0 12px 40px rgba(0,0,0,.18);padding:18px 20px;',
    'font-family:var(--sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif);',
    'font-size:14.5px;line-height:1.55;animation:tono-cc-in .28s ease-out both}',

    '@keyframes tono-cc-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}',
    'to{opacity:1;transform:translateX(-50%) translateY(0)}}',
    '@media (prefers-reduced-motion:reduce){.tono-cc{animation:none}}',

    '.tono-cc__row{display:flex;align-items:center;gap:18px;flex-wrap:wrap}',
    '.tono-cc__text{flex:1 1 320px;min-width:0;margin:0}',
    '.tono-cc__text a{color:var(--jjok,#2E4A8F);text-decoration:underline;text-underline-offset:2px}',
    '.tono-cc__actions{display:flex;gap:10px;flex:0 0 auto}',

    '.tono-cc__btn{font:inherit;font-size:14px;font-weight:600;line-height:1;',
    'padding:11px 20px;border-radius:9px;cursor:pointer;border:1px solid transparent;',
    'white-space:nowrap;-webkit-appearance:none;appearance:none}',
    '.tono-cc__btn:focus-visible{outline:2px solid var(--jjok,#2E4A8F);outline-offset:2px}',
    '.tono-cc__btn--accept{background:#2E4A8F;color:#fff}',
    '.tono-cc__btn--accept:hover{background:#21386B}',
    '.tono-cc__btn--decline{background:transparent;color:var(--fg,var(--ink,#14171E));',
    'border-color:var(--hair,rgba(20,23,30,.22))}',
    '.tono-cc__btn--decline:hover{border-color:var(--jjok,#2E4A8F)}',

    '@media (max-width:560px){',
    '.tono-cc__actions{width:100%}',
    '.tono-cc__btn{flex:1 1 0}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('tono-cc-style')) return;
    var el = document.createElement('style');
    el.id = 'tono-cc-style';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  /* ---------- banner ---------- */

  var banner = null;

  function render() {
    var t = T[resolveLang()] || T.en;
    if (banner) {
      banner.setAttribute('aria-label', t.label);
      banner.querySelector('.tono-cc__text').innerHTML =
        escapeHTML(t.body) + ' <a href="/privacy.html">' + escapeHTML(t.privacy) + '</a>';
      banner.querySelector('.tono-cc__btn--accept').textContent = t.accept;
      banner.querySelector('.tono-cc__btn--decline').textContent = t.decline;
    }
    // Footer "Cookie settings" links follow the language too.
    var links = document.querySelectorAll('[data-consent-reopen]');
    for (var i = 0; i < links.length; i++) links[i].textContent = t.settings;
  }

  function escapeHTML(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function show() {
    if (banner) return;
    injectStyles();
    banner = document.createElement('div');
    banner.className = 'tono-cc';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML =
      '<div class="tono-cc__row">' +
        '<p class="tono-cc__text"></p>' +
        '<div class="tono-cc__actions">' +
          '<button type="button" class="tono-cc__btn tono-cc__btn--decline"></button>' +
          '<button type="button" class="tono-cc__btn tono-cc__btn--accept"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector('.tono-cc__btn--accept')
      .addEventListener('click', function () { remember('granted'); grant(); hide(); });
    banner.querySelector('.tono-cc__btn--decline')
      .addEventListener('click', function () { remember('denied'); revoke(); hide(); });

    render();
  }

  function hide() {
    if (!banner) return;
    banner.parentNode.removeChild(banner);
    banner = null;
  }

  /* ---------- wire up ---------- */

  var choice = stored();

  // The inline <head> block already re-granted a stored 'granted' before the
  // first hit; this only covers a stored 'denied' outside the EEA, where the
  // region default would otherwise have allowed the cookie.
  if (choice === 'denied') revoke();

  if (!choice && looksEuropean()) show();

  // "Cookie settings" in the footer reopens the banner anywhere, so declining
  // — or changing your mind — is as easy as accepting was.
  var reopeners = document.querySelectorAll('[data-consent-reopen]');
  for (var i = 0; i < reopeners.length; i++) {
    reopeners[i].addEventListener('click', function (e) {
      e.preventDefault();
      injectStyles();
      show();
    });
  }

  render();

  // index.html's language picker sets <html lang>; re-render when it changes.
  if (window.MutationObserver) {
    new MutationObserver(render).observe(document.documentElement, {
      attributes: true, attributeFilter: ['lang']
    });
  }
})();
