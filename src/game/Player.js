import * as THREE from 'three';

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.3;
const CROUCH_HEIGHT = 0.8;
const WALK_SPEED = 3.0;
const RUN_SPEED = 9;
const CROUCH_SPEED = 1.5;
const JUMP_FORCE = 5.5;
const GRAVITY = -12;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 50;
const STAMINA_REGEN = 25;
const STAMINA_TICK = 0.1;
const HEALTH_MAX = 100;

export class Player {
  constructor(scene, camera, input) {
    this.scene = scene;
    this.camera = camera;
    this.input = input;

    this.health = HEALTH_MAX;
    this.maxHealth = HEALTH_MAX;
    this.stamina = STAMINA_MAX;
    this.maxStamina = STAMINA_MAX;
    this.alive = true;

    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, 0, 0);
    this.direction = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.isGrounded = false;
    this.isCrouching = false;
    this.isRunning = false;
    this.isMoving = false;
    this.cameraHeight = PLAYER_HEIGHT;
    this.targetCamHeight = PLAYER_HEIGHT;

    this.inventory = [];
    this.maxInventory = 8;
    this.equippedItem = null;

    this.interactRange = 2.5;
    this.nearbyInteractables = [];

    this.pitch = 0;
    this.yaw = 0;

    this.staminaTimer = 0;
    this._sprintLocked = false;

    this.raycaster = new THREE.Raycaster();
    this.wallBoxes = [];
    this.collisionGrid = null;
    this.collisionTileSize = 4;
    this.getFloorHeight = null;
    this.audio = null;
    this.flashlightOn = false;
    this.flashlight = null;
    this._footstepTimer = 0;
    this._wasGrounded = true;

