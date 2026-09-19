/**
 * 出題ロジック（純粋関数のみ。DOM や React に依存しない）
 *
 * @typedef {Object} CardState
 * @property {0|1|2|3|4|5} box - 復習段階
 * @property {string} due - "YYYY-MM-DD" 次に出題する日
 * @property {number} seen - 出題回数
 * @property {number} correct - 正解回数
 *
 * @typedef {Object} Progress
 * @property {1} version
 * @property {Record<string, CardState>} cards - キーは Question.id
 * @property {number} newPerDay - 1日に出す新規問題数
 * @property {string} day - 最後に開いた日 "YYYY-MM-DD"
 * @property {number} newDoneToday
 */

/** box 0〜5 に対応する、次回出題までの日数 */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20];

/** @param {Date} date @returns {string} "YYYY-MM-DD" */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** @param {Date} [now] @returns {string} */
export function todayString(now = new Date()) {
  return formatDate(now);
}

/** @param {string} dateString "YYYY-MM-DD" @param {number} days @returns {string} */
export function addDaysToDateString(dateString, days) {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/** @param {number} newPerDay @returns {Progress} */
export function createInitialProgress(newPerDay = 10) {
  return { version: 1, cards: {}, newPerDay, day: "", newDoneToday: 0 };
}

/** 日付が変わっていたら newDoneToday をリセットする */
export function resetDailyCountIfNeeded(progress, today) {
  if (progress.day === today) return progress;
  return { ...progress, day: today, newDoneToday: 0 };
}

export function getDueQuestions(questions, progress, today) {
  return questions.filter((q) => {
    const card = progress.cards[q.id];
    return card !== undefined && card.due <= today;
  });
}

export function getUnseenQuestions(questions, progress) {
  return questions.filter((q) => progress.cards[q.id] === undefined);
}

export function countRemainingNewSlots(progress) {
  return Math.max(0, progress.newPerDay - progress.newDoneToday);
}

/** Fisher-Yates シャッフル。元の配列は変更しない。 */
export function shuffleArray(array, random = Math.random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 今日解くセッションを組み立てる。
 * 1. due <= today のカード（復習分）
 * 2. 未学習の問題を newPerDay - newDoneToday の数だけ（新規分）
 * 3. シャッフルして返す
 */
export function buildSession(questions, progress, today, shuffle = shuffleArray) {
  const due = getDueQuestions(questions, progress, today);
  const fresh = getUnseenQuestions(questions, progress).slice(0, countRemainingNewSlots(progress));
  return shuffle([...due, ...fresh]);
}

/**
 * 不正解のとき、同一セッションの末尾に同じ問題を積み直す。
 * @param {Array} session
 * @param {number} currentIndex
 * @param {"sure"|"guess"|"miss"} outcome
 */
export function requeueOnMiss(session, currentIndex, outcome) {
  if (outcome !== "miss") return session;
  return [...session, session[currentIndex]];
}

/**
 * 回答結果を進捗に反映する。
 * - sure（根拠が言えた正解）: box を+1（上限5）、due を該当日数後
 * - guess（なんとなく当てた）: box は据え置き、due は翌日
 * - miss（不正解）: box を0に戻し、due は当日
 * @param {Progress} progress
 * @param {string} questionId
 * @param {"sure"|"guess"|"miss"} outcome
 * @param {string} today
 * @returns {Progress}
 */
export function applyAnswer(progress, questionId, outcome, today) {
  const prevCard = progress.cards[questionId] ?? { box: 0, due: today, seen: 0, correct: 0 };
  const wasNew = progress.cards[questionId] === undefined;

  /** @type {CardState} */
  let card;
  if (outcome === "sure") {
    const nextBox = Math.min(prevCard.box + 1, 5);
    card = {
      box: nextBox,
      due: addDaysToDateString(today, REVIEW_INTERVAL_DAYS[nextBox]),
      seen: prevCard.seen + 1,
      correct: prevCard.correct + 1,
    };
  } else if (outcome === "guess") {
    card = {
      box: prevCard.box,
      due: addDaysToDateString(today, 1),
      seen: prevCard.seen + 1,
      correct: prevCard.correct + 1,
    };
  } else {
    card = { box: 0, due: today, seen: prevCard.seen + 1, correct: prevCard.correct };
  }

  return {
    ...progress,
    cards: { ...progress.cards, [questionId]: card },
    newDoneToday: wasNew ? progress.newDoneToday + 1 : progress.newDoneToday,
  };
}

/** ホーム画面の「覚え直しの段階」用: box 1〜5 それぞれの件数 */
export function computeStageCounts(progress) {
  const counts = [0, 0, 0, 0, 0];
  Object.values(progress.cards).forEach((card) => {
    if (card.box >= 1 && card.box <= 5) counts[card.box - 1]++;
  });
  return counts;
}

/** 「定着」とみなす box のしきい値（7日後の段階まで到達） */
export const MASTERED_BOX_THRESHOLD = 3;

/** 定着済み（box が しきい値以上）のカード数 */
export function computeMasteredCount(progress, threshold = MASTERED_BOX_THRESHOLD) {
  return Object.values(progress.cards).filter((card) => card.box >= threshold).length;
}

/** 分野ごとの正答率を低い順に並べる。未回答の分野は含めない。 */
export function computeCategoryStats(questions, progress) {
  const byCategory = new Map();
  questions.forEach((q) => {
    const card = progress.cards[q.id];
    if (!card || card.seen === 0) return;
    const stat = byCategory.get(q.category) ?? { correct: 0, seen: 0 };
    stat.correct += card.correct;
    stat.seen += card.seen;
    byCategory.set(q.category, stat);
  });
  return [...byCategory.entries()]
    .map(([category, stat]) => ({
      category,
      correct: stat.correct,
      seen: stat.seen,
      rate: stat.correct / stat.seen,
    }))
    .sort((a, b) => a.rate - b.rate);
}

/**
 * 誤答歴のある項目（弱点）を、誤答数の多い順に並べて返す。
 * @param {{id:string}[]} items
 * @param {Progress} progress
 * @returns {({id:string, wrongCount:number})[]}
 */
export function getWeakItems(items, progress) {
  return items
    .map((item) => {
      const card = progress.cards[item.id];
      if (!card || card.seen === 0) return null;
      const wrongCount = card.seen - card.correct;
      if (wrongCount <= 0) return null;
      return { ...item, wrongCount };
    })
    .filter((x) => x !== null)
    .sort((a, b) => b.wrongCount - a.wrongCount);
}
