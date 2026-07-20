/* ════════════════════════════════════════════════════════════════════════
   MOSHELL — Analytics helper
   ------------------------------------------------------------------------
   Fires a GA4 `lesson_complete` event once per lesson, deduped per browser
   using localStorage so repeat toggles/reloads don't inflate the count.

   INSTALL:
     1. Commit this file to your repo as  moshell-analytics.js
        (same folder as index.html)
     2. In index.html, load it BEFORE moshell-missions.js, right before
        </body>:
            <script src="moshell-analytics.js"></script>
            <script src="moshell-missions.js"></script>
     3. Call  trackLessonComplete(lessonId)  from wherever a lesson is
        marked done — e.g. inside toggleDone() in index.html, and inside
        markLessonComplete() in moshell-missions.js.
   ════════════════════════════════════════════════════════════════════════ */
window.trackLessonComplete = function (lessonId) {
  try {
    const gaKey = 'ms_ga_lesson_' + lessonId;
    if (localStorage.getItem(gaKey)) return;   // already tracked this lesson — skip
    if (typeof gtag !== 'function') return;    // GA4 not loaded on this page — skip

    gtag('event', 'lesson_complete', {
      lesson_number: lessonId,
      lesson_label: 'Lesson ' + String(lessonId).padStart(2, '0'),
    });

    localStorage.setItem(gaKey, '1');
  } catch (e) {
    console.error('[moshell-analytics] tracking failed', e);
  }
};
