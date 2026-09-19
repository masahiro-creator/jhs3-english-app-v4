import { AUDIO_MANIFEST } from "../data/audioManifest.js";

const RATE_KEY = "jhs3-eigo-anaume-rate";
export const PLAYBACK_RATES = [0.75, 1, 1.25];
const DEFAULT_RATE = 1;

let audioEl = null;

// text -> {text, file} の逆引きを一度だけ作る
const manifestByText = new Map();
Object.values(AUDIO_MANIFEST).forEach((entry) => {
  if (entry && entry.text && entry.file) manifestByText.set(entry.text, entry.file);
});

/** @returns {number} */
export function loadPlaybackRate() {
  try {
    const rate = Number(localStorage.getItem(RATE_KEY));
    if (PLAYBACK_RATES.includes(rate)) return rate;
  } catch {
    // 読み込み失敗時は既定値
  }
  return DEFAULT_RATE;
}

/** @param {number} rate */
export function savePlaybackRate(rate) {
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    // 保存に失敗しても続行する
  }
}

function speakWithWebSpeech(text, rate) {
  try {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  } catch {
    // 音声再生に失敗しても学習は続けられるようにする
  }
}

/**
 * 事前生成された高品質音声があればそれを再生し、なければブラウザ内蔵の
 * Web Speech APIにフォールバックする。
 * @param {string} text
 */
export function speak(text) {
  const rate = loadPlaybackRate();
  const file = manifestByText.get(text);
  if (!file) {
    speakWithWebSpeech(text, rate);
    return;
  }
  try {
    if (!audioEl) audioEl = new Audio();
    audioEl.src = file;
    audioEl.currentTime = 0;
    audioEl.playbackRate = rate;
    audioEl.play().catch(() => speakWithWebSpeech(text, rate));
  } catch {
    speakWithWebSpeech(text, rate);
  }
}
