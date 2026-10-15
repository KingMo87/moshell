/* ════════════════════════════════════════════════════════════════════════
   MOSHELL — Rewards/Badges System with Gumroad Integration
   Restyled for the Field Manual theme: no emoji, square badge marks, larger
   text. Behavior, storage keys, Gumroad slugs and GA4 events are unchanged.
   ════════════════════════════════════════════════════════════════════════ */

/* One drawn icon per badge (24px grid, stroke only, colored by the badge). */
const BADGE_ICONS = {
  1:  '<path d="M4 7l5 5-5 5"/><path d="M12 18h8"/>',
  3:  '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  6:  '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c3 2.2 9 2.2 12 0v-4.5"/><path d="M22 9v6"/>',
  9:  '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M17 6l3 3"/><path d="M14.5 8.5l2 2"/>',
  14: '<path d="M3 17L2 7l6 4 4-7 4 7 6-4-1 10z"/><path d="M3 21h18"/>'
};

const BADGES = {
  1: {
    mark: '01',
    name: 'Hacker',
    title: 'First Steps',
    desc: 'You completed Lesson 1. Navigation basics unlocked.'
  },
  3: {
    mark: '03',
    name: 'Power User',
    title: 'Halfway There',
    desc: 'You mastered permissions. You are officially dangerous.'
  },
  6: {
    mark: '06',
    name: 'Linux Master',
    title: 'Beginner Complete',
    desc: 'All 6 free lessons done. You can navigate, manage files, and run processes.'
  },
  9: {
    mark: '09',
    name: 'Security Expert',
    title: 'Advanced Territory',
    desc: 'SSH keys, firewalls, encryption. You understand the infrastructure.'
  },
  14: {
    mark: '14',
    name: 'Full Stack Admin',
    title: 'Course Complete',
    desc: 'You finished the full course, Docker included. You can build and manage real servers.'
  }
};

const EMAIL_GATE_TRIGGERS = [1, 3, 6, 9, 14];

const BADGE_PRODUCT_SLUGS = {
  1: 'mjwclt',   // Lesson 1 & 3 combined badge product
  3: 'mjwclt',   // same product, both badges live here
  6: 'ywipee',   // Lesson 6 badge product
  9: 'ivllve',   // Lesson 9 badge product
  14: 'hjwwd'    // Full Stack Admin badge product (moved from Lesson 12 to Lesson 14)
};

/* ── one-time migration: the Full Stack Admin badge used to be awarded at
   Lesson 12. Anyone who already earned it keeps it under its new key. ── */
(function migrateFullStackBadge() {
  try {
    const earned = JSON.parse(localStorage.getItem('moshell-badges') || '{}');
    if (earned[12] && !earned[14]) {
      earned[14] = Object.assign({}, earned[12], { lesson: 14, migratedFrom: 12 });
      delete earned[12];
      localStorage.setItem('moshell-badges', JSON.stringify(earned));
    } else if (earned[12]) {
      delete earned[12];
      localStorage.setItem('moshell-badges', JSON.stringify(earned));
    }
  } catch (e) { /* storage blocked: nothing to migrate */ }
})();

