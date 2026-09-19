export const CHEER_MESSAGES = [
  "今日も続けられてえらい！その調子！",
  "コツコツが一番の近道だよ。",
  "昨日の自分より、ちょっとだけ賢くなってる。",
  "焦らなくて大丈夫。1問ずつでOK。",
  "間違えた問題ほど、実は伸びしろ。",
  "今日の積み重ねが、本番の自信になるよ。",
  "休憩も大事。無理しすぎないでね。",
  "続けているあなたはもうすごい。",
];

/** 今日の日付に応じて、毎日同じメッセージが出るように決定的に1つ選ぶ。 */
export function pickCheerMessage(dateString) {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash * 31 + dateString.charCodeAt(i)) >>> 0;
  }
  return CHEER_MESSAGES[hash % CHEER_MESSAGES.length];
}
