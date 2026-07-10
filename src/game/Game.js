import * as THREE from 'three';
import { GameRenderer } from '../rendering/Renderer.js';
import { InputManager } from './InputManager.js';
import { Player } from './Player.js';
import { HUD } from './HUD.js';
import { LevelManager } from '../levels/LevelManager.js';
import { Level0 } from '../levels/Level0.js';
import { ITEM_DEFS } from '../entities/Item.js';
import { Threat } from '../entities/Threat.js';
import { AudioManager } from './AudioManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new GameRenderer(canvas);
    this.input = new InputManager(canvas);
    this.player = new Player(
      this.renderer.getScene(),
      this.renderer.getCamera(),
      this.input
    );
    this.hud = new HUD();
    this.levelManager = new LevelManager(
      this.renderer.getScene(),
      this.player
    );
    this.audio = new AudioManager();

    this.clock = new THREE.Clock();
    this.running = false;
    this.inventoryOpen = false;
    this.threats = [];
    this.interactables = [];

    window.__useItem = (index) => this._useInventoryItem(index);

    this.mobileControls = document.getElementById('mobile-controls');
    this.inventoryPanel = document.getElementById('inventory-panel');
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingBar = document.getElementById('loading-bar');
    this.loadingText = document.getElementById('loading-text');
    this.loadingHum = document.getElementById('loading-hum');
    this.vhsTracking = document.getElementById('vhs-tracking');

    this._setupEventListeners();
  }

  async init() {
    this.audio.init();
    this.player.setAudioManager(this.audio);

    try {
      this._setLoadingProgress(8, 'SIGNAL ACQUIRING...');
      await new Promise(r => setTimeout(r, 300));

      this._setLoadingProgress(15, 'DECODING TAPE 1/6');
      await new Promise(r => setTimeout(r, 200));

      this._setLoadingProgress(30, 'MAPPING WALLS');
      this.levelManager.registerLevel(0, new Level0());
      await this.levelManager.loadLevel(0);
      this.interactables = this.levelManager.getCurrentLevel().getInteractables();
      const sp = this.levelManager.getCurrentLevel().spawnPoint;
      if (sp) this.player.respawn(sp);

      this._setLoadingProgress(55, 'STITCHING TEXTURES');
      await new Promise(r => setTimeout(r, 150));

      this._setLoadingProgress(70, 'COMPILING GEOMETRY');
      this._spawnThreats();
    } catch (e) {
      console.warn('Level 0 failed to load:', e);
    }

    this._setLoadingProgress(82, 'STABILIZING REALITY');
    await new Promise(r => setTimeout(r, 250));
    this.running = true;
    this.audio.playAmbience('level0');

    this._setLoadingProgress(92, 'NOCLIP INITIATED');
    if (this.vhsTracking) this.vhsTracking.classList.add('active');
    if (this.loadingHum) this.loadingHum.textContent = '══ ══ ══ ══';
    await new Promise(r => setTimeout(r, 600));

    this._setLoadingProgress(100, '▮');
    await new Promise(r => setTimeout(r, 400));
    this._hideLoadingScreen();

    if (this.input.isMobileDevice()) {
      this.hud.showMobileControls();
    }
    this.hud.showControlsHint();
    setTimeout(() => this.hud.hideControlsHint(), 8000);

    this._gameLoop();
  }

  _spawnThreats() {
    const level = this.levelManager.getCurrentLevel();
    const entities = level.getThreatPositions ? level.getThreatPositions() : [];

    for (const ent of entities) {
      const model = level.getThreatModel ? level.getThreatModel(ent.type) : null;
      const threat = new Threat(
        this.renderer.getScene(),
        ent.position,
        {
          type: ent.type || 'hound',
          speed: ent.speed || 1.5,
          damage: ent.damage || 10,
          aggroRange: ent.aggroRange || 8,
          patrolRadius: ent.patrolRadius || 4,
          model,
        }
      );
      this.threats.push(threat);
    }
  }

  _setLoadingProgress(pct, text) {
    if (this.loadingBar) this.loadingBar.style.width = `${pct}%`;
    if (this.loadingText) this.loadingText.textContent = text;
    if (this.loadingHum) {
      const n = Math.max(1, Math.min(6, Math.floor(pct / 16) + 1));
      this.loadingHum.textContent = Array(n).fill('══').join(' ') + Array(Math.max(0, 6 - n)).fill('  ').join(' ');
    }
  }

  _hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
      }, 800);
    }
  }

  _setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyI' && this.player.alive) {
        this._toggleInventory();
      }
      if (e.code === 'KeyE' && this.player.alive) {
        this._interact();
      }
      if (e.code === 'KeyF') {
        this._toggleFlashlight();
      }
    });

    document.addEventListener('click', () => {
      if (!document.pointerLockElement) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.inventoryOpen) {
          this._toggleInventory();
        } else if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    });

    this._setupMobileButtons();
    this._setupJoystick();
  }

  _setupMobileButtons() {
    const btnJump = document.getElementById('btn-jump');
    const btnInteract = document.getElementById('btn-interact');
    const btnCrouch = document.getElementById('btn-crouch');
    const btnRun = document.getElementById('btn-run');

    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.input.keys['Space'] = true;
      });
      btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.input.keys['Space'] = false;
      });
    }

    if (btnInteract) {
      btnInteract.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._interact();
      });
    }

    if (btnCrouch) {
      btnCrouch.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.input.keys['KeyC'] = true;
      });
      btnCrouch.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.input.keys['KeyC'] = false;
      });
    }

    if (btnRun) {
      btnRun.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.input.keys['ShiftLeft'] = true;
      });
      btnRun.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.input.keys['ShiftLeft'] = false;
      });
    }
  }

  _setupJoystick() {
    const joystick = document.getElementById('move-joystick');
    if (!joystick) return;

    joystick.touchData = { active: false, centerX: 0, centerY: 0, dx: 0, dy: 0 };

    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const rect = joystick.getBoundingClientRect();
      joystick.touchData.active = true;
      joystick.touchData.centerX = rect.left + rect.width / 2;
      joystick.touchData.centerY = rect.top + rect.height / 2;

      const dx = (t.clientX - joystick.touchData.centerX) / (rect.width / 2);
      const dy = (t.clientY - joystick.touchData.centerY) / (rect.height / 2);
      joystick.touchData.dx = Math.max(-1, Math.min(1, dx));
      joystick.touchData.dy = Math.max(-1, Math.min(1, dy));
      this._updateJoystickMovement(joystick);
    }, { passive: false });

    joystick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!joystick.touchData.active) return;
      const t = e.changedTouches[0];
      const rect = joystick.getBoundingClientRect();
      const dx = (t.clientX - joystick.touchData.centerX) / (rect.width / 2);
      const dy = (t.clientY - joystick.touchData.centerY) / (rect.height / 2);
      joystick.touchData.dx = Math.max(-1, Math.min(1, dx));
      joystick.touchData.dy = Math.max(-1, Math.min(1, dy));
      this._updateJoystickMovement(joystick);
    }, { passive: false });

    joystick.addEventListener('touchend', (e) => {
      e.preventDefault();
      joystick.touchData.active = false;
      joystick.touchData.dx = 0;
      joystick.touchData.dy = 0;
      this._updateJoystickMovement(joystick);
    }, { passive: false });
  }

  _updateJoystickMovement(joystick) {
    const { dx, dy } = joystick.touchData;
    this.input.mobileStickX = dx;
    this.input.mobileStickY = dy;
  }

  _toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) {
      if (document.pointerLockElement) document.exitPointerLock();
      this.hud.showInventory(this.player.inventory, this.player.equipment);
    } else {
      this.hud.hideInventory();
      if (!document.pointerLockElement) this.canvas.requestPointerLock();
    }
  }

  _useInventoryItem(index) {
    this.player.useItem(index);
    this.hud.showInventory(this.player.inventory, this.player.equipment);
  }

  _interact() {
    if (!this.player.alive) return;

    const camera = this.renderer.getCamera();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    let closest = null;
    let closestDist = Infinity;

    for (const interactable of this.interactables) {
      if (!interactable.mesh.parent) continue;

      const dir = new THREE.Vector3()
        .copy(interactable.position)
        .sub(camera.position);
      const dist = dir.length();

      if (dist < this.player.interactRange && dist < closestDist) {
        const angle = dir.angleTo(
          new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        );
        if (angle < 0.5) {
          closest = interactable;
          closestDist = dist;
        }
      }
    }

    if (!closest) return;

    if (closest.type === 'exit') {
      this._handleExit();
      return;
    }

    if (closest.type === 'note') {
      this._readNote();
      return;
    }

    const itemDef = ITEM_DEFS[closest.type];
    if (itemDef) {
      if (this.player.addToInventory({ ...itemDef })) {
        if (closest.mesh.parent) closest.mesh.parent.remove(closest.mesh);
        this.interactables = this.interactables.filter(i => i !== closest);
        this.audio.play('pickup');
        this.hud.showInteractPrompt(`Picked up ${itemDef.name}`);
        setTimeout(() => this.hud.hideInteractPrompt(), 1500);
      } else {
        this.hud.showInteractPrompt('Inventory is full!');
        setTimeout(() => this.hud.hideInteractPrompt(), 1500);
      }
    }
  }

  _readNote() {
    this.hud.showInteractPrompt(
      'The faded note reads: "The exit is not where you think. Follow the hum."'
    );
    setTimeout(() => this.hud.hideInteractPrompt(), 4000);
  }

  _handleExit() {
    this.hud.showInteractPrompt('You found the exit! Level 0 cleared!');
    setTimeout(() => this.hud.hideInteractPrompt(), 3000);
  }

  _toggleFlashlight() {
    const hasFlashlight = this.player.inventory.find(
      i => i.id === 'flashlight'
    );
    if (!hasFlashlight) {
      this.hud.showInteractPrompt("You don't have a flashlight!");
      setTimeout(() => this.hud.hideInteractPrompt(), 1500);
      return;
    }
    this.player.toggleFlashlight();
  }

  _gameLoop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._gameLoop());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.player.update(delta);
    this.levelManager.update(delta);

    for (const threat of this.threats) {
      threat.update(delta, this.player);
    }

    this._updateInteractPrompt();
    this.hud.update(this.player);

    this.renderer.render();
  }

  _updateInteractPrompt() {
    if (this.inventoryOpen || !this.player.alive) {
      this.hud.hideInteractPrompt();
      return;
    }

    const camera = this.renderer.getCamera();
    let found = false;

    for (const interactable of this.interactables) {
      if (!interactable.mesh.parent) continue;

      const dir = new THREE.Vector3()
        .copy(interactable.position)
        .sub(camera.position);
      const dist = dir.length();

      if (dist < this.player.interactRange) {
        const angle = dir.angleTo(
          new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        );
        if (angle < 0.5) {
          if (interactable.type === 'exit') {
            this.hud.showInteractPrompt('[E] Exit door');
          } else if (interactable.type === 'note') {
            this.hud.showInteractPrompt('[E] Read note');
          } else {
            const itemDef = ITEM_DEFS[interactable.type];
            const name = itemDef ? itemDef.name : interactable.type;
            this.hud.showInteractPrompt(`[E] Pick up ${name}`);
          }
          found = true;
          break;
        }
      }
    }

    if (!found) {
      this.hud.hideInteractPrompt();
    }
  }

  dispose() {
    this.running = false;
    for (const threat of this.threats) {
      threat.dispose();
    }
    this.renderer.dispose();
    this.input.dispose();
  }
}
