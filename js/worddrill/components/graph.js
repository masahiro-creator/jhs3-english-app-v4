const WIDTH = 320;
const HEIGHT = 160;
const PAD_LEFT = 28;
const PAD_RIGHT = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/**
 * これまでの記録を折れ線（累計マスター数）＋棒（日別の取り組み数）で描画する。
 * 外部ライブラリなし、素のSVG。
 * @param {{history: import('../lib/historyLog.js').HistoryEntry[]}} props
 */
export function renderGraphScreen({ history }) {
  if (history.length === 0) {
    return `
      <div class="app-title"><button class="link" style="padding:0; font:inherit; color:inherit; text-decoration:none" data-action="go-home">◀ ホームに戻る</button></div>
      <h1>📈 これまでの記録</h1>
      <div class="card">
        <div class="empty-state">
          <span class="emoji">🌱</span>
          <p class="meta" style="margin:0">まだ記録がないよ。何問か解くとここにグラフが出てくるよ。</p>
        </div>
      </div>
      <div class="foot"><button class="link" data-action="go-home">◀ ホームに戻る</button></div>
    `;
  }

  const maxMastered = Math.max(...history.map((e) => e.mastered), 1);
  const maxAnswered = Math.max(...history.map((e) => e.answered), 1);
  const n = history.length;
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i) => (n === 1 ? PAD_LEFT + plotW / 2 : PAD_LEFT + (plotW * i) / (n - 1));
  const yForMastered = (v) => PAD_TOP + plotH - (plotH * v) / maxMastered;

  const barWidth = Math.min(18, plotW / n - 4);
  const barsHtml = history
    .map((e, i) => {
      const barH = (plotH * 0.4 * e.answered) / maxAnswered;
      const x = xFor(i) - barWidth / 2;
      const y = PAD_TOP + plotH - barH;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="var(--sun-soft, #FFF3DF)" stroke="var(--sun, #FFB648)" stroke-width="1" />`;
    })
    .join("");

  const linePoints = history.map((e, i) => `${xFor(i).toFixed(1)},${yForMastered(e.mastered).toFixed(1)}`).join(" ");
  const dotsHtml = history
    .map((e, i) => `<circle cx="${xFor(i).toFixed(1)}" cy="${yForMastered(e.mastered).toFixed(1)}" r="3" fill="#4D96FF" />`)
    .join("");

  const firstLabel = history[0].date.slice(5).replace("-", "/");
  const lastLabel = history[n - 1].date.slice(5).replace("-", "/");
  const latest = history[n - 1];

  return `
    <div class="app-title"><button class="link" style="padding:0; font:inherit; color:inherit; text-decoration:none" data-action="go-home">◀ ホームに戻る</button></div>
    <h1>📈 これまでの記録</h1>
    <p class="sub">折れ線＝定着した問題・単語の累計数、棒＝その日に取り組んだ数だよ。</p>

    <div class="card">
      <div class="today" style="margin-bottom:10px">
        <div class="today-tile review">
          <span class="num">${latest.mastered}</span><span class="numlabel">🏅 定着済み（累計）</span>
        </div>
        <div class="today-tile">
          <span class="num">${history.reduce((sum, e) => sum + e.answered, 0)}</span><span class="numlabel">📝 総取り組み数</span>
        </div>
      </div>
      <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" style="width:100%; height:auto; display:block;" role="img" aria-label="これまでの記録グラフ">
        ${barsHtml}
        <polyline points="${linePoints}" fill="none" stroke="#4D96FF" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        ${dotsHtml}
      </svg>
      <div class="meta" style="display:flex; justify-content:space-between; margin-top:2px">
        <span>${firstLabel}</span><span>${lastLabel}</span>
      </div>
    </div>

    <div class="foot"><button class="link" data-action="go-home">◀ ホームに戻る</button></div>
  `;
}
