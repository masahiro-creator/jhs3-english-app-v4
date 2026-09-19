/**
 * @param {{sureCount:number, guessCount:number, missCount:number}} props
 */
export function renderDoneScreen({ sureCount, guessCount, missCount }) {
  const total = sureCount + guessCount + missCount;
  return `
    <div class="empty-state">
      <span class="emoji">🎉</span>
    </div>
    <h1 style="text-align:center">今日の分は終わりだよ！</h1>
    <p class="sub" style="text-align:center">${total}問に答えたよ。お疲れさま！</p>
    <div class="card">
      <div class="done-row">
        <span><span class="dot sure"></span>💪 根拠が言えた正解</span>
        <span class="count">${sureCount}</span>
      </div>
      <div class="done-row">
        <span><span class="dot guess"></span>🤔 なんとなく当てた</span>
        <span class="count">${guessCount}</span>
      </div>
      <div class="done-row">
        <span><span class="dot miss"></span>💡 間違えた</span>
        <span class="count">${missCount}</span>
      </div>
      <p class="meta" style="margin:14px 0 0">「なんとなく当てた」問題は明日もう一度出るよ。間違えた問題は最初の段階に戻るよ。</p>
    </div>
    <button class="btn" type="button" data-action="go-home">🏠 ホームに戻る</button>
  `;
}
