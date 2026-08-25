/* ════════════════════════════════════════════════════════════════════════
   MOSHELL — Rewards/Badges System with Gumroad Integration
   ════════════════════════════════════════════════════════════════════════ */

const BADGES = {
  1: { 
    icon: '🐧', 
    name: 'Hacker', 
    title: 'First Steps',
    desc: 'You completed Lesson 1 — navigation basics unlocked!' 
  },
  3: { 
    icon: '⚡', 
    name: 'Power User', 
    title: 'Halfway There',
    desc: 'You mastered permissions. You\'re officially dangerous.' 
  },
  6: { 
    icon: '🎓', 
    name: 'Linux Master', 
    title: 'Beginner Complete',
    desc: 'All 6 free lessons done. You can navigate, manage files, and run processes.' 
  },
  9: { 
    icon: '🔐', 
    name: 'Security Expert', 
    title: 'Advanced Territory',
    desc: 'SSH keys, firewalls, encryption — you understand the infrastructure.' 
  },
  12: { 
    icon: '👑', 
    name: 'Full Stack Admin', 
    title: 'Mastery Unlocked',
    desc: 'You completed all 12 lessons. You can build and manage real servers.' 
  }
};

const EMAIL_GATE_TRIGGERS = [1, 3, 6, 9, 12];

const BADGE_PRODUCT_SLUGS = {
  1: 'mjwclt',   // Lesson 1 & 3 combined badge product
  3: 'mjwclt',   // same product, both badges live here
  6: 'ywipee',   // Lesson 6 badge product
  9: 'ivllve',   // Lesson 9 badge product
  12: 'hjwwd'    // Lesson 12 badge product
};

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
  const modal = document.createElement('div');
  modal.id = 'badge-unlock-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 950;
    background: rgba(8, 12, 16, 0.95);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem;
  `;

  modal.innerHTML = `
    <div style="
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 14px;
      padding: 2.5rem;
      text-align: center;
      max-width: 360px;
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">
      <div style="font-size: 3.5rem; margin-bottom: 1rem; animation: bounce 0.6s ease-out;">
        ${badge.icon}
      </div>
      <h2 style="
        font-family: var(--sans);
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 0.5rem;
      ">
        Badge Unlocked!
      </h2>
      <div style="
        font-family: var(--sans);
        font-size: 1rem;
        color: var(--green);
        font-weight: 600;
        margin-bottom: 1rem;
        letter-spacing: 0.05em;
      ">
        ${badge.name.toUpperCase()}
      </div>
      <p style="
        color: var(--text2);
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
        line-height: 1.6;
      ">
        ${badge.desc}
      </p>
      <button onclick="document.getElementById('badge-unlock-modal').remove()" style="
        background: var(--green);
        color: #000;
        border: none;
        padding: 10px 24px;
        border-radius: 8px;
        font-weight: 700;
        font-family: var(--mono);
        font-size: 0.75rem;
        cursor: pointer;
        transition: 0.15s;
      " onmouseover="this.style.background='var(--green2)'" onmouseout="this.style.background='var(--green)'">
        Awesome!
      </button>
    </div>

    <style>
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes bounce {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(modal);
  setTimeout(() => modal.remove(), 4000);
}