    this._setupCollider();
    this._setupFlashlight();
  }

  _setupFlashlight() {
    this.flashlight = new THREE.SpotLight(0xffffee, 0, 20, Math.PI / 6, 0.5, 1.5);
    this.flashlight.position.set(0, -0.2, -0.5);
    this.flashlight.target.position.set(0, 0, -5);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);
    this._flashlightOff();
  }

  _flashlightOn() {
    this.flashlightOn = true;
    this.flashlight.intensity = 2;
  }

  _flashlightOff() {
    this.flashlightOn = false;
    this.flashlight.intensity = 0;
  }

  toggleFlashlight() {
    if (this.flashlightOn) {
      this._flashlightOff();
    } else {
      this._flashlightOn();
    }
    if (this.audio) this.audio.play('flashlight');
  }

  setWallColliders(boxes) {
    this.wallBoxes = boxes;
  }

  setCollisionGrid(grid, tileSize) {
    this.collisionGrid = grid;
    this.collisionTileSize = tileSize || 4;
  }

  setFloorHeightFunc(fn) {
    this.getFloorHeight = fn;
  }

  setAudioManager(audio) {
    this.audio = audio;
  }

  _setupCollider() {
    this.collider = new THREE.Mesh(
      new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.collider.position.copy(this.position);
    this.collider.position.y = PLAYER_HEIGHT / 2;
    this.scene.add(this.collider);
  }

  addToInventory(item) {
    if (this.inventory.length >= this.maxInventory) return false;
    if (item.stackable) {
      const existing = this.inventory.find(i => i.id === item.id && i.quantity < (i.maxStack || 1));
      if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        return true;
      }
    }
    this.inventory.push({ ...item, quantity: item.quantity || 1 });
    return true;
  }

  removeFromInventory(index) {
    if (index >= 0 && index < this.inventory.length) {
      this.inventory.splice(index, 1);
      if (this.equippedItem === index) this.equippedItem = null;
    }
  }

  useItem(index) {
    if (index < 0 || index >= this.inventory.length) return;
    const item = this.inventory[index];
    if (item.use) item.use(this);
    item.quantity--;
    if (item.quantity <= 0) this.removeFromInventory(index);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.die();
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  die() {
    this.alive = false;
  }

  respawn(position) {
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.alive = true;
    this.velocity.set(0, 0, 0);
    if (position) {
      this.position.copy(position);
      this.collider.position.copy(position);
    }
  }

  update(delta) {
    if (!this.alive) return;
    this._handleInput(delta);
    this._handlePhysics(delta);
    this._updateCamera(delta);
    this._updateStamina(delta);
    this._updateInteractables();
  }

  _handleInput(delta) {
    const input = this.input;
    const isMobile = input.isMobileDevice();

    this.isCrouching = input.isKeyDown('KeyC') || input.isKeyDown('ControlLeft') || input.isKeyDown('ControlRight');
    const shiftHeld = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight');
    if (!shiftHeld) {
      this._sprintLocked = false;
    }
    if (shiftHeld) {
      this.isRunning = this.stamina > 0 && !this.isCrouching && this.isMoving && !this._sprintLocked;
    } else {
      this.isRunning = false;
    }

    this.targetCamHeight = this.isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;

    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    forward.applyQuaternion(this.camera.quaternion);
    right.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    this.direction.set(0, 0, 0);
    if (input.isKeyDown('KeyW')) this.direction.add(forward);
    if (input.isKeyDown('KeyS')) this.direction.sub(forward);
    if (input.isKeyDown('KeyA')) this.direction.sub(right);
    if (input.isKeyDown('KeyD')) this.direction.add(right);

    if (isMobile) {
      if (input.touch.active) {
        const { dx, dy } = input.consumeTouchDelta();
        this.yaw -= dx * 0.005;
        this.pitch -= dy * 0.005;
        this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      }

      const stickX = input.mobileStickX || 0;
      const stickY = input.mobileStickY || 0;
      if (Math.abs(stickX) > 0.15 || Math.abs(stickY) > 0.15) {
        const tf = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const tr = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        tf.y = 0; tf.normalize();
        tr.y = 0; tr.normalize();
        this.direction.set(0, 0, 0);
        this.direction.add(tf.multiplyScalar(-stickY));
        this.direction.add(tr.multiplyScalar(stickX));
      }
    }

    if (!isMobile && input.isPointerLocked()) {
      const { dx, dy } = input.consumeMouseDelta();
      this.yaw -= dx * 0.002;
      this.pitch -= dy * 0.002;
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
      this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }

    this.isMoving = this.direction.lengthSq() > 0.01;

    if (this.direction.lengthSq() > 0.01) {
      this.direction.normalize();
    }

    if (input.isKeyDown('Space') && this.isGrounded) {
      this.velocity.y = JUMP_FORCE;
      this.isGrounded = false;
      if (this.audio) this.audio.play('jump');
    }
  }

  _collidesWithGrid(wx, wz) {
    if (!this.collisionGrid) return false;
    const r = PLAYER_RADIUS;
    const tile = this.collisionTileSize;
    const grid = this.collisionGrid;
    const h = grid.length;
    const w = grid[0].length;

    const minX = Math.floor((wx - r) / tile);
    const maxX = Math.floor((wx + r) / tile);
    const minZ = Math.floor((wz - r) / tile);
    const maxZ = Math.floor((wz + r) / tile);

    for (let gz = minZ; gz <= maxZ; gz++) {
      for (let gx = minX; gx <= maxX; gx++) {
        if (gz < 0 || gz >= h || gx < 0 || gx >= w) return true;
        const cMinX = gx * tile;
        const cMaxX = (gx + 1) * tile;
        const cMinZ = gz * tile;
        const cMaxZ = (gz + 1) * tile;
        const closestX = Math.max(cMinX, Math.min(wx, cMaxX));
        const closestZ = Math.max(cMinZ, Math.min(wz, cMaxZ));
        const dx = wx - closestX;
        const dz = wz - closestZ;
        if (dx * dx + dz * dz >= r * r) continue;

        if (grid[gz][gx] === ' ') return true;

        if (this.isGrounded && this.getFloorHeight) {
          const fh = this.getFloorHeight(wx, wz);
          if (fh !== null && Math.abs(this.position.y - fh) > 0.5) return true;
        }
      }
    }
    return false;
  }

  _handlePhysics(delta) {
    const speed = this.isCrouching ? CROUCH_SPEED : (this.isRunning ? RUN_SPEED : WALK_SPEED);
    const moveSpeed = this.direction.lengthSq() > 0.01 ? speed : 0;

    this.velocity.x = this.direction.x * moveSpeed;
    this.velocity.z = this.direction.z * moveSpeed;
    this.velocity.y += GRAVITY * delta;

    const newPos = this.position.clone();
    const dx = this.velocity.x * delta;
    const dz = this.velocity.z * delta;

    // Horizontal movement first
    if (this.collisionGrid) {
      if (!this._collidesWithGrid(newPos.x + dx, newPos.z + dz)) {
        newPos.x += dx;
        newPos.z += dz;
      } else if (!this._collidesWithGrid(newPos.x + dx, newPos.z)) {
        newPos.x += dx;
      } else if (!this._collidesWithGrid(newPos.x, newPos.z + dz)) {
        newPos.z += dz;
      }
    } else {
      newPos.x += dx;
      newPos.z += dz;

      const testBox = new THREE.Box3(
        new THREE.Vector3(newPos.x - PLAYER_RADIUS, newPos.y, newPos.z - PLAYER_RADIUS),
        new THREE.Vector3(newPos.x + PLAYER_RADIUS, newPos.y + this.cameraHeight, newPos.z + PLAYER_RADIUS)
      );

      let collided = false;
      for (const wallBox of this.wallBoxes) {
        if (testBox.intersectsBox(wallBox)) { collided = true; break; }
      }

      if (collided) {
        newPos.x = this.position.x;
        newPos.z = this.position.z;
      }
    }

    // Vertical: gravity and floor clamp at the final (x,z)
    newPos.y += this.velocity.y * delta;
    const floorY = this.getFloorHeight ? this.getFloorHeight(newPos.x, newPos.z) : 0;
    if (floorY !== null && newPos.y <= floorY) {
      newPos.y = floorY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    const wasGrounded = this._wasGrounded;
    this._wasGrounded = this.isGrounded;

    if (!wasGrounded && this.isGrounded && this.audio) {
      this.audio.play('land');
    }

    if (this.isGrounded && this.isMoving && this.audio) {
      const footSpeed = this.isCrouching ? CROUCH_SPEED : (this.isRunning ? RUN_SPEED : WALK_SPEED);
      this._footstepTimer -= delta;
      if (this._footstepTimer <= 0) {
        const interval = 0.45 / Math.max(footSpeed / WALK_SPEED, 0.5) * (0.9 + Math.random() * 0.2);
        this._footstepTimer = interval;
        this.audio.play(this.isRunning ? 'footstep_run' : 'footstep');
      }
    }

    // Fall into void → die
    if (newPos.y < -10) this.die();

    this.position.copy(newPos);
    this.collider.position.x = this.position.x;
    this.collider.position.z = this.position.z;
    this.collider.position.y = this.position.y + PLAYER_HEIGHT / 2;
  }

  _updateCamera(delta) {
    this.cameraHeight += (this.targetCamHeight - this.cameraHeight) * 10 * delta;
    this.camera.position.copy(this.position);
    this.camera.position.y += this.cameraHeight;
  }

  _updateStamina(delta) {
    this.staminaTimer += delta;
    if (this.staminaTimer < STAMINA_TICK) return;
    this.staminaTimer = 0;

    if (this.isRunning && this.isMoving) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * STAMINA_TICK);
      if (this.stamina <= 0) {
        this.isRunning = false;
        this._sprintLocked = true;
      }
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + STAMINA_REGEN * STAMINA_TICK);
    }
  }

  _updateInteractables() {
    this.nearbyInteractables = [];
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
  }

  getState() {
    return {
      position: this.position.clone(),
      yaw: this.yaw,
      pitch: this.pitch,
      health: this.health,
      stamina: this.stamina,
      alive: this.alive,
      isCrouching: this.isCrouching,
      isRunning: this.isRunning,
    };
  }

  setState(state) {
    this.position.copy(state.position);
    this.yaw = state.yaw;
    this.pitch = state.pitch;
    this.health = state.health;
    this.stamina = state.stamina;
    this.alive = state.alive;
  }
}
