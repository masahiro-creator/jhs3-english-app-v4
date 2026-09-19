const HISTORY_KEY = "jhs3-eigo-anaume-history";
const MAX_DAYS = 90;

/**
 * @typedef {Object} HistoryEntry
 * @property {string} date - "YYYY-MM-DD"
 * @property {number} answered - その日に答えた問題数（累計、全デッキ合算）
 * @property {number} mastered - その日終了時点の定着数（累計、全デッキ合算）
 */

/** @returns {HistoryEntry[]} */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) => e && typeof e.date === "string" && Number.isFinite(e.answered) && Number.isFinite(e.mastered)
    );
  } catch {
    return [];
  }
}

/** @param {HistoryEntry[]} history */
export function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_DAYS)));
  } catch {
    // 保存に失敗しても続行する
  }
}

/**
 * 今日の記録を1件分加算し、定着数を最新値に更新する。
 * @param {HistoryEntry[]} history
 * @param {string} today
 * @param {number} masteredTotal
 * @returns {HistoryEntry[]} 新しい配列
 */
export function recordAnswer(history, today, masteredTotal) {
  const idx = history.findIndex((e) => e.date === today);
  if (idx === -1) {
    return [...history, { date: today, answered: 1, mastered: masteredTotal }];
  }
  const updated = [...history];
  updated[idx] = { ...updated[idx], answered: updated[idx].answered + 1, mastered: masteredTotal };
  return updated;
}
