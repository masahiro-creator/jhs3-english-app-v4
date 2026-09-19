// 学習ダッシュボード コンポーネント
// 不規則動詞・単語は「新規」「復習」という同じ2軸を持つ同じカテゴリの学習項目として扱う。
// 「🔥動詞」「📚単語」をそれぞれ枠で囲んで見分けやすくし、各枠の中に新規・復習ボタンと
// 1日の新規数設定を置く。ストリーク・定着率・弱点克服・探索系リンクはその下に控えめに置く。
window.DashboardComponent = {
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const verbs = window.IRREGULAR_VERBS || [];
    const verbStats = window.SRSEngine.getStats(verbs);
    const verbNewCount = window.SRSEngine.getNewItemsForToday(verbs).length;
    const verbNewPerDay = window.StorageEngine.getNewPerDayVerbs();
    const streak = window.StorageEngine.updateStreak();
    const verbWeakItems = window.SRSEngine.getWeakItems(verbs);
    const word = window.WordDrill ? window.WordDrill.getSummary() : null;

    const totalItems = verbStats.totalItems + (word ? word.totalCount : 0);
    const totalMastered = verbStats.masteredCount + (word ? word.masteredCount : 0);
    const retentionRate = totalItems > 0 ? Math.round((totalMastered / totalItems) * 100) : 0;

    const missionButton = ({ label, count, unit, onclick }) => `
      <button class="option-btn" style="flex-direction: column; gap: 2px; min-height: 84px; flex: 1; ${count > 0 ? '' : 'opacity: 0.55;'}"
        ${count > 0 ? `onclick="${onclick}"` : 'disabled'}>
        <span style="font-size: 24px; font-weight: 800;">${count}${unit}</span>
        <span style="font-size: 12.5px;">${label}</span>
      </button>
    `;

    const verbPerDayButtonsHtml = [5, 10, 15, 20].map(n => `
      <button class="option-btn" style="padding: 6px 10px; min-height: 32px; font-size: 12px; background: ${verbNewPerDay === n ? 'var(--theme-btn-grad)' : 'rgba(255,255,255,0.05)'};" onclick="window.DashboardComponent.setVerbNewPerDay(${n})">
        ${n}語
      </button>
    `).join('');

    const wordPerDayButtonsHtml = word
      ? word.newPerDayOptions.map(n => `
          <button class="option-btn" style="padding: 6px 10px; min-height: 32px; font-size: 12px; background: ${word.newPerDay === n ? 'var(--theme-btn-grad)' : 'rgba(255,255,255,0.05)'};" onclick="window.DashboardComponent.setWordNewPerDay(${n})">
            ${n}語
          </button>
        `).join('')
      : '';

    container.innerHTML = `
      <div class="glass-card" style="padding: 22px 18px;">
        <h2 style="font-size: 19px; font-weight: 800; margin-bottom: 4px; text-align: center;">📖 今日の学習</h2>
        <p style="font-size: 12px; color: var(--theme-text-sub); margin-bottom: 18px; text-align: center;">
          動詞も単語も、新しく学ぶ／覚え直す の2つを毎日コツコツ
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="border: 1px solid rgba(251, 146, 60, 0.4); background: rgba(251, 146, 60, 0.06); border-radius: 16px; padding: 12px;">
            <div style="font-size: 13px; font-weight: 800; margin-bottom: 8px; text-align: center; color: #fb923c;">🔥 不規則動詞</div>
            <div style="display: flex; gap: 8px;">
              ${missionButton({ label: '新規', count: verbNewCount, unit: '語', onclick: 'window.App.startNewVerbSession()' })}
              ${missionButton({ label: '復習', count: verbStats.dueCount, unit: '問', onclick: 'window.App.startReviewVerbSession()' })}
            </div>
            <div style="font-size: 11px; color: var(--theme-text-sub); margin: 10px 0 6px; text-align: center;">1日の新規数</div>
            <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">${verbPerDayButtonsHtml}</div>
          </div>

          <div style="border: 1px solid rgba(96, 165, 250, 0.4); background: rgba(96, 165, 250, 0.06); border-radius: 16px; padding: 12px;">
            <div style="font-size: 13px; font-weight: 800; margin-bottom: 8px; text-align: center; color: #60a5fa;">📚 単語</div>
            ${word ? `
              <div style="display: flex; gap: 8px;">
                ${missionButton({ label: '新規', count: word.freshCount, unit: '語', onclick: "window.App.switchTab('words'); window.WordDrill.startNewSession();" })}
                ${missionButton({ label: '復習', count: word.dueCount, unit: '語', onclick: "window.App.switchTab('words'); window.WordDrill.startReviewSession();" })}
              </div>
              <div style="font-size: 11px; color: var(--theme-text-sub); margin: 10px 0 6px; text-align: center;">1日の新規数</div>
              <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">${wordPerDayButtonsHtml}</div>
            ` : '<p style="color: var(--theme-text-sub); font-size:12px; text-align:center;">読み込み中…</p>'}
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val">🔥 ${streak}日</div>
          <div class="stat-lbl">連続学習ストリーク</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">🧠 ${retentionRate}%</div>
          <div class="stat-lbl">記憶定着率（動詞＋単語）</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">🏆 ${totalMastered}件</div>
          <div class="stat-lbl">殿堂入りマスター数（動詞＋単語）</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">🎯 ${verbWeakItems.length + (word ? word.weakCount : 0)}件</div>
          <div class="stat-lbl">弱点アイテム（動詞＋単語）</div>
        </div>
      </div>

      ${(verbWeakItems.length > 0 || (word && word.weakCount > 0)) ? `
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: -8px 0 16px;">
          ${verbWeakItems.length > 0 ? `<button style="background:none; border:none; color:#f87171; font-size:13px; text-decoration:underline; cursor:pointer; padding:6px;" onclick="window.App.switchTab('weak')">🎯 動詞の弱点克服 (${verbWeakItems.length}件)</button>` : ''}
          ${word && word.weakCount > 0 ? `<button style="background:none; border:none; color:#f87171; font-size:13px; text-decoration:underline; cursor:pointer; padding:6px;" onclick="window.App.switchTab('words'); window.WordDrill.startWeakSession();">🎯 単語の弱点克服 (${word.weakCount}件)</button>` : ''}
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="glass-card" style="cursor: pointer; padding: 16px;" onclick="window.App.switchTab('verbs')">
          <h3 style="font-size: 15px; font-weight: 800; margin-bottom: 4px;">🃏 動詞カード・4択練習</h3>
          <p style="font-size: 12.5px; color: var(--theme-text-sub);">全70語を自由に練習</p>
        </div>
        <div class="glass-card" style="cursor: pointer; padding: 16px;" onclick="window.App.switchTab('words'); window.WordDrill && window.WordDrill.goWordList();">
          <h3 style="font-size: 15px; font-weight: 800; margin-bottom: 4px;">📖 単語一覧</h3>
          <p style="font-size: 12.5px; color: var(--theme-text-sub);">全1394語を検索して確認</p>
        </div>
        <div class="glass-card" style="cursor: pointer; padding: 16px;" onclick="window.App.switchTab('stats')">
          <h3 style="font-size: 15px; font-weight: 800; margin-bottom: 4px;">📊 分野ごとの成績</h3>
          <p style="font-size: 12.5px; color: var(--theme-text-sub);">動詞＋単語まとめて確認</p>
        </div>
        <div class="glass-card" style="cursor: pointer; padding: 16px;" onclick="window.App.switchTab('graph')">
          <h3 style="font-size: 15px; font-weight: 800; margin-bottom: 4px;">📈 これまでの記録</h3>
          <p style="font-size: 12.5px; color: var(--theme-text-sub);">動詞＋単語まとめて確認</p>
        </div>
      </div>
    `;
  },

  setWordNewPerDay(value) {
    if (!window.WordDrill) return;
    window.WordDrill.setNewPerDay(value);
    this.render('tab-dashboard');
  },

  setVerbNewPerDay(value) {
    window.StorageEngine.setNewPerDayVerbs(value);
    this.render('tab-dashboard');
  }
};
