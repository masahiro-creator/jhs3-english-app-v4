import { shuffleArray } from "./scheduler.js";

/**
 * 4択クイズの誤答選択肢を、同じプールの他の項目からランダムに選ぶ。
 * @param {{id:string, meaning:string}[]} pool
 * @param {{id:string, meaning:string}} correctItem
 * @param {number} count
 * @param {() => number} [random]
 * @returns {{id:string, meaning:string}[]}
 */
export function pickDistractors(pool, correctItem, count, random = Math.random) {
  const candidates = pool.filter((item) => item.id !== correctItem.id && item.meaning !== correctItem.meaning);
  return shuffleArray(candidates, random).slice(0, count);
}
