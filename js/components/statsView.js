// 分野ごとの成績（不規則動詞＋単語 合算） コンポーネント
window.StatsViewComponent = {
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const verbs = window.IRREGULAR_VERBS || [];
    const verbStats = window.SRSEngine.getCategoryStats(verbs).map(s => ({ ...s, kind: 'verb' }));
    const wordStats = window.WordDrill ? window.WordDrill.getCategoryStats().map(s => ({ ...s, kind: 'word' })) : [];
    const combined = [...verbStats, ...wordStats].sort((a, b) => a.rate - b.rate);

    const rowsHtml = combined.length
      ? combined.map(s => {
          const pct = Math.round(s.rate * 100);
          const color = s.rate < 0.5 ? '#ef4444' : s.rate < 0.8 ? '#fbbf24' : '#34d399';
          const icon = s.kind === 'verb' ? '🔥' : '📚';
          return `
            <div style="margin-bottom: 16px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline; font-size:14px; margin-bottom:6px;">
                <span>${icon} ${s.category}</span>
                <span style="font-weight:700; color: ${color};">${pct}%<span style="font-size:11px; color: var(--theme-text-sub); font-weight:400;"> (${s.correct}/${s.seen})</span></span>
              </div>
              <div style="height:8px; background: rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:${color};"></div>
              </div>
            </div>
          `;
        }).join('')
      : `<p style="color: var(--theme-text-sub); text-align:center; padding: 20px 0;">まだ記録がないよ。何問か解くとここに出てくるよ。</p>`;

    container.innerHTML = `
      <div class="glass-card">
        <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 6px;">📊 分野ごとの成績</h2>
        <p style="font-size: 13px; color: var(--theme-text-sub); margin-bottom: 20px;">不規則動詞（活用パターン別）と単語（分野別）をまとめて、正答率の低い順に表示しているよ。</p>
        ${rowsHtml}
      </div>
      <button class="option-btn" style="background: var(--theme-btn-grad); max-width: 260px; margin: 20px auto 0; display:block;" onclick="window.App.switchTab('dashboard')">
        🏠 ダッシュボードに戻る
      </button>
    `;
  }
};
