import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

(async () => {
  try {
    await game.init();
  } catch (e) {
    console.error('Game init failed:', e);
    document.body.innerHTML = `
      <div style="padding:40px;color:#fff;font-family:monospace;">
        <h2 style="color:#f44;">Failed to initialize game</h2>
        <pre style="color:#f88;margin-top:20px;white-space:pre-wrap;">${e.stack || e.message || e}</pre>
      </div>
    `;
  }
})();

window.addEventListener('beforeunload', () => {
  game.dispose();
});
