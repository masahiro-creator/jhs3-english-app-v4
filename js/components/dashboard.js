// 学習ダッシュボード コンポーネント
window.DashboardComponent = {
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const verbs = window.IRREGULAR_VERBS || [];

    const stats = window.SRSEngine.getStats(verbs);
    const streak = window.StorageEngine.updateStreak();
    const weakItems = window.SRSEngine.getWeakItems(verbs);
    const word = window.WordDrill ? window.WordDrill.getSummary() : null;

    const wordPerDayButtonsHtml = word
      ? word.newPerDayOptions.map(n => `
          <button class="option-btn" style="padding: 8px 14px; min-height: 38px; font-size: 13px; background: ${word.newPerDay === n ? 'var(--theme-btn-grad)' : 'rgba(255,255,255,0.05)'};" onclick="window.DashboardComponent.setWordNewPerDay(${n})">
            ${n}語
          </button>
        `).join('')
      : '';

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val">🔥 ${streak}日</div>
          <div class="stat-lbl">連続学習ストリーク</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">🧠 ${stats.retentionRate}%</div>
          <div class="stat-lbl">記憶定着率 (Level 4以上)</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">⏰ ${stats.dueCount}問</div>
          <div class="stat-lbl">今日復習すべき動詞</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">🏆 ${stats.masteredCount}語</div>
          <div class="stat-lbl">殿堂入りマスター動詞数</div>
        </div>
      </div>

      <div class="glass-card" style="text-align: center; padding: 32px 20px;">
        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; color: #ffffff;">
          忘却曲線に打ち勝つ！今日の学習ミッション
        </h2>
        <p style="font-size: 15px; color: var(--theme-text-sub); margin-bottom: 24px;">
          エビングハウスの忘却曲線に基づき、今日復習が必要な不規則動詞が <strong style="color: var(--theme-primary); font-size: 18px;">${stats.dueCount}問</strong> あります。
        </p>

        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
          <button class="option-btn" style="background: var(--theme-btn-grad); min-width: 220px; font-size: 18px;" onclick="window.App.startSRSSession()">
            ⚡ 今日の復習を開始 (${stats.dueCount})
          </button>

          ${weakItems.length > 0 ? `
            <button class="option-btn" style="background: rgba(239, 68, 68, 0.2); border-color: #ef4444; min-width: 220px; font-size: 18px;" onclick="window.App.switchTab('weak')">
              🎯 弱点克服モード (${weakItems.length}件)
            </button>
          ` : ''}
        </div>
      </div>

      ${word ? `
        <div class="glass-card" style="text-align: center; padding: 32px 20px;">
          <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; color: #ffffff;">
            📚 今日の単語ミッション
          </h2>
          <div class="stats-grid" style="margin-bottom: 20px;">
            <div class="stat-card">
              <div class="stat-val">🔁 ${word.dueCount}語</div>
              <div class="stat-lbl">今日の復習</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">🎯 ${word.freshCount}語</div>
              <div class="stat-lbl">今日の目標語数 のこり（目標${word.newPerDay}語）</div>
            </div>
          </div>

          <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px;">
            ${word.dueCount + word.freshCount > 0 ? `
              <button class="option-btn" style="background: var(--theme-btn-grad); min-width: 220px; font-size: 18px;" onclick="window.DashboardComponent.startWordSession()">
                🚀 単語ドリルを始める
              </button>
            ` : `
              <p style="font-size: 15px; color: var(--theme-text-sub); margin: 0;">🎉 今日の単語分は終わったよ！また明日会おうね。</p>
            `}

            ${word.weakCount > 0 ? `
              <button class="option-btn" style="background: rgba(239, 68, 68, 0.2); border-color: #ef4444; min-width: 220px; font-size: 18px;" onclick="window.DashboardComponent.startWordWeak()">
                🎯 単語の弱点克服 (${word.weakCount}件)
              </button>
            ` : ''}
          </div>

          <div style="font-size: 13px; color: var(--theme-text-sub); margin-bottom: 8px;">1日に出す新しい語</div>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            ${wordPerDayButtonsHtml}
          </div>
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="glass-card" style="cursor: pointer;" onclick="window.App.switchTab('verbs')">
          <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">🔥 不規則動詞デイリーマスター</h3>
          <p style="font-size: 14px; color: var(--theme-text-sub);">AAA/ABB/ABA/ABC型 全70語の活用形＆音声再生トレーニング</p>
        </div>
        <div class="glass-card" style="cursor: pointer;" onclick="window.App.switchTab('words')">
          <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">📖 単語一覧・成績・記録</h3>
          <p style="font-size: 14px; color: var(--theme-text-sub);">全1394語の一覧検索・分野別成績・これまでの記録グラフ</p>
        </div>
      </div>
    `;
  },

  startWordSession() {
    if (!window.WordDrill) return;
    window.App.switchTab('words');
    window.WordDrill.startSession();
  },

  startWordWeak() {
    if (!window.WordDrill) return;
    window.App.switchTab('words');
    window.WordDrill.startWeakSession();
  },

  setWordNewPerDay(value) {
    if (!window.WordDrill) return;
    window.WordDrill.setNewPerDay(value);
    this.render('tab-dashboard');
  }
};
