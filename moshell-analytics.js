/* ── Reliable "fire GA4 event, then navigate" helper ─────────────────────
   Fixes the beacon-drop bug: firing gtag() immediately before
   window.location.href = url (or a native link navigation) can cut the
   request off before it leaves the browser. We block navigation for at
   most 600ms, using GA4's event_callback if it fires sooner, so the hit
   has a guaranteed chance to send. Safe to call from onclick="return ..." */
window.trackAndGo = function (eventName, params, url) {
  try {
    if (typeof gtag !== 'function') return true; // gtag missing, let link work normally

    let navigated = false;
    const go = function () {
      if (navigated) return;
      navigated = true;
      window.location.href = url;
    };

    gtag('event', eventName, Object.assign({}, params, {
      event_callback: go,
      event_timeout: 600,
    }));
    setTimeout(go, 600); // fallback in case event_callback never fires (adblock, etc.)
  } catch (e) {
    console.error('[moshell-analytics] trackAndGo failed', e);
    window.location.href = url;
  }
  return false; // caller's onclick should `return trackAndGo(...)` to cancel default nav
};

/* Fire-and-forget click tracking for CTAs that don't need nav-blocking
   (e.g. same-page anchors, or target="_blank" links where the current
   page never unloads). */
window.trackCta = function (label, params) {
  try {
    if (typeof gtag !== 'function') return;
    gtag('event', 'select_content', Object.assign({ content_type: 'cta', item_id: label }, params));
  } catch (e) {
    console.error('[moshell-analytics] trackCta failed', e);
  }
};

window.trackLessonComplete = function (lessonId) {
  try {
    if (typeof gtag !== 'function') {
      console.warn('[moshell-analytics] gtag not available');
      return;
    }

    const sessionKey = 'ms_ga_lesson_' + lessonId + '_session';
    if (sessionStorage.getItem(sessionKey)) {
      console.log('[moshell-analytics] lesson ' + lessonId + ' already tracked this session');
      return;
    }

    gtag('event', 'lesson_complete', {
      lesson_number: lessonId,
      lesson_label: 'Lesson ' + String(lessonId).padStart(2, '0'),
    });

    sessionStorage.setItem(sessionKey, '1');
    console.log('[moshell-analytics] lesson_complete event fired for lesson ' + lessonId);
  } catch (e) {
    console.error('[moshell-analytics] tracking failed', e);
  }
};
