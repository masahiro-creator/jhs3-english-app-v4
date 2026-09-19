// エビングハウスの忘却曲線・間隔反復学習 (SRS) ロジックエンジン
// v4では不規則動詞のみを対象とする（単語は js/worddrill/ が独自のSRSで管理）
window.SRSEngine = {
  // 記憶レベルごとの復習間隔 (ミリ秒単位)
  INTERVALS: {
    0: 0,                           // Level 0: 即時・当日
    1: 1 * 24 * 60 * 60 * 1000,     // Level 1: 1日後 (24h)
    2: 3 * 24 * 60 * 60 * 1000,     // Level 2: 3日後 (72h)
    3: 7 * 24 * 60 * 60 * 1000,     // Level 3: 7日後 (168h)
    4: 14 * 24 * 60 * 60 * 1000,    // Level 4: 14日後 (336h)
    5: 30 * 24 * 60 * 60 * 1000     // Level 5: 30日後 (殿堂入り)
  },

  /**
   * 次回復習タイムスタンプの算出
   */
  calculateNextReview(level, now = Date.now()) {
    const interval = this.INTERVALS[level] || 0;
    return now + interval;
  },

  /**
   * 復習期限が来ているかチェック（すでに一度学習したアイテムが対象）
   */
  isDue(itemState, now = Date.now()) {
    if (!itemState || itemState.level === 0) return true;
    return now >= itemState.nextReview;
  },

  /**
   * まだ一度も解いたことがない動詞
   */
  getUnseenItems(verbs = []) {
    return verbs.filter(v => window.StorageEngine.isUnseen(v.id));
  },

  /**
   * 今日の新規枠に収まる分だけ、未学習の動詞を返す
   */
  getNewItemsForToday(verbs = []) {
    const slots = window.StorageEngine.countRemainingNewVerbSlots();
    return this.getUnseenItems(verbs).slice(0, slots);
  },

  /**
   * 一度は学習済みで、今日復習すべき動詞を抽出（未学習は含まない）
   */
  getDueItems(verbs = []) {
    const now = Date.now();
    const dueVerbs = verbs.filter(v => {
      if (window.StorageEngine.isUnseen(v.id)) return false;
      const state = window.StorageEngine.getItem(v.id);
      return this.isDue(state, now);
    });

    return { dueVerbs, totalDue: dueVerbs.length };
  },

  /**
   * 不規則動詞から「弱点アイテム（過去誤答数 > 0 の未克服問題）」を抽出
   */
  getWeakItems(verbs = []) {
    const allItems = verbs.map(v => ({ ...v, itemType: 'verb' }));

    return allItems.filter(item => {
      const state = window.StorageEngine.getItem(item.id);
      if (!state || state.total === 0) return false;
      return state.wrong > 0; // 誤答数が1以上の場合のみ弱点ノートに表示
    }).sort((a, b) => {
      const stateA = window.StorageEngine.getItem(a.id);
      const stateB = window.StorageEngine.getItem(b.id);
      return stateB.wrong - stateA.wrong;
    });
  },

  /**
   * 活用パターン(AAA/ABB/ABA/ABC)ごとの正答率を低い順に並べる。未回答は含めない。
   */
  getCategoryStats(verbs = []) {
    const byType = new Map();
    verbs.forEach((v) => {
      if (window.StorageEngine.isUnseen(v.id)) return;
      const state = window.StorageEngine.getItem(v.id);
      if (state.total === 0) return;
      const stat = byType.get(v.type) ?? { correct: 0, seen: 0 };
      stat.correct += state.correct;
      stat.seen += state.total;
      byType.set(v.type, stat);
    });
    return [...byType.entries()]
      .map(([type, stat]) => ({
        category: `${type}型`,
        correct: stat.correct,
        seen: stat.seen,
        rate: stat.correct / stat.seen,
      }))
      .sort((a, b) => a.rate - b.rate);
  },

  /**
   * 不規則動詞の記憶定着度ステータスを計算
   */
  getStats(verbs = []) {
    let totalItems = verbs.length;
    let totalTested = 0;
    let masteredCount = 0; // Level 4以上

    verbs.forEach(item => {
      if (window.StorageEngine.isUnseen(item.id)) return;
      const state = window.StorageEngine.getItem(item.id);
      if (state.total > 0) totalTested++;
      if (state.level >= 4) masteredCount++;
    });

    const dueCount = this.getDueItems(verbs).totalDue;
    const retentionRate = totalTested > 0 ? Math.round((masteredCount / totalItems) * 100) : 0;

    return {
      totalItems,
      totalTested,
      masteredCount,
      dueCount,
      retentionRate
    };
  }
};
