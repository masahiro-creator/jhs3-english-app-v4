/** 表示用の軽量エスケープ（自前データのみを扱うため最小限） */
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 出題画面用: "___" を空所を示す span に置き換える */
export function renderSentenceWithBlank(sentence) {
  return escapeHtml(sentence).replace("___", '<span class="blank" aria-hidden="true"></span>');
}

/**
 * 回答後の完成文用: 正解語と根拠語に <mark> でマーカーを引く。
 * @param {import('../data/questions.js').Question} question
 */
export function renderCompletedSentenceWithMarkers(question) {
  const answerWord = question.choices[question.answer];
  let html = escapeHtml(question.sentence).replace("___", `<mark>${escapeHtml(answerWord)}</mark>`);

  const clueTokens = question.clue
    .split(/[／/]/)[0]
    .split(" ")
    .map((token) => token.replace(/[（(].*$/, "").trim())
    .filter((token) => token.length > 1);

  clueTokens.forEach((token) => {
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedToken}\\b`);
    if (pattern.test(html)) {
      html = html.replace(pattern, `<mark>${escapeHtml(token)}</mark>`);
    }
  });

  return html;
}

export { escapeHtml };
