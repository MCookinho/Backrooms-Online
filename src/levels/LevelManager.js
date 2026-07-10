export class LevelManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.levels = new Map();
    this.currentLevel = null;
    this.currentLevelId = -1;
  }

  registerLevel(id, levelInstance) {
    this.levels.set(id, levelInstance);
  }

  async loadLevel(id) {
    if (this.currentLevel) {
      this.currentLevel.unload();
    }

    const level = this.levels.get(id);
    if (!level) throw new Error(`Level ${id} not found`);

    this.currentLevel = level;
    this.currentLevelId = id;
    await level.load(this.scene);

    if (level.spawnPoint) {
      this.player.position.copy(level.spawnPoint);
    }

    if (typeof level.getWallColliders === 'function') {
      this.player.setWallColliders(level.getWallColliders());
    }

    return level;
  }

  update(delta) {
    if (this.currentLevel) {
      this.currentLevel.update(delta, this.player);
      if (typeof this.currentLevel.getWallColliders === 'function') {
        this.player.setWallColliders(this.currentLevel.getWallColliders());
      }
    }
  }

  getCurrentLevel() {
    return this.currentLevel;
  }
}
