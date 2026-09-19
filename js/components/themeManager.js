// 9色メンバーカラー テーマ切り替えマネージャー
window.ThemeManager = {
  THEMES: [
    { key: 'black', name: 'ブラック（目黒さん風）', color: '#38bdf8', icon: '🖤' },
    { key: 'white', name: 'ホワイト（ラウールさん風）', color: '#ffffff', icon: '🤍' },
    { key: 'yellow', name: 'イエロー（岩本さん風）', color: '#fbbf24', icon: '💛' },
    { key: 'purple', name: 'パープル（深澤さん風）', color: '#c084fc', icon: '💜' },
    { key: 'pink', name: 'ピンク（佐久間さん風）', color: '#f472b6', icon: '🩷' },
    { key: 'blue', name: 'ブルー（渡辺さん風）', color: '#60a5fa', icon: '💙' },
    { key: 'green', name: 'グリーン（阿部さん風）', color: '#4ade80', icon: '💚' },
    { key: 'orange', name: 'オレンジ（向井さん風）', color: '#fb923c', icon: '🧡' },
    { key: 'red', name: 'レッド（宮舘さん風）', color: '#f87171', icon: '❤️' }
  ],

  /**
   * テーマピッカーの初期化
   */
  init(pickerContainerId) {
    const container = document.getElementById(pickerContainerId);
    if (!container) return;

    container.innerHTML = '';
    const currentTheme = window.StorageEngine.getMemberColor();

    this.THEMES.forEach(t => {
      const dot = document.createElement('button');
      dot.className = `color-dot ${t.key === currentTheme ? 'active' : ''}`;
      dot.style.backgroundColor = t.color;
      dot.title = t.name;
      dot.onclick = () => this.setTheme(t.key);
      container.appendChild(dot);
    });

    this.applyTheme(currentTheme);
  },

  /**
   * テーマの設定＆反映
   */
  setTheme(themeKey) {
    window.StorageEngine.setMemberColor(themeKey);
    this.applyTheme(themeKey);

    // ドットのactive状態を更新
    document.querySelectorAll('.color-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', this.THEMES[idx].key === themeKey);
    });

    // 推しカラー更新応援メッセージ
    const themeObj = this.THEMES.find(t => t.key === themeKey);
    if (window.CheeringEngine && themeObj) {
      window.CheeringEngine.showCustomMessage(`${themeObj.icon} 推しカラーを「${themeObj.name}」に変更しました！このカラーでテンション上げて合格を目指そう！`);
    }
  },

  /**
   * CSS属性にテーマを適用
   */
  applyTheme(themeKey) {
    document.documentElement.setAttribute('data-theme', themeKey);
  }
};
