// これまでの記録グラフ（不規則動詞＋単語 合算） コンポーネント
window.GraphViewComponent = {
  /** 動詞のdailyLogと単語のhistoryを日付でマージする */
  mergeLogs(verbLog, wordHistory) {
    const dates = Array.from(new Set([...verbLog.map(e => e.date), ...wordHistory.map(e => e.date)])).sort();
    const verbByDate = Object.fromEntries(verbLog.map(e => [e.date, e]));
    const wordByDate = Object.fromEntries(wordHistory.map(e => [e.date, e]));
    let lastVerbMastered = 0;
    let lastWordMastered = 0;
    return dates.map(date => {
      const v = verbByDate[date];
      const w = wordByDate[date];
      if (v) lastVerbMastered = v.mastered;
      if (w) lastWordMastered = w.mastered;
      return {
        date,
        answered: (v ? v.answered : 0) + (w ? w.answered : 0),
        mastered: lastVerbMastered + lastWordMastered,
      };
    });
  },

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const verbLog = window.StorageEngine.getDailyLog();
    const wordHistory = window.WordDrill ? window.WordDrill.getHistory() : [];
    const history = this.mergeLogs(verbLog, wordHistory);

    if (history.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center; padding: 40px 20px;">
          <div style="font-size:40px; margin-bottom:10px;">🌱</div>
          <p style="color: var(--theme-text-sub);">まだ記録がないよ。何問か解くとここにグラフが出てくるよ。</p>
        </div>
        <button class="option-btn" style="background: var(--theme-btn-grad); max-width: 260px; margin: 20px auto 0; display:block;" onclick="window.App.switchTab('dashboard')">🏠 ダッシュボードに戻る</button>
      `;
      return;
    }

    const WIDTH = 320, HEIGHT = 160, PAD_L = 28, PAD_R = 10, PAD_T = 12, PAD_B = 24;
    const n = history.length;
    const plotW = WIDTH - PAD_L - PAD_R;
    const plotH = HEIGHT - PAD_T - PAD_B;
    const maxMastered = Math.max(...history.map(e => e.mastered), 1);
    const maxAnswered = Math.max(...history.map(e => e.answered), 1);
    const xFor = i => (n === 1 ? PAD_L + plotW / 2 : PAD_L + (plotW * i) / (n - 1));
    const yForMastered = v => PAD_T + plotH - (plotH * v) / maxMastered;
    const barWidth = Math.min(18, plotW / n - 4);

    const barsHtml = history
      .map((e, i) => {
        const barH = (plotH * 0.4 * e.answered) / maxAnswered;
        const x = xFor(i) - barWidth / 2;
        const y = PAD_T + plotH - barH;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="rgba(251,191,36,0.25)" stroke="#fbbf24" stroke-width="1" />`;
      })
      .join('');

    const linePoints = history.map((e, i) => `${xFor(i).toFixed(1)},${yForMastered(e.mastered).toFixed(1)}`).join(' ');
    const dotsHtml = history
      .map((e, i) => `<circle cx="${xFor(i).toFixed(1)}" cy="${yForMastered(e.mastered).toFixed(1)}" r="3" fill="var(--theme-primary)" />`)
      .join('');

    const firstLabel = history[0].date.slice(5).replace('-', '/');
    const lastLabel = history[n - 1].date.slice(5).replace('-', '/');
    const latest = history[n - 1];

    container.innerHTML = `
      <div class="glass-card">
        <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 6px;">📈 これまでの記録</h2>
        <p style="font-size: 13px; color: var(--theme-text-sub); margin-bottom: 16px;">折れ線＝定着した動詞＋単語の累計数、棒＝その日に取り組んだ数（不規則動詞＋単語）だよ。</p>
        <div class="stats-grid" style="margin-bottom: 16px;">
          <div class="stat-card"><div class="stat-val">🏅 ${latest.mastered}</div><div class="stat-lbl">定着済み（累計）</div></div>
          <div class="stat-card"><div class="stat-val">📝 ${history.reduce((s, e) => s + e.answered, 0)}</div><div class="stat-lbl">総取り組み数</div></div>
        </div>
        <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" style="width:100%; height:auto; display:block;" role="img" aria-label="これまでの記録グラフ">
          ${barsHtml}
          <polyline points="${linePoints}" fill="none" stroke="var(--theme-primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          ${dotsHtml}
        </svg>
        <div style="display:flex; justify-content:space-between; font-size:12px; color: var(--theme-text-sub); margin-top:4px;">
          <span>${firstLabel}</span><span>${lastLabel}</span>
        </div>
      </div>
      <button class="option-btn" style="background: var(--theme-btn-grad); max-width: 260px; margin: 20px auto 0; display:block;" onclick="window.App.switchTab('dashboard')">🏠 ダッシュボードに戻る</button>
    `;
  }
};
