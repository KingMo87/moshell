/* ════════════════════════════════════════════════════════════════════════
   MOSHELL — Verified Lesson (drop-in module)
   ------------------------------------------------------------------------
   Turns a FREE lesson's "Mark as Complete" self-report into a VERIFIED
   completion: the learner has to actually perform the task in the sandbox,
   and the lesson only marks done when the machine reaches the goal state.

   Wires into your real code WITHOUT editing index.html:
     • adds the missing mutating commands (mkdir, cp, mv, rm, touch, chmod)
       into your existing CMDS map → they flow through your existing runCmd()
     • keeps a small mutable file model (LAB) so end-state can be checked
     • on full completion, calls your real progress API
       (progress[id]=true; saveProgress(); renderLessons(); updateStats())
     • also fires a GA4 lesson_complete event via trackLessonComplete()
       (defined in moshell-analytics.js — load that file BEFORE this one)

   PAYWALL-SAFE: targets a free lesson only. It never unlocks lessons 7–12 —
   your lock is id-based, so completion can't bypass it.

   INSTALL (3 steps):
     1. Commit this file to your repo as  moshell-missions.js
     2. Commit moshell-analytics.js to your repo too
     3. In index.html, immediately before  </body>, add:
            <script src="moshell-analytics.js"></script>
            <script src="moshell-missions.js"></script>
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (typeof CMDS === 'undefined' || typeof runCmd === 'undefined' || typeof FS === 'undefined') {
    console.error('[moshell-missions] Sandbox globals not found. Load AFTER the inline script, before </body>.');
    return;
  }

  /* ── which lesson this verified lab completes ─────────────────────────── */
  const LESSON_ID    = 2;                       // Lesson 02 · Files & Directories (FREE)
  const LESSON_TITLE = 'Lesson 02 · verified practice';
  const FREE_LIMIT   = (typeof FREE_LESSON_LIMIT !== 'undefined') ? FREE_LESSON_LIMIT : 6;
  if (LESSON_ID > FREE_LIMIT) {
    console.warn('[moshell-missions] LESSON_ID is paywalled — verification will not unlock it. Point it at a free lesson.');
  }

  /* ── LAB: mutable files the tasks grade on (seed for this lesson) ─────── */
  function seedLab() {
    return {
      '/home/student/report.txt': { content: 'Q3 numbers\nrevenue: up\nnotes: see lab\n', mode: '644' },
      '/home/student/oldlog.txt': { content: 'old log entries\n', mode: '644' },
    };
  }
  let LAB = seedLab();

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const parentOf = p => (p === '/' ? '/' : p.slice(0, p.lastIndexOf('/')) || '/');
  const baseOf   = p => p.slice(p.lastIndexOf('/') + 1);
  function resolve(p) {
    if (!p) return cwd;
    const seed = p.startsWith('/') ? '' : cwd;
    const out = [];
    (seed + '/' + p).split('/').forEach(s => {
      if (s === '' || s === '.') return;
      if (s === '..') { out.pop(); return; }
      out.push(s);
    });
    return '/' + out.join('/');
  }
  const isFile = p => !!(LAB[p] && LAB[p].content !== undefined);
  const isDir  = p => FS[p] !== undefined;
  function addToDir(dir, name)    { FS[dir] = FS[dir] || []; if (!FS[dir].includes(name)) FS[dir].push(name); }
  function dropFromDir(dir, name) { if (FS[dir]) FS[dir] = FS[dir].filter(x => x !== name); }

  /* surface seed files in the listing so `ls` shows them */
  function syncSeed() { addToDir('/home/student', 'report.txt'); addToDir('/home/student', 'oldlog.txt'); }
  syncSeed();

  /* ── new state-mutating commands (registered into your CMDS) ──────────── */
  CMDS.mkdir = function (args, flags) {
    const p = (flags || []).includes('p');
    const name = args[args.length - 1];
    const target = resolve(name);
    if (isDir(target)) return `mkdir: cannot create directory '${name}': File exists`;
    if (!isDir(parentOf(target)) && !p) return `mkdir: cannot create directory '${name}': No such file or directory`;
    if (p) { let acc = ''; target.split('/').filter(Boolean).forEach(seg => {
               acc += '/' + seg; if (!isDir(acc)) { FS[acc] = []; addToDir(parentOf(acc), seg + '/'); } }); }
    else   { FS[target] = []; addToDir(parentOf(target), baseOf(target) + '/'); }
    return null;
  };
  CMDS.cp = function (args) {
    const src = resolve(args[0]), d0 = resolve(args[1]);
    if (!isFile(src)) return `cp: cannot stat '${args[0]}': No such file or directory`;
    const dst = isDir(d0) ? d0 + '/' + baseOf(src) : d0;     // copy into a directory
    LAB[dst] = { content: LAB[src].content, mode: LAB[src].mode };
    addToDir(parentOf(dst), baseOf(dst));
    return null;
  };
  CMDS.mv = function (args) {
    const src = resolve(args[0]), d0 = resolve(args[1]);
    if (!isFile(src)) return `mv: cannot stat '${args[0]}': No such file or directory`;
    const dst = isDir(d0) ? d0 + '/' + baseOf(src) : d0;
    LAB[dst] = LAB[src]; delete LAB[src];
    dropFromDir(parentOf(src), baseOf(src)); addToDir(parentOf(dst), baseOf(dst));
    return null;
  };
  CMDS.rm = function (args) {
    const t = resolve(args[args.length - 1]);
    if (!isFile(t)) return `rm: cannot remove '${args[0] || ''}': No such file or directory`;
    delete LAB[t]; dropFromDir(parentOf(t), baseOf(t));
    return null;
  };
  CMDS.touch = function (args) {
    const t = resolve(args[0]);
    if (!isFile(t)) { LAB[t] = { content: '', mode: '644' }; addToDir(parentOf(t), baseOf(t)); }
    return null;
  };
  CMDS.chmod = function (args) {                 // handy for a future Lesson 04 lab
    const mode = args[0], t = resolve(args[1]);
    if (!isFile(t)) return `chmod: cannot access '${args[1]}': No such file or directory`;
    if (/^[0-7]{3}$/.test(mode)) LAB[t].mode = mode;
    else if (/\+x/.test(mode))  LAB[t].mode = String(LAB[t].mode).split('').map(d => (+d | 1)).join('');
    else return `chmod: invalid mode: '${mode}'`;
    return null;
  };

  /* cat reads lab files first, else falls back to your original cat */
  const _cat = CMDS.cat;
  CMDS.cat = function (args, flags) {
    const t = resolve(args[0]);
    if (isFile(t)) return LAB[t].content.replace(/\n$/, '');
    return _cat ? _cat(args, flags) : `cat: ${args[0]}: No such file or directory`;
  };

  /* ════════════════════ TASKS — mirror Lesson 02's exercise ═══════════════ */
  const tasks = [
    {
      title: 'Create a directory',
      desc:  'Make a new directory called practice in your home folder.',
      hint:  'mkdir creates a directory:  mkdir practice',
      check: () => isDir('/home/student/practice')
    },
    {
      title: 'Copy a file into it',
      desc:  'Copy report.txt into the practice directory.',
      hint:  'cp copies a file into a directory:  cp report.txt practice/',
      check: () => { const a = LAB['/home/student/report.txt'], b = LAB['/home/student/practice/report.txt'];
                     return !!(a && b && b.content === a.content); }
    },
    {
      title: 'Rename a file',
      desc:  'Rename oldlog.txt to oldlog.bak.',
      hint:  'mv renames a file:  mv oldlog.txt oldlog.bak',
      check: () => !!LAB['/home/student/oldlog.bak'] && !LAB['/home/student/oldlog.txt']
    },
  ];
  /* ════════════════════════════════════════════════════════════════════════ */

  /* ── mark the lesson complete through YOUR real progress API ──────────── */
  function markLessonComplete() {
    try {
      if (typeof progress !== 'undefined') {
        progress[LESSON_ID] = true;
        if (typeof saveProgress === 'function') saveProgress();
      }
      if (typeof renderLessons === 'function') renderLessons();
      if (typeof updateStats === 'function') updateStats();
      if (typeof showToast === 'function') showToast('Lesson ' + String(LESSON_ID).padStart(2, '0') + ' verified complete ✓');

      // GA4 tracking — dedup'd per browser inside trackLessonComplete()
      if (typeof trackLessonComplete === 'function') trackLessonComplete(LESSON_ID);
    } catch (e) { console.error(e); }
  }

  /* ── UI panel (uses your existing theme variables) ────────────────────── */
  const css = `
    #ms-panel{margin-top:1rem;border:1px solid var(--border2);border-radius:var(--rl);
      padding:1.2rem 1.3rem;background:var(--surface)}
    #ms-panel h3{margin:0;font-size:.65rem;letter-spacing:.18em;color:var(--green);text-transform:uppercase}
    #ms-sub{font-size:.72rem;color:var(--text2);margin:.4rem 0 0}
    #ms-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin:.9rem 0 1.1rem}
    #ms-bar i{display:block;height:100%;width:0;background:var(--green);transition:width .4s}
    .ms-task{border:1px solid var(--border);border-radius:var(--r);padding:.7rem .8rem;margin-bottom:.6rem;transition:.25s}
    .ms-h{display:flex;align-items:center;gap:.6rem;font-family:var(--sans);font-weight:600;font-size:.85rem;color:var(--text)}
    .ms-box{width:17px;height:17px;border-radius:5px;border:1.5px solid var(--text3);flex:0 0 auto;
      display:grid;place-items:center;font-size:11px;color:#000;transition:.25s}
    .ms-desc{font-size:.74rem;color:var(--text2);margin:.45rem 0 0}
    .ms-hbtn{margin-top:.5rem;background:none;border:0;color:var(--text3);font:inherit;font-size:.68rem;
      cursor:pointer;text-decoration:underline;padding:0}
    .ms-hint{margin-top:.5rem;font-size:.72rem;color:var(--amber);border-left:2px solid var(--amber);
      padding-left:.6rem;display:none}
    .ms-task[data-state=active]{border-color:var(--amber)}
    .ms-task[data-state=active] .ms-h::after{content:'in progress';margin-left:auto;font-size:.58rem;
      letter-spacing:.1em;text-transform:uppercase;color:var(--amber)}
    .ms-task[data-state=done]{border-color:var(--green2)}
    .ms-task[data-state=done] .ms-box{background:var(--green);border-color:var(--green)}
    .ms-task[data-state=done] .ms-h{color:var(--green)}
    .ms-task[data-state=locked]{opacity:.4}
    .ms-task[data-state=locked] .ms-desc,.ms-task[data-state=locked] .ms-hbtn{display:none}
    .ms-task[data-state=locked] .ms-h::after{content:'locked';margin-left:auto;font-size:.58rem;
      letter-spacing:.1em;text-transform:uppercase;color:var(--text3)}
    #ms-done{border:1px solid var(--green2);border-radius:var(--r);padding:.9rem;text-align:center;
      color:var(--green);font-size:.78rem;display:none;margin-bottom:.6rem}
    #ms-reset{width:100%;background:transparent;border:1px solid var(--border2);color:var(--text3);
      font:inherit;font-size:.7rem;padding:.55rem;border-radius:var(--r);cursor:pointer}
    #ms-reset:hover{color:var(--text);border-color:var(--text2)}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'ms-panel';
  panel.innerHTML = `<h3>${LESSON_TITLE}</h3>
    <p id="ms-sub">Do these in the sandbox above. Each ticks off when the machine reaches the goal — not by clicking.</p>
    <div id="ms-bar"><i></i></div><div id="ms-list"></div>
    <div id="ms-done"><b>Verified ✓</b> — Lesson 02 marked complete by what you did, not what you clicked.</div>
    <button id="ms-reset">Reset practice files</button>`;
  const anchor = document.getElementById('sandbox-wrap');
  anchor.parentNode.insertBefore(panel, anchor.nextSibling);

  let attempts = 0, prevDone = 0;
  const firstIncomplete = () => tasks.findIndex(t => !t.check());

  function render() {
    const active = firstIncomplete();
    const list = document.getElementById('ms-list'); list.innerHTML = '';
    tasks.forEach((t, i) => {
      const done = t.check();
      const state = done ? 'done' : active === -1 ? 'done' : i < active ? 'done' : i === active ? 'active' : 'locked';
      const el = document.createElement('div');
      el.className = 'ms-task'; el.dataset.state = state;
      el.innerHTML = `<div class="ms-h"><span class="ms-box">${done ? '✓' : ''}</span>${t.title}</div>
        <div class="ms-desc">${t.desc}</div>
        <button class="ms-hbtn">Stuck? show hint</button>
        <div class="ms-hint">${t.hint}</div>`;
      const hint = el.querySelector('.ms-hint'), hbtn = el.querySelector('.ms-hbtn');
      hbtn.onclick = () => { hint.style.display = 'block'; hbtn.style.display = 'none'; };
      if (state === 'active' && attempts >= 4) { hint.style.display = 'block'; hbtn.style.display = 'none'; }
      list.appendChild(el);
    });
    const done = tasks.filter(t => t.check()).length;
    panel.querySelector('#ms-bar i').style.width = (done / tasks.length * 100) + '%';
    document.getElementById('ms-done').style.display = (done === tasks.length) ? 'block' : 'none';
  }

  function afterCommand() {
    const done = tasks.filter(t => t.check()).length;
    if (done > prevDone) {
      attempts = 0;
      if (done === tasks.length) markLessonComplete();           // ← all verified → mark Lesson 02
    } else { attempts++; }
    prevDone = done;
    render();
  }

  /* wrap runCmd so checks run after every command — no edit to your file */
  const _runCmd = runCmd;
  runCmd = function (raw) { _runCmd(raw); try { afterCommand(); } catch (e) { console.error(e); } };

  document.getElementById('ms-reset').onclick = function () {
    dropFromDir('/home/student', 'practice/'); delete FS['/home/student/practice'];
    delete FS['/home/student/practice/report.txt'];
    dropFromDir('/home/student', 'oldlog.bak');
    LAB = seedLab(); syncSeed();
    prevDone = 0; attempts = 0; render();
    if (typeof showToast === 'function') showToast('Practice files reset');
  };

  render();
  console.log('[moshell-missions] loaded — ' + tasks.length + ' verified objectives → Lesson ' + LESSON_ID);
})();
