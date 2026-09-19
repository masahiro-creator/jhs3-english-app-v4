// 発音再生モジュール
// 単語・例文・不規則動詞はすべてGoogle Cloud TTS(en-GB-Neural2-A)で事前生成した
// 音声ファイルを再生する。声は1種類のみ。音声速度はアプリ全体で共通の設定を使う。
const RATE_KEY = 'jhs3_english_app_rate_v1';

window.AudioEngine = {
  speechRate: 1.5, // 聞き取りやすいクリアな速度（標準ボタンと同じ1.5倍。単語ドリル・不規則動詞3活用に共通適用）
  exampleRateScale: 0.675, // 例文は単語より情報量が多く速く感じるため、speechRateにこの倍率をかけて再生
  autoPlay: true,   // 単語切り替え時の自動発音再生 (デフォルト: ON)

  _currentAudio: null,

  init() {
    try {
      const saved = Number(localStorage.getItem(RATE_KEY));
      if (saved) this.speechRate = saved;
    } catch {
      // 読み込み失敗時は既定値のまま
    }
  },

  /**
   * 事前生成済み音声を再生
   */
  _playPregenerated(filePath, rate, onEnd) {
    if (this._currentAudio) {
      this._currentAudio.pause();
    }
    const audio = new Audio(filePath);
    audio.playbackRate = rate;
    this._currentAudio = audio;
    if (onEnd) {
      audio.onended = onEnd;
      audio.onerror = onEnd;
    }
    audio.play().catch(() => {
      // 自動再生ポリシー等で失敗した場合はコールバックだけ呼んでおく
      if (onEnd) onEnd();
    });
  },

  /**
   * 単語・文章の英語発音再生
   * @param {string} text 発音する英語
   * @param {function} onEnd 再生終了時コールバック
   * @param {number} customRate 個別速度設定（省略時はデフォルト）
   */
  speak(text, onEnd = null, customRate = null) {
    // 不要な記号・注釈・括弧を除去
    const cleanText = text.replace(/~ing|~|\(.*\)/g, '').replace(/\//g, ' ').trim();
    const baseRate = customRate || this.speechRate;

    const entry = window.AUDIO_MANIFEST && window.AUDIO_MANIFEST[cleanText];
    if (!entry) {
      console.warn(`事前生成音声が見つかりません: "${cleanText}"`);
      if (onEnd) onEnd();
      return;
    }

    // 例文は単語・動詞3活用より情報量が多く同じ倍率だと速く感じるため、少し遅くする
    const rate = entry.type === 'example' ? baseRate * this.exampleRateScale : baseRate;

    this._playPregenerated(entry.path, rate, onEnd);
  },

  /**
   * 不規則動詞の3活用をナチュラル＆クリアなリズムで再生
   * (カンマを挟むことで "have, had, had." のように早口にならず1語ずつハッキリ朗読)
   */
  speakVerbForms(present, past, participle, onComplete = null) {
    let cleanPresent = present.replace(/~ing|~|\(.*\)/g, '').trim();
    let cleanPast = past.replace(/~ing|~|\(.*\)/g, '').trim();
    let cleanParticiple = participle.replace(/~ing|~|\(.*\)/g, '').trim();

    // 【発音特別補正 1】 'be' (be - was/were - been)
    if (cleanPresent.toLowerCase() === 'be') {
      cleanPresent = 'be';
      cleanPast = 'was';
    }

    // 【発音特別補正 2】 'read' (原形: リード / 過去: レッド / 過去分詞: レッド)
    if (cleanPresent.toLowerCase() === 'read') {
      cleanPast = 'red';
      cleanParticiple = 'red';
    }

    // 【発音特別補正 3】 'lead' (原形: リード / 過去: レッド / 過去分詞: レッド)
    if (cleanPresent.toLowerCase() === 'lead') {
      cleanPresent = 'leed';
    }

    // 単語間にカンマ `, ` を挟み、早口・巻き込み発音を防止してクリアに朗読
    const combinedText = `${cleanPresent}, ${cleanPast}, ${cleanParticiple}.`;
    this.speak(combinedText, onComplete);
  },

  /**
   * 自動再生ON/OFFの切り替え
   */
  toggleAutoPlay() {
    this.autoPlay = !this.autoPlay;
    const btn = document.getElementById('auto-play-btn');
    if (btn) {
      btn.textContent = this.autoPlay ? '🔊 自動音声: ON' : '🔇 自動音声: OFF';
      btn.style.background = this.autoPlay ? 'var(--theme-btn-grad)' : 'rgba(255,255,255,0.1)';
    }
    return this.autoPlay;
  },

  /**
   * 音声速度設定 (1.2 = ゆっくり, 1.5 = 標準クリア, 1.8 = 早め)
   * アプリ全体（不規則動詞・単語ドリル）で共通の設定として保存する。
   */
  setRate(rate) {
    this.speechRate = rate;
    try {
      localStorage.setItem(RATE_KEY, String(rate));
    } catch {
      // 保存に失敗しても続行する
    }
  }
};

window.AudioEngine.init();
