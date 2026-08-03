/* ════════════════════════════════════════════════════════════════════════
   MOSHELL — Analytics Helper (Fixed)
   ────────────────────────────────────────────────────────────────────────
   Fires GA4 `lesson_complete` event when a lesson is marked done.
   
   Deduplication: prevents firing the same event twice in the SAME SESSION
   (not across sessions, so returning users get tracked on their next visit).

   INSTALL:
     1. Replace your moshell-analytics.js with this file
     2. Make sure it's loaded ONCE in index.html before </body>:
        <script src="moshell-analytics.js"></script>
     3. Call trackLessonComplete(lessonId) from toggleDone()
   ════════════════════════════════════════════════════════════════════════ */

window.trackLessonComplete = function (lessonId) {
  try {
    // Check if GA4 is available
    if (typeof gtag !== 'function') {
      console.warn('[moshell-analytics] gtag not available');
      return;
    }

    // Session-only deduplication: don't fire the same event twice in one session
    const sessionKey = 'ms_ga_lesson_' + lessonId + '_session';
    if (sessionStorage.getItem(sessionKey)) {
      console.log('[moshell-analytics] lesson ' + lessonId + ' already tracked this session');
      return;
    }

    // Fire the GA4 event
    gtag('event', 'lesson_complete', {
      lesson_number: lessonId,
      lesson_label: 'Lesson ' + String(lessonId).padStart(2, '0'),
    });

    // Mark it as tracked in this session only
    sessionStorage.setItem(sessionKey, '1');
    console.log('[moshell-analytics] lesson_complete event fired for lesson ' + lessonId);
  } catch (e) {
    console.error('[moshell-analytics] tracking failed', e);
  }
};