/* ── shared styles for the three badge modals (injected once) ─────────── */
(function injectRewardStyles() {
  if (document.getElementById('moshell-rewards-style')) return;
  const css = `
    .rw-overlay{position:fixed;inset:0;background:rgba(10,11,8,.94);display:flex;align-items:center;justify-content:center;padding:1.25rem}
    .rw-box{position:relative;background:var(--surface2);border:2px solid var(--border2);padding:2.2rem 2rem 2rem;width:100%;max-width:420px;text-align:center;animation:rwUp .35s ease-out}
    .rw-box.wide{max-width:560px;text-align:left}
    .rw-mark{width:96px;height:96px;margin:0 auto 1.1rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:var(--green);color:var(--on-accent, #160d07)}
    .rw-mark svg{width:44px;height:44px}
    .rw-mark small{font-family:var(--mono);font-size:.62rem;letter-spacing:.06em;font-weight:600;line-height:1}
    .rw-mark.off{background:transparent;color:var(--text3);border:2px dashed var(--border2)}
    .rw-kicker{font-family:var(--mono);font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);margin-bottom:.35rem}
    .rw-name{font-family:var(--display, var(--sans));font-weight:700;font-size:2rem;line-height:1;text-transform:uppercase;color:var(--text);margin-bottom:.8rem}
    .rw-desc{color:var(--text2);font-size:1.05rem;line-height:1.6;margin:0 0 1.4rem}
    .rw-btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 24px;background:var(--green);color:var(--on-accent, #160d07);border:none;font-family:var(--sans);font-weight:700;font-size:1rem;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;width:100%}
    .rw-btn:hover{filter:brightness(1.1)}
    .rw-ghost{display:inline-flex;align-items:center;justify-content:center;min-height:48px;width:100%;margin-top:10px;background:transparent;border:2px solid var(--border2);color:var(--text2);font-family:var(--sans);font-size:1rem;cursor:pointer}
    .rw-ghost:hover{border-color:var(--text);color:var(--text)}
    .rw-x{position:absolute;top:12px;right:12px;width:44px;height:44px;background:transparent;border:2px solid var(--border2);color:var(--text);font-size:1.05rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .rw-x:hover{border-color:var(--text)}
    .rw-input{width:100%;min-height:50px;background:var(--bg3, var(--surface));border:2px solid var(--border2);color:var(--text);padding:0 12px;font-family:var(--mono);font-size:1rem;outline:none}
    .rw-input:focus{border-color:var(--green)}
    .rw-form{display:flex;flex-direction:column;gap:10px}
    .rw-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:1.4rem;padding-right:52px}
    .rw-head h3{font-family:var(--display, var(--sans));font-weight:700;font-size:2rem;text-transform:uppercase;color:var(--text);line-height:1;margin:0}
    .rw-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
    @media (max-width:520px){.rw-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    .rw-cell{text-align:center}
    .rw-cell .rw-mark{width:100%;max-width:88px;height:auto;aspect-ratio:1;margin-bottom:.5rem}
    .rw-cell .rw-mark svg{width:34px;height:34px}
    .rw-cell .rw-mark small{font-size:.56rem}
    .rw-cell b{display:block;font-size:.9rem;color:var(--text);line-height:1.25}
    .rw-cell span{display:block;font-family:var(--mono);font-size:.72rem;color:var(--text3);margin-top:2px}
    .rw-foot{color:var(--text2);font-size:1rem;margin-top:1.4rem;text-align:center}
    @keyframes rwUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @media (prefers-reduced-motion:reduce){.rw-box{animation:none}}`;
  const style = document.createElement('style');
  style.id = 'moshell-rewards-style';
  style.textContent = css;
  document.head.appendChild(style);
})();

function rwOverlay(id, z) {
  const old = document.getElementById(id);
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = id;
  modal.className = 'rw-overlay';
  modal.style.zIndex = z;
  // click on the dark backdrop closes the modal
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
  return modal;
}

function rwMark(lessonId, off) {
  const b = BADGES[lessonId];
  const icon = BADGE_ICONS[lessonId] || '';
  return `<div class="rw-mark${off ? ' off' : ''}" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${icon}</svg>
      <small>LESSON ${b.mark}</small></div>`;
}

window.awardBadge = function(lessonId) {
  try {
    if (!BADGES[lessonId]) return;

    let earned = JSON.parse(localStorage.getItem('moshell-badges') || '{}');
    if (earned[lessonId]) return;

    earned[lessonId] = {
      unlockedAt: new Date().toISOString(),
      lesson: lessonId
    };
    localStorage.setItem('moshell-badges', JSON.stringify(earned));
    window.updateBadgeTracker();

    showBadgeUnlock(lessonId);

    if (typeof gtag === 'function') {
      gtag('event', 'badge_earned', {
        badge_name: BADGES[lessonId].name,
        lesson_number: lessonId
      });
    }

    if (EMAIL_GATE_TRIGGERS.includes(lessonId)) {
      setTimeout(() => showEmailGate(lessonId), 1200);
    }
  } catch (e) {
    console.error('[moshell-rewards] badge award failed', e);
  }
};

