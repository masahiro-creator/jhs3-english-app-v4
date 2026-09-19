// localStorage 状態管理モジュール
window.StorageEngine = {
  STORAGE_KEY: 'jhs3_english_app_data_v1',

  /**
   * 全アプリデータを取得
   */
  getData() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.getDefaultData();
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage parse error:', e);
      return this.getDefaultData();
    }
  },

  /**
   * アプリデータを保存
   */
  saveData(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  /**
   * 初期データ構造
   */
  getDefaultData() {
    return {
      memberColor: 'black', // デフォルト推しカラー（目黒さん風ブラック）
      items: {},            // id -> { level, nextReview, total, correct, wrong, lastTested }
      streak: 0,            // 連続学習日数
      lastStudiedDate: '',  // 最終学習日 (YYYY-MM-DD)
      xp: 0                 // 学習経験値
    };
  },

  /**
   * 特定アイテムの学習ステータスを取得
   */
  getItem(id) {
    const data = this.getData();
    return data.items[id] || {
      level: 0,          // 記憶レベル (0〜5)
      nextReview: 0,     // 次回復習タイムスタンプ (ms)
      total: 0,          // 総回答回数
      correct: 0,        // 正解数
      wrong: 0,          // 不正解数
      lastTested: 0      // 最終解答日タイムスタンプ
    };
  },

  /**
   * 回答結果を記録＆記憶レベルを計算
   * @param {string} id アイテムID
   * @param {boolean} isCorrect 正解かどうか
   */
  recordResult(id, isCorrect) {
    const data = this.getData();
    const item = data.items[id] || {
      level: 0,
      nextReview: 0,
      total: 0,
      correct: 0,
      wrong: 0,
      lastTested: 0
    };

    const now = Date.now();
    item.total += 1;
    item.lastTested = now;

    if (isCorrect) {
      item.correct += 1;
      // エビングハウス忘却曲線レベルを上昇
      if (item.level < 5) item.level += 1;
    } else {
      item.wrong += 1;
      // 間違えた場合はLevel 0に即時リセット
      item.level = 0;
    }

    // 次回復習日を計算 (srsEngine参照)
    item.nextReview = window.SRSEngine.calculateNextReview(item.level, now);

    data.items[id] = item;
    data.xp += isCorrect ? 10 : 2; // XP獲得
    this.updateStreak(data);
    this.saveData(data);

    return item;
  },

  /**
   * ストリーク（連続学習日数）の更新
   */
  updateStreak(data = null) {
    if (!data) data = this.getData();

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.lastStudiedDate === todayStr) {
      return data.streak; // 本日すでに計算済み
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (data.lastStudiedDate === yesterdayStr) {
      data.streak += 1;
    } else if (!data.lastStudiedDate) {
      data.streak = 1;
    } else {
      // 1日以上あいた場合はストリーク1からリセット
      data.streak = 1;
    }

    data.lastStudiedDate = todayStr;
    this.saveData(data);
    return data.streak;
  },

  /**
   * 推しカラーの設定/取得
   */
  getMemberColor() {
    return this.getData().memberColor || 'black';
  },

  setMemberColor(colorKey) {
    const data = this.getData();
    data.memberColor = colorKey;
    this.saveData(data);
  }
};
