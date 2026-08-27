(function () {
  'use strict';

  const STORAGE_KEY = 'math-quiz-v1';
  const INTERVALS = {
    bad: 10 * 60 * 1000,
    mid: 24 * 60 * 60 * 1000,
    good: [24, 72, 168, 336].map(d => d * 24 * 60 * 60 * 1000)
  };

  const state = {
    data: null,
    screen: 'home',
    mode: null,
    queue: [],
    index: 0,
    session: { good: 0, mid: 0, bad: 0, start: Date.now() },
    subjectFilter: 'all',
    selectedChapters: new Set(),
    countLimit: 20
  };

  const $ = id => document.getElementById(id);

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveProgress(prog) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
  }

  function setCardRating(id, rating) {
    const prog = loadProgress();
    const prev = prog[id] || { streak: 0 };
    let nextReview;
    let streak = prev.streak || 0;

    if (rating === 'bad') {
      nextReview = Date.now() + INTERVALS.bad;
      streak = 0;
    } else if (rating === 'mid') {
      nextReview = Date.now() + INTERVALS.mid;
      streak = 0;
    } else {
      streak += 1;
      const idx = Math.min(streak - 1, INTERVALS.good.length - 1);
      nextReview = Date.now() + INTERVALS.good[idx];
    }

    prog[id] = {
      rating,
      streak,
      nextReview,
      lastReview: Date.now(),
      wrong: rating !== 'good'
    };
    saveProgress(prog);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function dueCards() {
    const now = Date.now();
    const prog = loadProgress();
    return state.data.cards.filter(c => {
      const p = prog[c.id];
      return p && p.nextReview <= now;
    });
  }

  function wrongCards() {
    const prog = loadProgress();
    return state.data.cards.filter(c => {
      const p = prog[c.id];
      return p && p.wrong;
    });
  }

  function subjectTitle(id) {
    const s = state.data.subjects.find(x => x.id === id);
    return s ? s.short : id;
  }

  function chapterTitle(chapterId) {
    const ch = state.data.chapters.find(x => x.id === chapterId);
    return ch ? ch.title.replace(/（.+$/, '') : '';
  }

  function readLink(card) {
    return `index.html#${card.readAnchor || 'limit'}`;
  }

  function updateBadges() {
    const due = dueCards().length;
    const wrong = wrongCards().length;
    $('badgeReview').textContent = due || '0';
    $('badgeWrong').textContent = wrong || '0';
    $('modeReview').classList.toggle('primary', due > 0);
  }

  function renderSubjectTabs() {
    const wrap = $('subjectTabs');
    const tabs = [{ id: 'all', short: '全部', count: state.data.total }]
      .concat(state.data.subjects.map(s => ({ id: s.id, short: s.short, count: s.count })));

    wrap.innerHTML = tabs.map(t => `
      <button type="button" class="subject-tab${t.id === state.subjectFilter ? ' active' : ''}"
        data-subject="${t.id}">${t.short} ${t.id === 'all' ? '' : t.count}</button>
    `).join('');
  }

  function renderHome() {
    state.screen = 'home';
    $('screenHome').classList.remove('hidden');
    $('screenPractice').classList.add('hidden');
    $('screenSummary').classList.add('hidden');
    updateBadges();
    renderSubjectTabs();
    renderChapterList();
  }

  function renderChapterList() {
    const list = $('chapterList');
    const sid = state.subjectFilter;
    const chapters = state.data.chapters.filter(ch =>
      sid === 'all' ? true : ch.subjectId === sid
    );

    const validIds = new Set(chapters.map(c => c.id));
    for (const id of [...state.selectedChapters]) {
      if (!validIds.has(id)) state.selectedChapters.delete(id);
    }
    if (state.selectedChapters.size === 0) {
      chapters.forEach(ch => state.selectedChapters.add(ch.id));
    }

    list.innerHTML = chapters.map(ch => `
      <label class="chapter-item">
        <input type="checkbox" data-ch="${ch.id}" ${state.selectedChapters.has(ch.id) ? 'checked' : ''}>
        <span>${subjectTitle(ch.subjectId)} · ${ch.title.replace(/（.+$/, '')} (${ch.count})</span>
      </label>
    `).join('');

    list.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('change', () => {
        if (inp.checked) state.selectedChapters.add(inp.dataset.ch);
        else state.selectedChapters.delete(inp.dataset.ch);
      });
    });
  }

  function buildQueue(mode) {
    let pool = [];

    if (mode === 'review') pool = dueCards();
    else if (mode === 'wrong') pool = wrongCards();
    else if (mode === 'random') {
      pool = state.data.cards.slice();
      if (state.subjectFilter !== 'all') {
        pool = pool.filter(c => c.subjectId === state.subjectFilter);
      }
    } else if (mode === 'chapter') {
      pool = state.data.cards.filter(c => state.selectedChapters.has(c.chapterId));
    }

    pool = shuffle(pool);
    const limit = state.countLimit === 0 ? pool.length : Math.min(state.countLimit, pool.length);
    return pool.slice(0, limit);
  }

  function startSession(mode) {
    state.mode = mode;
    state.queue = buildQueue(mode);
    state.index = 0;
    state.session = { good: 0, mid: 0, bad: 0, start: Date.now(), rated: [] };

    if (!state.queue.length) {
      alert(mode === 'review' ? '今日暂无待复习题目，先做章节练习吧。' :
        mode === 'wrong' ? '错题本为空，继续加油！' : '请至少选择一个章节。');
      return;
    }

    state.screen = 'practice';
    $('screenHome').classList.add('hidden');
    $('screenPractice').classList.remove('hidden');
    $('screenSummary').classList.add('hidden');
    renderQuestion();
  }

  function currentCard() {
    return state.queue[state.index];
  }

  function renderQuestion() {
    const card = currentCard();
    if (!card) {
      showSummary();
      return;
    }

    const total = state.queue.length;
    $('progressChapter').textContent =
      `${subjectTitle(card.subjectId)} · ${chapterTitle(card.chapterId)}`;
    $('progressCount').textContent = `${state.index + 1} / ${total}`;
    $('progressFill').style.width = `${(state.index / total) * 100}%`;

    const badge = $('qBadge');
    if (card.must) {
      badge.textContent = '必背';
      badge.className = 'q-badge';
      $('questionCard').className = 'question-card must';
    } else {
      badge.textContent = `#${card.num}`;
      badge.className = 'q-badge normal';
      $('questionCard').className = 'question-card';
    }

    $('qPrompt').innerHTML = card.promptHtml;
    $('answerText').textContent = card.answerText;
    $('readLink').href = readLink(card);

    $('answerPanel').classList.remove('visible');
    $('btnReveal').classList.remove('hidden');
    $('rateBar').classList.remove('visible');
    $('btnPrev').disabled = state.index === 0;
  }

  function revealAnswer() {
    $('answerPanel').classList.add('visible');
    $('btnReveal').classList.add('hidden');
    $('rateBar').classList.add('visible');
  }

  function rate(rating) {
    const card = currentCard();
    setCardRating(card.id, rating);
    state.session[rating] += 1;
    state.session.rated.push({ card, rating });
    state.index += 1;
    renderQuestion();
  }

  function showSummary() {
    state.screen = 'summary';
    $('screenPractice').classList.add('hidden');
    $('screenSummary').classList.remove('hidden');

    const total = state.session.good + state.session.mid + state.session.bad;
    $('sumTotal').textContent = total;
    $('sumGood').textContent = state.session.good;
    $('sumMid').textContent = state.session.mid;
    $('sumBad').textContent = state.session.bad;
    $('sumTime').textContent = Math.max(1, Math.round((Date.now() - state.session.start) / 60000));

    const wrongItems = state.session.rated.filter(r => r.rating !== 'good');
    if (wrongItems.length) {
      $('wrongList').innerHTML = wrongItems.map(r =>
        `<li>${subjectTitle(r.card.subjectId)} #${r.card.num} · ${r.card.prompt.replace(/_{2,}/g, '___').slice(0, 48)}…</li>`
      ).join('');
      $('wrongSection').classList.remove('hidden');
    } else {
      $('wrongSection').classList.add('hidden');
    }

    $('sumDue').textContent = dueCards().length;
    updateBadges();
  }

  function bindEvents() {
    $('btnBackHome').addEventListener('click', e => { e.preventDefault(); renderHome(); });
    $('btnBackHome2').addEventListener('click', e => { e.preventDefault(); renderHome(); });

    $('modeReview').addEventListener('click', () => startSession('review'));
    $('modeWrong').addEventListener('click', () => startSession('wrong'));
    $('modeRandom').addEventListener('click', () => startSession('random'));
    $('btnStartChapter').addEventListener('click', () => startSession('chapter'));

    $('countSelect').addEventListener('change', e => {
      state.countLimit = Number(e.target.value);
    });

    $('subjectTabs').addEventListener('click', e => {
      const tab = e.target.closest('.subject-tab');
      if (!tab) return;
      state.subjectFilter = tab.dataset.subject;
      state.selectedChapters.clear();
      renderSubjectTabs();
      renderChapterList();
    });

    $('btnReveal').addEventListener('click', revealAnswer);
    $('rateBad').addEventListener('click', () => rate('bad'));
    $('rateMid').addEventListener('click', () => rate('mid'));
    $('rateGood').addEventListener('click', () => rate('good'));

    $('btnPrev').addEventListener('click', () => {
      if (state.index > 0) {
        state.index -= 1;
        const last = state.session.rated.pop();
        if (last) state.session[last.rating] -= 1;
        renderQuestion();
        $('answerPanel').classList.add('visible');
        $('btnReveal').classList.add('hidden');
        $('rateBar').classList.add('visible');
      }
    });

    $('btnRetryWrong').addEventListener('click', () => {
      state.queue = state.session.rated.filter(r => r.rating !== 'good').map(r => r.card);
      state.index = 0;
      state.session = { good: 0, mid: 0, bad: 0, start: Date.now(), rated: [] };
      if (state.queue.length) {
        $('screenSummary').classList.add('hidden');
        $('screenPractice').classList.remove('hidden');
        renderQuestion();
      }
    });

    document.addEventListener('keydown', e => {
      if (state.screen !== 'practice') return;
      if ((e.key === ' ' || e.key === 'Enter') && !$('btnReveal').classList.contains('hidden')) {
        e.preventDefault();
        revealAnswer();
      }
      if ($('rateBar').classList.contains('visible')) {
        if (e.key === '1') rate('bad');
        if (e.key === '2') rate('mid');
        if (e.key === '3') rate('good');
      }
    });
  }

  function parseUrlParams() {
    const p = new URLSearchParams(location.search);
    const mode = p.get('mode');
    const subject = p.get('subject');
    const chapter = p.get('chapter');

    if (subject) state.subjectFilter = subject;

    if (chapter && state.data) {
      const ch = state.data.chapters.find(c =>
        c.readAnchor === chapter || c.id === chapter || c.id.endsWith(`-${chapter}`)
      );
      if (ch) {
        state.selectedChapters.clear();
        state.selectedChapters.add(ch.id);
        state.subjectFilter = ch.subjectId;
      }
    }

    if (mode === 'chapter') startSession('chapter');
    else if (mode === 'review') startSession('review');
    else if (mode === 'wrong') startSession('wrong');
  }

  async function init() {
    bindEvents();
    try {
      const res = await fetch('cards.json');
      if (!res.ok) throw new Error('cards.json not found');
      state.data = await res.json();
      $('totalCards').textContent = state.data.total;
      renderHome();
      parseUrlParams();
    } catch (err) {
      $('screenHome').innerHTML =
        `<div class="loading">加载题库失败，请先运行 <code>node scripts/build.cjs</code><br>${err.message}</div>`;
    }
  }

  init();
})();
