import { NEW_PER_DAY_OPTIONS } from "../lib/scheduler.js";
import { PLAYBACK_RATES } from "../lib/speech.js";

const STAGE_LABELS = ["1日後", "3日後", "7日後", "14日後", "30日後"];
const RATE_LABELS = { 0.75: "🐢 ゆっくり", 1: "✨ 標準", 1.25: "🐰 早め" };

/**
 * @param {{
 *   dueCount:number, freshCount:number, stageCounts:number[], learnedCount:number,
 *   newPerDay:number, totalQuestions:number, deckTitle:string, deckEmoji:string,
 *   unitLabel:string, subtitle:string, newUnitLabel:string, weakCount:number, hasWordList:boolean,
 *   playbackRate:number
 * }} props
 */
export function renderHomeScreen({
  dueCount,
  freshCount,
  stageCounts,
  learnedCount,
  newPerDay,
  totalQuestions,
  deckTitle,
  deckEmoji,
  unitLabel,
  subtitle,
  newUnitLabel,
  weakCount,
  hasWordList,
  playbackRate,
}) {
  const hasWork = dueCount + freshCount > 0;

  const stagesHtml = STAGE_LABELS.map(
    (label, i) => `
      <div class="stage ${stageCounts[i] ? "on" : ""}">
        <b>${stageCounts[i]}</b><span>${label}に復習</span>
      </div>`
  ).join("");

  const newPerDayHtml = NEW_PER_DAY_OPTIONS.map(
    (n) => `
      <button class="btn ${newPerDay === n ? "" : "ghost"} small" style="flex:1"
        data-action="set-new-per-day" data-value="${n}">${n}${newUnitLabel}</button>`
  ).join("");

  const rateButtonsHtml = PLAYBACK_RATES.map(
    (r) => `
      <button class="btn ${r === playbackRate ? "" : "ghost"} small" style="flex:1"
        data-action="set-rate" data-rate="${r}">${RATE_LABELS[r]}</button>`
  ).join("");

  return `
    <div class="hero">
      <p class="greeting">${deckEmoji} ${deckTitle}</p>
      <p class="greeting-sub">${subtitle}</p>
    </div>

    <div class="card">
      <div class="today">
        <div class="today-tile review">
          <span class="num">${dueCount}<small>${unitLabel}</small></span><span class="numlabel">🔁 今日の復習</span>
        </div>
        <div class="today-tile">
          <span class="num">${freshCount}<small>${unitLabel}</small></span><span class="numlabel">🎯 今日の目標語数 のこり（目標${newPerDay}${unitLabel}）</span>
        </div>
      </div>
      ${
        hasWork
          ? `<button class="btn" style="margin-top:10px" data-action="start">🚀 はじめる</button>`
          : `<div class="empty-state" style="margin-top:14px">
               <span class="emoji">🎉</span>
               <p class="meta" style="margin:0">今日の分は終わったよ！また明日会おうね。</p>
             </div>`
      }
    </div>

    <div class="card">
      <div class="meta">🧠 覚え直しの段階（${learnedCount}/${totalQuestions}${unitLabel}を学習中）</div>
      <div class="stages">${stagesHtml}</div>
    </div>

    <div class="card">
      <div class="meta" style="margin-bottom:6px">📚 1日に出す新しい${unitLabel}</div>
      <div class="row">${newPerDayHtml}</div>
    </div>

    <div class="card">
      <div class="meta" style="margin-bottom:6px">🔊 発音の速さ</div>
      <div class="row">${rateButtonsHtml}</div>
    </div>

    ${
      weakCount > 0
        ? `<div class="card">
             <div class="meta" style="margin-bottom:8px">🎯 弱点克服モード（間違えたことがある${unitLabel}：${weakCount}${unitLabel}）</div>
             <button class="btn ghost" data-action="start-weak">🎯 弱点だけ集中特訓</button>
           </div>`
        : ""
    }

    <div class="foot">
      <button class="link" data-action="go-stats">📊 分野ごとの成績を見る</button>
      ${hasWordList ? `<button class="link" data-action="go-wordlist">📖 単語一覧を見る</button>` : ""}
      <button class="link" data-action="go-graph">📈 これまでの記録を見る</button>
    </div>
  `;
}
