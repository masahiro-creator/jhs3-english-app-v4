// 学習ダッシュボード コンポーネント
// 不規則動詞・単語は「新規」「復習」という同じ2軸を持つ同じカテゴリの学習項目として扱う。
// 一番上に「動詞新規・動詞復習・単語新規・単語復習」の4ボタンを並べ、押すだけでそのセッションが
// 始まる構造にし、ストリーク・定着率・弱点克服・探索系リンクはその下に控えめに置く。
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

    const missionButton = ({ emoji, label, count, unit, onclick, disabledMessage }) => `
      <button class="option-btn" style="flex-direction: column; gap: 4px; min-height: 96px; ${count > 0 ? '' : 'opacity: 0.55;'}"
        ${count > 0 ? `onclick="${onclick}"` : 'disabled'}>
        <span style="font-size: 26px; font-weight: 800; color: var(--theme-primary);">${count}${unit}</span>
        <span style="font-size: 13px;">${emoji} ${label}</span>
      </button>
    `;

    const verbNewBtn = missionButton({
      emoji: '🆕', label: '動詞・新規', count: verbNewCount, unit: '語',
      onclick: 'window.App.startNewVerbSession()',
    });
    const verbReviewBtn = missionButton({
      emoji: '🔁', label: '動詞・復習', count: verbStats.dueCount, unit: '問',
      onclick: 'window.App.startReviewVerbSession()',
    });
    const wordNewBtn = word ? missionButton({
      emoji: '🆕', label: '単語・新規', count: word.freshCount, unit: '語',
      onclick: "window.WordDrill.startNewSession(); window.App.switchTab('words');",
    }) : '';
    const wordReviewBtn = word ? missionButton({
      emoji: '🔁', label: '単語・復習', count: word.dueCount, unit: '語',
      onclick: "window.WordDrill.startReviewSession(); window.App.switchTab('words');",
    }) : '';

    const verbPerDayButtonsHtml = [5, 10, 15, 20].map(n => `
      <button class="option-btn" style="padding: 6px 12px; min-height: 34px; font-size: 12px; background: ${verbNewPerDay === n ? 'var(--theme-btn-grad)' : 'rgba(255,255,255,0.05)'};" onclick="window.DashboardComponent.setVerbNewPerDay(${n})">
        ${n}語
      </button>
    `).join('');

    const wordPerDayButtonsHtml = word
      ? word.newPerDayOptions.map(n => `
          <button class="option-btn" style="padding: 6px 12px; min-height: 34px; font-size: 12px; background: ${word.newPerDay === n ? 'var(--theme-btn-grad)' : 'rgba(255,255,255,0.05)'};" onclick="window.DashboardComponent.setWordNewPerDay(${n})">
            ${n}語
          </button>
        `).join('')
      : '';

    container.innerHTML = `
      <div class="glass-card" style="padding: 24px 20px;">
        <h2 style="font-size: 20px; font-weight: 800; margin-bottom: 4px; text-align: center;">📖 今日の学習</h2>
        <p style="font-size: 12.5px; color: var(--theme-text-sub); margin-bottom: 18px; text-align: center;">
          動詞も単語も、新しく学ぶ／覚え直す の2つを毎日コツコツ
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          ${verbNewBtn}
          ${verbReviewBtn}
          ${wordNewBtn}
          ${wordReviewBtn}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px;">
          <div>
            <div style="font-size: 11.5px; color: var(--theme-text-sub); margin-bottom: 6px; text-align: center;">🔥 動詞：1日の新規数</div>
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">${verbPerDayButtonsHtml}</div>
          </div>
          ${word ? `
            <div>
              <div style="font-size: 11.5px; color: var(--theme-text-sub); margin-bottom: 6px; text-align: center;">📚 単語：1日の新規数</div>
              <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">${wordPerDayButtonsHtml}</div>
            </div>
          ` : '<div></div>'}
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
          ${word && word.weakCount > 0 ? `<button style="background:none; border:none; color:#f87171; font-size:13px; text-decoration:underline; cursor:pointer; padding:6px;" onclick="window.WordDrill.startWeakSession(); window.App.switchTab('words');">🎯 単語の弱点克服 (${word.weakCount}件)</button>` : ''}
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
