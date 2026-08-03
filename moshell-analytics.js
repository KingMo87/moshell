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
