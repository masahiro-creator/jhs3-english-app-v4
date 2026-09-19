// 発音再生モジュール
// 全ての単語・例文・不規則動詞はGoogle Cloud TTSで事前生成した音声ファイルを再生する。
// 選択できる声(6種):
//   us-female (デフォルト): en-US-Neural2-F      -> audio/,              js/data/audioManifest.js
//   us-male:               en-US-Neural2-D      -> audio-male/,         js/data/audioManifestMale.js
//   gb-female:              en-GB-Neural2-A      -> audio-gb-a/,         js/data/audioManifestGbA.js
//   gb-male:                en-GB-Neural2-B      -> audio-gb-b/,         js/data/audioManifestGbB.js
//   chirp-female:           en-US-Chirp3-HD-Sulafat -> audio-chirp-female/, js/data/audioManifestChirpFemale.js
//   chirp-male:             en-US-Chirp3-HD-Orus    -> audio-chirp-male/,   js/data/audioManifestChirpMale.js
// Chirp3-HD系のみ、不規則動詞3活用を単語ごとに個別生成→固定間隔で結合する方式
// (scripts/generate-audio-chirp.js)で作っている。1回のAPI呼び出しで
// "put, put, put." のように読ませると冒頭の無音がランダムにばらついてしまうため。
// 端末やブラウザに依存する声のばらつきをなくすため、Web Speech APIへの
// フォールバックは行わない。
window.AudioEngine = {
  speechRate: 1.5, // 聞き取りやすいクリアな速度（標準ボタンと同じ1.5倍。単語・不規則動詞3活用に適用）
  exampleRateScale: 0.675, // 例文は単語より情報量が多く速く感じるため、speechRateにこの倍率をかけて再生
  autoPlay: true,   // 単語切り替え時の自動発音再生 (デフォルト: ON)
  voiceId: 'us-female', // 'us-female' (デフォルト) / 'us-male' / 'gb-female' / 'gb-male' / 'chirp-female' / 'chirp-male'

  _currentAudio: null,

  _voiceManifestGetters: {
    'us-female': () => window.AUDIO_MANIFEST,
    'us-male': () => window.AUDIO_MANIFEST_MALE,
    'gb-female': () => window.AUDIO_MANIFEST_GB_A,
    'gb-male': () => window.AUDIO_MANIFEST_GB_B,
    'chirp-female': () => window.AUDIO_MANIFEST_CHIRP_FEMALE,
    'chirp-male': () => window.AUDIO_MANIFEST_CHIRP_MALE,
  },

  /**
   * 現在選択中の声のmanifestを返す
   */
  _getManifest() {
    const getter = this._voiceManifestGetters[this.voiceId] || this._voiceManifestGetters['us-female'];
    return getter();
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

    const manifest = this._getManifest();
    const entry = manifest && manifest[cleanText];
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
   */
  setRate(rate) {
    this.speechRate = rate;
  },

  /**
   * 声を切り替え ('us-female' / 'us-male' / 'gb-female' / 'gb-male')
   */
  setVoice(voiceId) {
    this.voiceId = this._voiceManifestGetters[voiceId] ? voiceId : 'us-female';
  }
};
