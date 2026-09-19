import { escapeHtml } from "../lib/highlight.js";

/**
 * 単語の意味を4択で答えるクイズ画面。
 * @param {{word: import('../data/words.js').WordItem, index:number, total:number, picked:number|null, choices:string[], correctIndex:number}} props
 */
export function renderVocabQuizScreen({ word, index, total, picked, choices, correctIndex }) {
  const progressPct = total > 0 ? Math.round((index / total) * 100) : 0;
  const answered = picked !== null;
  const isCorrect = answered && picked === correctIndex;

  const choicesHtml = choices
    .map((choice, i) => {
      let cls = "choice";
      if (answered) {
        if (i === correctIndex) cls += " correct";
        else if (i === picked) cls += " picked-wrong";
        else cls += " dim";
      }
      return `
        <button class="${cls}" type="button" data-action="pick" data-index="${i}" ${answered ? "disabled" : ""}>
          <span class="key">${i + 1}</span>${escapeHtml(choice)}
        </button>`;
    })
    .join("");

  const answerBlockHtml = !answered
    ? ""
    : `
    <div class="card answer-block" style="margin-top:14px">
      <p class="verdict ${isCorrect ? "ok" : "ng"}">${isCorrect ? "🎉 正解！" : "💡 不正解"}</p>
      <span class="point">正しい意味：${escapeHtml(word.meaning)}</span>
      <p class="en" style="margin:0 0 2px">${escapeHtml(word.example)} <button class="link" type="button" data-action="speak" data-text="${escapeHtml(word.example)}" title="音声を再生">🔊</button></p>
      <p class="jp">${escapeHtml(word.exampleMeaning)}</p>
    </div>
    ${
      isCorrect
        ? `
      <p class="meta" style="margin:16px 0 8px">この正解、意味をちゃんと知っていましたか？</p>
      <div class="row">
        <button class="btn mint" type="button" data-action="grade" data-outcome="sure">💪 ちゃんと知っていた</button>
        <button class="btn ghost" type="button" data-action="grade" data-outcome="guess">🤔 なんとなく当てた</button>
      </div>`
        : `<button class="btn" type="button" style="margin-top:16px" data-action="grade" data-outcome="miss">次へ ▶</button>`
    }
  `;

  return `
    <div class="progress"><i style="width:${progressPct}%"></i></div>
    <div class="meta" style="display:flex; justify-content:space-between; align-items:center">
      <span><span class="grade-chip g${word.grade}">中${word.grade}</span>${escapeHtml(word.category)}　${index + 1} / ${total}語</span>
      <button class="link" type="button" data-action="quit-quiz" style="padding:2px">✕ やめる</button>
    </div>
    <div class="card" style="text-align:center">
      <p class="en" style="margin:6px 0 4px; font-size:30px">${escapeHtml(word.word)}</p>
      <button class="link" type="button" data-action="speak" data-text="${escapeHtml(word.word)}" title="発音を聞く">🔊 発音を聞く</button>
    </div>
    <div id="choices">${choicesHtml}</div>
    ${!answered ? `<p class="meta" style="margin-top:14px">💭 この単語の意味は？</p>` : ""}
    ${answerBlockHtml}
  `;
}
