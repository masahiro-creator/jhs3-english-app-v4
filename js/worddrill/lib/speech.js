import { AUDIO_MANIFEST } from "../data/audioManifest.js";

let audioEl = null;

// text -> file の逆引きを一度だけ作る
const manifestByText = new Map();
Object.values(AUDIO_MANIFEST).forEach((entry) => {
  if (entry && entry.text && entry.file) manifestByText.set(entry.text, entry.file);
});

// 発音速度はアプリ全体（不規則動詞・単語ドリル共通）でヘッダーのAudioEngineが持つ設定を使う
function currentRate() {
  return window.AudioEngine ? window.AudioEngine.speechRate : 1;
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
  const rate = currentRate();
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