function showEmailGate(lessonId) {
  const badge = BADGES[lessonId];
  const modal = document.createElement('div');
  modal.id = 'email-gate-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 960;
    background: rgba(8, 12, 16, 0.95);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem;
  `;

  modal.innerHTML = `
    <div style="
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 14px;
      padding: 2rem;
      max-width: 380px;
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    ">
      <button onclick="document.getElementById('email-gate-modal').remove()" style="
        position: absolute; top: 14px; right: 14px;
        background: var(--surface); border: 1px solid var(--border2);
        color: var(--text2); width: 28px; height: 28px;
        border-radius: 6px; font-size: 0.9rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
      ">✕</button>

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">${badge.icon}</div>
        <h3 style="
          font-family: var(--sans);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.5rem;
        ">
          Save Your Badge!
        </h3>
        <p style="color: var(--text2); font-size: 0.85rem; line-height: 1.6;">
          Enter your email to download this badge + get updates when new lessons drop.
        </p>
      </div>

      <form onsubmit="handleEmailSubmit(event, ${lessonId})" style="display: flex; flex-direction: column; gap: 10px;">
        <input type="email" placeholder="you@example.com" required style="
          background: var(--surface); border: 1px solid var(--border2);
          color: var(--text); padding: 10px 12px; border-radius: 6px;
          font-family: var(--mono); font-size: 0.85rem; outline: none;
        " />
        <button type="submit" style="
          background: var(--green); color: #000;
          border: none; padding: 10px 24px; border-radius: 6px;
          font-weight: 700; font-family: var(--mono); font-size: 0.75rem;
          cursor: pointer; transition: 0.15s;
        " onmouseover="this.style.background='var(--green2)'" onmouseout="this.style.background='var(--green)'">
          SAVE BADGE →
        </button>
      </form>

      <button onclick="document.getElementById('email-gate-modal').remove()" style="
        width: 100%; margin-top: 10px;
        background: transparent; border: 1px solid var(--border2);
        color: var(--text2); padding: 8px;
        border-radius: 6px; font-size: 0.75rem;
        cursor: pointer; font-family: var(--mono);
      ">
        Maybe later
      </button>
    </div>

    <style>
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;

  document.body.appendChild(modal);
}

window.handleEmailSubmit = function(event, lessonId) {
  event.preventDefault();
  const email = event.target[0].value.trim();
  
  try {
    const slug = BADGE_PRODUCT_SLUGS[lessonId] || 'mjwclt';
    const gumroadUrl = 'https://moshell.gumroad.com/l/' + slug;
    const checkoutUrl = gumroadUrl + '?email=' + encodeURIComponent(email);

    // Use trackAndGo (moshell-analytics.js) so the email_submitted event has
    // a guaranteed chance to send before we leave the page. Previously this
    // called gtag() then set window.location.href on the very next line,
    // which could cut the beacon off mid-flight. Falls back to a plain
    // redirect if trackAndGo isn't loaded for some reason.
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
  let earned = JSON.parse(localStorage.getItem('moshell-badges') || '{}');
  
  const modal = document.createElement('div');
  modal.id = 'badge-collection-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 950;
    background: rgba(8, 12, 16, 0.95);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem;
  `;

  let badgesHtml = '';
  Object.keys(BADGES).forEach(id => {
    const b = BADGES[id];
    const isEarned = earned[id];
    badgesHtml += `
      <div style="
        text-align: center; opacity: ${isEarned ? '1' : '0.3'};
      ">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">${b.icon}</div>
        <div style="font-size: 0.7rem; color: var(--text2); font-weight: 700;">
          ${b.name}
        </div>
      </div>
    `;
  });

  modal.innerHTML = `
    <div style="
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 14px;
      padding: 2rem;
      max-width: 500px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h3 style="font-family: var(--sans); font-size: 1.2rem; font-weight: 700; color: var(--text);">
          Your Badges
        </h3>
        <button onclick="document.getElementById('badge-collection-modal').remove()" style="
          background: none; border: none; color: var(--text2); font-size: 1.2rem;
          cursor: pointer;
        ">✕</button>
      </div>
      <div style="
        display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem;
        text-align: center;
      ">
        ${badgesHtml}
      </div>
      <p style="color: var(--text2); font-size: 0.8rem; margin-top: 1.5rem; text-align: center;">
        Earned: ${Object.keys(earned).length} / 5 badges
      </p>
    </div>
  `;

  document.body.appendChild(modal);
};

// Keeps the "🏆 X/5" trackers (nav bar + lessons section) in sync with
// earned badges. Called on every award below, and once here on load.
window.updateBadgeTracker = function() {
  try {
    const earned = JSON.parse(localStorage.getItem('moshell-badges') || '{}');
    const count = Object.keys(earned).length;
    document.querySelectorAll('.badge-tracker-count').forEach(function(el) {
      el.textContent = count;
    });
  } catch (e) {
    console.error('[moshell-rewards] badge tracker update failed', e);
  }
};

window.updateBadgeTracker();