function showBadgeUnlock(lessonId) {
  const badge = BADGES[lessonId];
  const modal = rwOverlay('badge-unlock-modal', 950);
  modal.innerHTML = `
    <div class="rw-box" role="dialog" aria-modal="true" aria-labelledby="rw-unlock-name">
      ${rwMark(lessonId)}
      <div class="rw-kicker">Badge unlocked · ${badge.title}</div>
      <div class="rw-name" id="rw-unlock-name">${badge.name}</div>
      <p class="rw-desc">${badge.desc}</p>
      <button type="button" class="rw-btn" onclick="document.getElementById('badge-unlock-modal').remove()">Keep going</button>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => { if (modal.isConnected) modal.remove(); }, 4000);
}

function showEmailGate(lessonId) {
  const badge = BADGES[lessonId];
  const modal = rwOverlay('email-gate-modal', 960);
  modal.innerHTML = `
    <div class="rw-box" role="dialog" aria-modal="true" aria-labelledby="rw-gate-title">
      <button type="button" class="rw-x" aria-label="Close" onclick="document.getElementById('email-gate-modal').remove()">✕</button>
      ${rwMark(lessonId)}
      <div class="rw-kicker">${badge.name}</div>
      <div class="rw-name" id="rw-gate-title">Save your badge</div>
      <p class="rw-desc">Enter your email to download this badge and get an update when new lessons come out.</p>
      <form class="rw-form" onsubmit="handleEmailSubmit(event, ${lessonId})">
        <label for="rw-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Email address</label>
        <input id="rw-email" class="rw-input" type="email" placeholder="you@example.com" required autocomplete="email">
        <button type="submit" class="rw-btn">Save badge →</button>
      </form>
      <button type="button" class="rw-ghost" onclick="document.getElementById('email-gate-modal').remove()">Maybe later</button>
    </div>`;
  document.body.appendChild(modal);
}

window.handleEmailSubmit = function(event, lessonId) {
  event.preventDefault();
  const email = event.target.querySelector('input[type=email]').value.trim();

  try {
    const slug = BADGE_PRODUCT_SLUGS[lessonId] || 'mjwclt';
    const gumroadUrl = 'https://moshell.gumroad.com/l/' + slug;
    const checkoutUrl = gumroadUrl + '?email=' + encodeURIComponent(email);

    // Use trackAndGo (moshell-analytics.js) so the email_submitted event has
    // a guaranteed chance to send before we leave the page. Falls back to a
    // plain redirect if trackAndGo is not loaded for some reason.
    if (typeof window.trackAndGo === 'function') {
      window.trackAndGo('email_submitted', { badge_trigger: lessonId }, checkoutUrl);
    } else {
      if (typeof gtag === 'function') {
        gtag('event', 'email_submitted', { badge_trigger: lessonId });
      }
      window.location.href = checkoutUrl;
    }
  } catch (e) {
    console.error('[moshell-rewards] email submit failed', e);
  }
};

window.showBadgeCollection = function() {
  let earned = {};
  try { earned = JSON.parse(localStorage.getItem('moshell-badges') || '{}'); } catch (e) {}

  const modal = rwOverlay('badge-collection-modal', 950);

  let badgesHtml = '';
  Object.keys(BADGES).forEach(id => {
    const b = BADGES[id];
    const isEarned = !!earned[id];
    badgesHtml += `
      <div class="rw-cell" aria-label="${b.name}, lesson ${id}, ${isEarned ? 'earned' : 'not earned yet'}">
        ${rwMark(id, !isEarned)}
        <b>${b.name}</b>
        <span>${isEarned ? 'Earned' : 'Finish lesson ' + id}</span>
      </div>`;
  });

  modal.innerHTML = `
    <div class="rw-box wide" role="dialog" aria-modal="true" aria-labelledby="rw-coll-title">
      <button type="button" class="rw-x" aria-label="Close" onclick="document.getElementById('badge-collection-modal').remove()">✕</button>
      <div class="rw-head"><h3 id="rw-coll-title">Your badges</h3></div>
      <div class="rw-grid">${badgesHtml}</div>
      <p class="rw-foot">Earned: ${Object.keys(earned).filter(k => BADGES[k]).length} of 5 badges</p>
    </div>`;

  document.body.appendChild(modal);
};

// Keeps the "Badges X/5" trackers (nav bar + lessons section) in sync with
// earned badges. Called on every award below, and once here on load.
window.updateBadgeTracker = function() {
  try {
    const earned = JSON.parse(localStorage.getItem('moshell-badges') || '{}');
    const count = Object.keys(earned).filter(function (k) { return BADGES[k]; }).length;
    document.querySelectorAll('.badge-tracker-count').forEach(function(el) {
      el.textContent = count;
    });
  } catch (e) {
    console.error('[moshell-rewards] badge tracker update failed', e);
  }
};

// Escape closes whichever badge modal is open
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  ['email-gate-modal', 'badge-unlock-modal', 'badge-collection-modal'].forEach(function (id) {
    const m = document.getElementById(id);
    if (m) m.remove();
  });
});

window.updateBadgeTracker();
