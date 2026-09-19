// 不規則動詞セクション コンポーネント
window.VerbSectionComponent = {
  currentPattern: 'ALL',
  currentIndex: 0,
  isFlipped: false,
  mode: 'cards', // 'cards' | 'quiz'
  verbs: [],
  quizQueue: [],

  init(containerId) {
    this.verbs = window.IRREGULAR_VERBS || [];
    this.render(containerId);
  },

  setPattern(pattern, containerId) {
    this.currentPattern = pattern;
    this.currentIndex = 0;
    this.isFlipped = false;
    this.shuffleQuizQueue();
    this.render(containerId);
  },

  setMode(mode, containerId) {
    this.mode = mode;
    this.currentIndex = 0;
    this.isFlipped = false;
    if (mode === 'quiz') {
      this.shuffleQuizQueue();
    }
    this.render(containerId);
  },

  getFilteredVerbs() {
    if (this.currentPattern === 'ALL') return this.verbs;
    return this.verbs.filter(v => v.type === this.currentPattern);
  },

  shuffleQuizQueue() {
    const filtered = this.getFilteredVerbs();
    this.quizQueue = [...filtered].sort(() => Math.random() - 0.5);
  },

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filtered = this.getFilteredVerbs();
    const currentList = (this.mode === 'quiz') ? (this.quizQueue.length ? this.quizQueue : filtered) : filtered;
    const current = currentList[this.currentIndex] || currentList[0];

    if (!current) {
      container.innerHTML = '<div class="glass-card">対象の動詞がありません。</div>';
      return;
    }

    container.innerHTML = `
      <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
        <button class="option-btn ${this.mode === 'cards' ? 'correct' : ''}" style="padding: 10px 16px; min-height: 44px; font-size: 14px;" onclick="window.VerbSectionComponent.setMode('cards', '${containerId}')">🃏 単語カード</button>
        <button class="option-btn ${this.mode === 'quiz' ? 'correct' : ''}" style="padding: 10px 16px; min-height: 44px; font-size: 14px;" onclick="window.VerbSectionComponent.setMode('quiz', '${containerId}')">📝 4択テスト (ランダム)</button>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px;">
        ${['ALL', 'AAA', 'ABB', 'ABA', 'ABC'].map(p => `
          <button class="option-btn ${this.currentPattern === p ? 'active' : ''}" style="padding: 8px 14px; min-height: 38px; font-size: 13px; background: ${this.currentPattern === p ? 'var(--theme-btn-grad)' : 'rgba(255,255,255,0.05)'};" onclick="window.VerbSectionComponent.setPattern('${p}', '${containerId}')">
            ${p === 'ALL' ? '全パターン' : p + '型'}
          </button>
        `).join('')}
      </div>

      ${this.mode === 'cards' ? this.renderCardView(current, currentList.length, containerId) : this.renderQuizView(current, this.verbs, containerId)}
    `;

    if (this.mode === 'cards' && window.AudioEngine.autoPlay && current && !this.isFlipped) {
      setTimeout(() => {
        window.AudioEngine.speakVerbForms(current.present, current.past, current.participle);
      }, 150);
    }
  },

  renderCardView(verb, totalCount, containerId) {
    return `
      <div class="flashcard-wrapper" onclick="window.VerbSectionComponent.toggleFlip()">
        <div class="flashcard ${this.isFlipped ? 'flipped' : ''}" id="verb-flashcard">
          <!-- 表面: 3活用 (原形 - 過去形 - 過去分詞) & 意味 -->
          <div class="card-face">
            <div class="card-phonetic">【${verb.type}型】</div>
            <div class="card-word" style="font-size: 32px; margin-bottom: 8px;">${verb.present} - ${verb.past} - ${verb.participle}</div>
            <div class="card-forms" style="font-size: 15px; padding: 6px 16px; margin-bottom: 12px;">
              <span>原形: ${verb.present}</span> ➔ <span>過去: ${verb.past}</span> ➔ <span>分詞: ${verb.participle}</span>
            </div>
            <div class="card-meaning" style="font-size: 24px; margin-bottom: 10px;">${verb.meaning}</div>
            <button class="audio-btn" onclick="event.stopPropagation(); window.AudioEngine.speakVerbForms('${verb.present}', '${verb.past}', '${verb.participle}')" title="3活用連続再生">🔊</button>
            <div style="font-size: 12px; color: var(--theme-text-sub); margin-top: 10px;">タップで例文・詳細を表示</div>
          </div>
          <!-- 裏面: 意味 & 例文 -->
          <div class="card-face card-back">
            <div class="card-meaning">${verb.meaning}</div>
            <div class="card-forms">
              <span>${verb.present}</span> ➔ <span>${verb.past}</span> ➔ <span>${verb.participle}</span>
            </div>
            <div class="card-example" style="font-size: 15px; margin-top: 10px;">"${verb.example}"<br>(${verb.exampleMeaning})</div>
            <button class="audio-btn" onclick="event.stopPropagation(); window.AudioEngine.speak('${verb.example}')" title="例文再生">🔊</button>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; max-width: 540px; margin: 0 auto;">
        <button class="option-btn" style="min-width: 120px;" onclick="window.VerbSectionComponent.prev('${containerId}')">◀ 前へ</button>
        <span style="font-weight: 700; color: var(--theme-text-sub);">${this.currentIndex + 1} / ${totalCount}</span>
        <button class="option-btn" style="min-width: 120px;" onclick="window.VerbSectionComponent.next('${containerId}')">次へ ▶</button>
      </div>
    `;
  },

  renderQuizView(verb, allList, containerId) {
    const options = [verb];
    while (options.length < 4) {
      const rand = allList[Math.floor(Math.random() * allList.length)];
      if (!options.find(o => o.id === rand.id)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    return `
      <div id="quiz-card-box" class="glass-card" style="text-align: center; max-width: 600px; margin: 0 auto 20px auto;">
        <div style="font-size: 14px; color: var(--theme-primary); font-weight: 700; margin-bottom: 8px;">不規則動詞 4択クイズ</div>
        <h3 style="font-size: 32px; font-weight: 800; margin-bottom: 12px;">原形: <span style="color: var(--theme-primary);">${verb.present}</span> (${verb.meaning})</h3>
        <p style="font-size: 16px; color: var(--theme-text-sub);">正しい【過去形 ➔ 過去分詞】のペアを選んでください：</p>
        <button class="audio-btn" style="margin: 12px auto;" onclick="window.AudioEngine.speakVerbForms('${verb.present}', '${verb.past}', '${verb.participle}')">🔊</button>
      </div>

      <div class="quiz-options">
        ${options.map(opt => `
          <button class="option-btn" data-id="${opt.id}" onclick="window.VerbSectionComponent.checkAnswer('${opt.id}', '${verb.id}', '${containerId}')">
            ${opt.past} - ${opt.participle}
          </button>
        `).join('')}
      </div>
    `;
  },

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
    const card = document.getElementById('verb-flashcard');
    if (card) card.classList.toggle('flipped', this.isFlipped);

    const filtered = this.getFilteredVerbs();
    const current = filtered[this.currentIndex];
    if (window.AudioEngine.autoPlay && current) {
      if (this.isFlipped) {
        window.AudioEngine.speak(current.example);
      } else {
        window.AudioEngine.speakVerbForms(current.present, current.past, current.participle);
      }
    }
  },

  next(containerId) {
    const currentList = (this.mode === 'quiz') ? this.quizQueue : this.getFilteredVerbs();
    this.currentIndex = (this.currentIndex + 1) % currentList.length;
    this.isFlipped = false;
    this.render(containerId);
  },

  prev(containerId) {
    const currentList = (this.mode === 'quiz') ? this.quizQueue : this.getFilteredVerbs();
    this.currentIndex = (this.currentIndex - 1 + currentList.length) % currentList.length;
    this.isFlipped = false;
    this.render(containerId);
  },

  checkAnswer(selectedId, correctId, containerId) {
    const isCorrect = selectedId === correctId;
    window.StorageEngine.recordResult(correctId, isCorrect);

    // 全ボタンのスタイル制御＆正解ボタンを輝く緑色、誤答ボタンを赤色で強調
    const optionBtns = document.querySelectorAll('.quiz-options .option-btn');
    optionBtns.forEach(btn => {
      btn.style.pointerEvents = 'none'; // 連打防止
      const btnId = btn.getAttribute('data-id');
      if (btnId === correctId) {
        btn.classList.add('correct-highlight');
        btn.innerHTML = `✅ ${btn.innerHTML}`;
      } else if (btnId === selectedId && !isCorrect) {
        btn.classList.add('wrong-highlight');
        btn.innerHTML = `❌ ${btn.innerHTML}`;
      }
    });

    if (isCorrect) {
      window.CheeringEngine.triggerConfetti();
      window.CheeringEngine.showCustomMessage('正解！その調子で不規則動詞をパーフェクトにしよう！🔥');
      const selectedVerb = this.verbs.find(v => v.id === selectedId);
      if (selectedVerb) {
        window.AudioEngine.speakVerbForms(selectedVerb.present, selectedVerb.past, selectedVerb.participle);
      }
    } else {
      // 画面シェイクアニメーションで誤答をアピール！
      const quizBox = document.getElementById('quiz-card-box');
      if (quizBox) {
        quizBox.classList.add('shake');
        setTimeout(() => quizBox.classList.remove('shake'), 400);
      }

      const correctVerb = this.verbs.find(v => v.id === correctId);
      window.CheeringEngine.showCustomMessage(`正解は「${correctVerb ? correctVerb.past + ' - ' + correctVerb.participle : ''}」でした！しっかり覚えてね！💪`);
      if (correctVerb) {
        window.AudioEngine.speakVerbForms(correctVerb.present, correctVerb.past, correctVerb.participle);
      }
    }

    // 不正解の時は正解を確認できるよう2.3秒の猶予を配置
    setTimeout(() => {
      this.next(containerId);
    }, isCorrect ? 1300 : 2300);
  }
};
