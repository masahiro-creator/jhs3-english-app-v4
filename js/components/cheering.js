// スノーパートナーズ応援演出＆紙吹雪コンポーネント
window.CheeringEngine = {
  MESSAGES: [
    "今日も継続できてて最高！その集中力、ライブの特等席並みに輝いてるよ！✨",
    "不規則動詞マスター達成！一歩ずつ夢の第一志望合格へ近づいてる！🔥",
    "忘却曲線に打ち勝ったね！脳にしっかり定着してる証拠だよ！🧠💪",
    "毎日コツコツ続ける君は本当にかっこいい！最後まで一緒に走り抜けよう！❄️",
    "正解連発お見事！ドームのステージで輝くレベルの全勝ペース！🎉",
    "弱点克服おめでとう！苦手を好きに変える力、本当に尊敬する！👏",
    "焦らず自分のペースでOK！君の努力は絶対に裏切らない！🌟"
  ],

  /**
   * ランダムな応援メッセージを取得
   */
  getRandomMessage() {
    const idx = Math.floor(Math.random() * this.MESSAGES.length);
    return this.MESSAGES[idx];
  },

  /**
   * 応援バナーメッセージを即時更新
   */
  showCustomMessage(msg) {
    const bannerText = document.getElementById('cheer-banner-message');
    if (bannerText) {
      bannerText.textContent = msg;
    }
  },

  /**
   * ミッション達成時などの紙吹雪演出 (Canvas Particle)
   */
  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#fbbf24', '#c084fc', '#f472b6', '#60a5fa', '#4ade80', '#fb923c', '#38bdf8', '#ffffff'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2,
        vx: Math.random() * 2 - 1,
        rotation: Math.random() * 360,
        vRot: Math.random() * 4 - 2
      });
    }

    let animationFrame;
    const startTime = Date.now();

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (Date.now() - startTime < 2500) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    }

    render();
  }
};
