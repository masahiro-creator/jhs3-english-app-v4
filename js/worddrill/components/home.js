const STAGE_LABELS = ["1日後", "3日後", "7日後", "14日後", "30日後"];

/**
 * 単語ドリルタブの概要画面。今日の復習開始・新規語数設定・弱点克服はダッシュボードに
 * 統合したため、ここでは学習の進み具合と各機能への導線のみを表示する。
 * @param {{
 *   stageCounts:number[], learnedCount:number, totalQuestions:number,
 *   deckTitle:string, deckEmoji:string, unitLabel:string, subtitle:string
 * }} props
 */
export function renderHomeScreen({
  stageCounts,
  learnedCount,
  totalQuestions,
  deckTitle,
  deckEmoji,
  unitLabel,
  subtitle,
}) {
  const stagesHtml = STAGE_LABELS.map(
    (label, i) => `
      <div class="stage ${stageCounts[i] ? "on" : ""}">
        <b>${stageCounts[i]}</b><span>${label}に復習</span>
      </div>`
  ).join("");

  return `
    <div class="hero">
      <p class="greeting">${deckEmoji} ${deckTitle}</p>
      <p class="greeting-sub">${subtitle}</p>
    </div>

    <div class="card">
      <div class="meta">🧠 覚え直しの段階（${learnedCount}/${totalQuestions}${unitLabel}を学習中）</div>
      <div class="stages">${stagesHtml}</div>
    </div>

    <p class="meta" style="text-align:center; margin-bottom:16px">🚀 今日の復習・新しい語の学習、成績・記録は「ダッシュボード」から</p>

    <div class="foot">
      <button class="link" data-action="go-wordlist">📖 単語一覧を見る</button>
    </div>
  `;
}
