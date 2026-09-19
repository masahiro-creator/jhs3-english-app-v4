// アプリ統合コントローラー
window.App = {
  currentTab: 'dashboard',
  srsSessionQueue: [],
  srsCurrentIndex: 0,

  init() {
    console.log('JHS 3rd Grade English Exam App Initializing...');

    // 9色推しカラーテーマピッカー初期化
    window.ThemeManager.init('theme-picker-container');

    // 応援メッセージ初期表示
    const initialMsg = window.CheeringEngine.getRandomMessage();
    window.CheeringEngine.showCustomMessage(initialMsg);

    // 各コンポーネント初期化
    window.VerbSectionComponent.init('tab-verbs');
    // 「単語」タブは js/worddrill/entry.js が独自にShadow DOMへマウントする（v3移植の単語ドリル）

    // 発音速度ボタンの選択状態を、保存されている設定に同期
    this.syncSpeedButtons();

    // 初期タブ表示
    this.switchTab('dashboard');
  },

  /**
   * ヘッダーの発音速度ボタンの見た目を現在の設定に合わせる
   * （不規則動詞・単語ドリル共通の設定）
   */
  syncSpeedButtons() {
    document.querySelectorAll('#speed-btn-group .speed-btn').forEach(btn => {
      const isActive = Number(btn.dataset.rate) === window.AudioEngine.speechRate;
      btn.style.background = isActive ? 'var(--theme-btn-grad)' : 'transparent';
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // ナビゲーションタブの更新
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });

    // タブコンテンツの表示切替
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    // タブごとのレンダリング
    if (tabId === 'dashboard') {
      window.DashboardComponent.render('tab-dashboard');
    } else if (tabId === 'weak') {
      window.WeakSectionComponent.render('tab-weak');
    } else if (tabId === 'verbs') {
      window.VerbSectionComponent.render('tab-verbs');
    } else if (tabId === 'stats') {
      window.StatsViewComponent.render('tab-stats');
    } else if (tabId === 'graph') {
      window.GraphViewComponent.render('tab-graph');
    }
  },

  /**
   * 今日復習すべき（学習済みで期限が来た）動詞のセッションを開始
   */
  startReviewVerbSession() {
    const verbs = window.IRREGULAR_VERBS || [];
    const queue = window.SRSEngine.getDueItems(verbs).dueVerbs.map(v => ({ ...v, itemType: 'verb' }));
    this._beginVerbSession(queue, '今日の復習はすべて完了しています！素晴らしい集中力です！🎉');
  },

  /**
   * 今日の新規枠ぶん、まだ学習していない動詞のセッションを開始
   */
  startNewVerbSession() {
    const verbs = window.IRREGULAR_VERBS || [];
    const queue = window.SRSEngine.getNewItemsForToday(verbs).map(v => ({ ...v, itemType: 'verb' }));
    this._beginVerbSession(queue, '今日の新規動詞はすべて学習済みです！素晴らしい集中力です！🎉');
  },

  _beginVerbSession(queue, emptyMessage) {
    if (queue.length === 0) {
      alert(emptyMessage);
      return;
    }

    // キューをシャッフル
    this.srsSessionQueue = queue.sort(() => Math.random() - 0.5);
    this.srsCurrentIndex = 0;
    this.switchTab('srs');
    this.renderSRSStep();
  },

  renderSRSStep() {
    const container = document.getElementById('tab-srs');
    if (!container) return;

    if (this.srsCurrentIndex >= this.srsSessionQueue.length) {
      // セッション終了
      window.CheeringEngine.triggerConfetti();
      container.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 56px; margin-bottom: 12px;">🎉</div>
          <h2 style="font-size: 28px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">今日の復習セッション達成！</h2>
          <p style="font-size: 16px; color: var(--theme-text-sub); margin-bottom: 24px;">
            全 ${this.srsSessionQueue.length} 問の記憶更新が完了しました！エビングハウス忘却曲線を完全クリア！
          </p>
          <button class="option-btn" style="background: var(--theme-btn-grad); max-width: 260px; margin: 0 auto;" onclick="window.App.switchTab('dashboard')">
            🏠 ダッシュボードに戻る
          </button>
        </div>
      `;
      return;
    }

    const current = this.srsSessionQueue[this.srsCurrentIndex];

    // 選択肢作成
    const allList = window.IRREGULAR_VERBS;
    const options = [current];
    while (options.length < 4) {
      const rand = allList[Math.floor(Math.random() * allList.length)];
      if (!options.find(o => o.id === rand.id)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    container.innerHTML = `
      <div id="srs-card-box" class="glass-card" style="margin-bottom: 16px; text-align: center;">
        <div style="font-size: 13px; color: var(--theme-primary); font-weight: 700;">
          エビングハウス忘却曲線 復習 (${this.srsCurrentIndex + 1} / ${this.srsSessionQueue.length})
        </div>
        <h3 style="font-size: 38px; font-weight: 800; margin: 12px 0; color: var(--theme-primary);">
          ${current.present}
        </h3>
        <button class="audio-btn" style="margin: 0 auto 12px auto;" onclick="window.AudioEngine.speakVerbForms('${current.present}', '${current.past}', '${current.participle}')">🔊</button>
      </div>

      <div class="quiz-options">
        ${options.map(opt => `
          <button class="option-btn" data-id="${opt.id}" onclick="window.App.handleSRSAnswer('${opt.id}', '${current.id}')">
            ${opt.past} - ${opt.participle} (${opt.meaning})
          </button>
        `).join('')}
      </div>
    `;
  },

  handleSRSAnswer(selectedId, correctId) {
    const isCorrect = selectedId === correctId;
    window.StorageEngine.recordResult(correctId, isCorrect);

    const currentItem = this.srsSessionQueue[this.srsCurrentIndex];

    // 選択肢のボタン色制御
    const optionBtns = document.querySelectorAll('.quiz-options .option-btn');
    optionBtns.forEach(btn => {
      btn.style.pointerEvents = 'none';
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
      window.CheeringEngine.showCustomMessage('正解！記憶レベルがレベルアップしました！🔥');
      window.AudioEngine.speakVerbForms(currentItem.present, currentItem.past, currentItem.participle);
    } else {
      const srsBox = document.getElementById('srs-card-box');
      if (srsBox) {
        srsBox.classList.add('shake');
        setTimeout(() => srsBox.classList.remove('shake'), 400);
      }

      window.CheeringEngine.showCustomMessage(`正解は「${currentItem.past} - ${currentItem.participle}」でした！明日再チャレンジ！💪`);
      window.AudioEngine.speakVerbForms(currentItem.present, currentItem.past, currentItem.participle);
    }

    setTimeout(() => {
      this.srsCurrentIndex++;
      this.renderSRSStep();
    }, isCorrect ? 1300 : 2300);
  }
};

// 発音速度変更（ヘッダーのボタンから呼ばれる。不規則動詞・単語ドリル共通）
window.setSpeechRate = function (rate) {
  window.AudioEngine.setRate(rate);
  window.App.syncSpeedButtons();
};

// DOMロード完了時の初期化
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
