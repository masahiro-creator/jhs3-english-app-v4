import { escapeHtml } from "../lib/highlight.js";

function tierFor(rate) {
  if (rate < 0.5) return { cls: "low", emoji: "🔴" };
  if (rate < 0.8) return { cls: "mid", emoji: "🟡" };
  return { cls: "high", emoji: "🟢" };
}

/**
 * @param {{stats: {category:string, correct:number, seen:number, rate:number}[]}} props
 */
export function renderStatsScreen({ stats }) {
  const rowsHtml = stats.length
    ? `<table>${stats
        .map((s) => {
          const pct = Math.round(s.rate * 100);
          const tier = tierFor(s.rate);
          return `
        <tr>
          <td>${escapeHtml(s.category)}<div class="bar"><i class="${tier.cls}" style="width:${pct}%"></i></div></td>
          <td class="r"><span class="stat-emoji">${tier.emoji}</span>${pct}%<br><span style="font-size:11px; font-weight:400; color:var(--ink-soft)">${s.correct}/${s.seen}</span></td>
        </tr>`;
        })
        .join("")}</table>`
    : `<div class="empty-state"><span class="emoji">📈</span><p class="meta" style="margin:0">まだ記録がないよ。何問か解くとここに出てくるよ。</p></div>`;

  return `
    <h1>📊 分野ごとの成績</h1>
    <p class="sub">正答率の低い順に並んでいるよ。上にあるものから手を入れると効率がいいよ。</p>
    <div class="card">${rowsHtml}</div>
    <div class="foot"><button class="link" data-action="go-home">◀ ホームに戻る</button></div>
  `;
}
