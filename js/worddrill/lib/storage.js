import { createInitialProgress, resetDailyCountIfNeeded, todayString, NEW_PER_DAY_OPTIONS } from "./scheduler.js";

export const STORAGE_KEYS = {
  grammar: "jhs3-eigo-anaume-progress",
  words: "jhs3-eigo-anaume-progress-words",
};

/**
 * localStorage から進捗を読み込む。壊れたJSONや未知のバージョンでも
 * 例外を投げず、初期状態にフォールバックする。
 * @param {string} storageKey
 * @returns {import('./scheduler.js').Progress}
 */
export function loadProgress(storageKey) {
  let progress = createInitialProgress();
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidProgressShape(parsed)) {
        progress = {
          version: 1,
          cards: parsed.cards,
          newPerDay: NEW_PER_DAY_OPTIONS.includes(parsed.newPerDay) ? parsed.newPerDay : 10,
          day: typeof parsed.day === "string" ? parsed.day : "",
          newDoneToday: Number.isFinite(parsed.newDoneToday) ? parsed.newDoneToday : 0,
        };
      }
    }
  } catch {
    progress = createInitialProgress();
  }
  return resetDailyCountIfNeeded(progress, todayString());
}

function isValidProgressShape(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    value.version === 1 &&
    typeof value.cards === "object" &&
    value.cards !== null
  );
}

/**
 * @param {string} storageKey
 * @param {import('./scheduler.js').Progress} progress
 */
export function saveProgress(storageKey, progress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // 保存に失敗しても（プライベートブラウズ等）アプリの続行を優先する
  }
}
