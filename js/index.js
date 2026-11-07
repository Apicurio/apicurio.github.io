// All ems with platform content should be styled as platform label
function fixPlatformLabels () {
  var ems = document.querySelectorAll('em');
  Array.prototype.forEach.call(ems, function (em) {
    if (em.textContent === 'macOS' || em.textContent === 'Linux' || em.textContent === 'Windows') {
      em.classList.add('platform-label');
    }
  })
}


// Override incorrect styling of string templates and colons in objects
function fixSyntaxHighlighting () {
  var sts = document.querySelectorAll('.err');
  Array.prototype.forEach.call(sts, function (st) {
    if (st.textContent === '`' || st.textContent === ':') {
      st.classList.remove('err');
    }
  })
}


// Show and hide the collapsed navigation menu on narrow viewports
function initNavToggle () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if (!toggle || !nav) {
    return;
  }
  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}


document.addEventListener('DOMContentLoaded', function () {
  fixPlatformLabels();
  fixSyntaxHighlighting();
  initNavToggle();
});


// The support chat widget is not needed to render the page, and it is served from an
// origin without an SLA. Load it on the first user interaction, or once the browser is
// idle after the page has loaded, whichever comes first.
(function () {
  var CHAT_WIDGET_URL = 'https://carnalca-apicurio-support-chat.hf.space/chat-widget.js';
  var TRIGGER_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  var loaded = false;

  function loadChatWidget () {
    if (loaded) {
      return;
    }
    loaded = true;
    TRIGGER_EVENTS.forEach(function (name) {
      window.removeEventListener(name, loadChatWidget);
    });
    var script = document.createElement('script');
    script.src = CHAT_WIDGET_URL;
    script.async = true;
    document.body.appendChild(script);
  }

  TRIGGER_EVENTS.forEach(function (name) {
    window.addEventListener(name, loadChatWidget, { once: true, passive: true });
  });

  window.addEventListener('load', function () {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadChatWidget, { timeout: 5000 });
    } else {
      setTimeout(loadChatWidget, 3000);
    }
  });
})();
