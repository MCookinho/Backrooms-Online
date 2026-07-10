import * as THREE from 'three';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;

const GW = 60;
const GH = 30;

const SECTORS = [
  [22, 11, 4, 3, 'spawn'],
  [5, 13, 48, 1, 'hall'],
  [3, 13, 2, 1, 'hall'],
  [23, 6, 1, 7, 'hall'],
  [22, 4, 3, 2, 'room'],
  [30, 7, 1, 6, 'hall'],
  [29, 5, 3, 2, 'room'],
  [13, 7, 1, 6, 'hall'],
  [12, 5, 3, 2, 'room'],
  [23, 14, 1, 10, 'hall'],
  [22, 24, 3, 2, 'room'],
  [30, 14, 1, 8, 'hall'],
  [29, 22, 3, 2, 'room'],
  [13, 14, 1, 8, 'hall'],
  [12, 22, 3, 2, 'room'],
  [47, 13, 6, 1, 'hall'],
  [50, 10, 3, 3, 'room'],
  [53, 12, 3, 3, 'exit'],
  [17, 9, 1, 4, 'hall'],
  [17, 14, 1, 4, 'hall'],
  [1, 12, 2, 3, 'room'],
  [42, 3, 3, 3, 'room'],
  [43, 6, 1, 3, 'hall'],
  [37, 7, 1, 6, 'hall'],
  [37, 6, 1, 1, 'hall'],
  [37, 5, 2, 1, 'room'],
  [38, 14, 1, 5, 'hall'],
  [37, 19, 3, 2, 'room'],
  [7, 15, 1, 3, 'hall'],
  [7, 14, 1, 1, 'hall'],
  [6, 18, 3, 2, 'room'],
  [43, 9, 1, 4, 'hall'],
];

const ITEM_PLACEMENTS = [
  ['flashlight', 14, 5],
  ['almond_water', 13, 5],
  ['almond_water', 30, 5],
  ['almond_water', 23, 24],
  ['almond_water', 29, 22],
  ['batteries', 10, 13],
  ['batteries', 33, 13],
  ['batteries', 23, 14],
  ['lighter', 37, 5],
  ['lighter', 50, 10],
  ['medkit', 22, 4],
  ['medkit', 39, 19],
  ['note', 12, 22],
  ['note', 42, 3],
  ['note', 25, 11],
  ['key', 51, 13],
];

const ENTITY_PLACEMENTS = [
  ['hound', 30, 14, { speed: 1.8, aggroRange: 8, damage: 12, patrolRadius: 4 }],
  ['hound', 8, 13, { speed: 1.6, aggroRange: 7, damage: 15, patrolRadius: 3 }],
  ['faceling', 12, 5, { speed: 0.9, aggroRange: 5, damage: 8, patrolRadius: 3 }],
  ['faceling', 29, 22, { speed: 1.0, aggroRange: 6, damage: 10, patrolRadius: 4 }],
  ['faceling', 38, 14, { speed: 0.8, aggroRange: 5, damage: 8, patrolRadius: 3 }],
  ['duller', 50, 10, {}],
  ['duller', 6, 18, {}],
];

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3((23 + 0.5) * TILE, 0, (12 + 0.5) * TILE);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.wallBoxes = [];
    this.entities = [];
    this.grid = null;
  }

  _initGrid() {
    this.grid = Array.from({ length: GH }, () => Array(GW).fill(' '));
    for (const [x, z, w, h, type] of SECTORS) {
      for (let dz = 0; dz < h; dz++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = x + dx;
          const cz = z + dz;
          if (cx >= 0 && cx < GW && cz >= 0 && cz < GH) {
            if (type === 'spawn') this.grid[cz][cx] = 'S';
            else if (type === 'exit') this.grid[cz][cx] = 'E';
            else this.grid[cz][cx] = type === 'hall' ? '.' : 'r';
          }
        }
      }
    }
  }

  async load(scene) {
    this.object3d = new THREE.Group();
    scene.add(this.object3d);
    this._initGrid();
    this.textureLoader = new THREE.TextureLoader();
    this._loadTextures();
    this._buildLevel();
  }

  _loadTextures() {
    this.textures = {};
    const base = window.location.pathname.replace(/\/[^/]*$/, '') || '.';
    const load = (name, path, rx = 2, ry = 1) => {
      const t = this.textureLoader.load(`${base}/assets/textures/${path}`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      this.textures[name] = t;
    };
    load('wallDiff', 'backrooms-wall-diffuse.png', 2, 2);
    load('wallNor', 'backrooms-wall-normal.png', 2, 2);
    load('ceilDiff', 'backrooms-ceiling-tile-diffuse.png', 4, 4);
    load('ceilNor', 'backrooms-ceiling-tile-normal.png', 4, 4);
    load('ceilRough', 'backrooms-ceiling-tile-roughness.png', 4, 4);
    load('lightDiff', 'backrooms-ceiling-light-diffuse.png', 1, 1);
    load('lightEmit', 'backrooms-ceiling-light-emission.png', 1, 1);
    load('lightNor', 'backrooms-ceiling-light-normal.png', 1, 1);
    load('lightRough', 'backrooms-ceiling-light-roughness.png', 1, 1);
  }

  unload() {
    if (this.object3d.parent) this.object3d.parent.remove(this.object3d);
    this._disposeGroup(this.object3d);
  }

  _disposeGroup(g) {
    g.traverse(c => {
      if (c.isMesh) {
        c.geometry.dispose();
        if (c.material) {
          (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
        }
      }
    });
  }

  _buildLevel() {
    this._buildFloor();
    this._buildCeiling();
    this._buildWalls();
    this._buildTrim();
    this._createLights();
    this._addWallDetails();
    this._createProps();
    this._createItems();
    this._placeEntities();
    this._createExit();
  }

  _isWalkable(x, z) {
    if (x < 0 || x >= GW || z < 0 || z >= GH) return false;
    return this.grid[z][x] !== ' ';
  }

  _buildFloor() {
    const tex = this._generateCarpetTexture();
    const roughTex = this._generateCarpetRoughness();
    const floorMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughnessMap: roughTex,
      roughness: 0.85,
      metalness: 0,
    });

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE, TILE),
          floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x * TILE + TILE / 2, 0, z * TILE + TILE / 2);
        floor.receiveShadow = true;
        this.object3d.add(floor);
      }
    }
  }

  _generateCeilingTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#e8e0d8';
    ctx.fillRect(0, 0, size, size);

    const d = ctx.getImageData(0, 0, size, size).data;
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      imgData.data[i] = Math.max(0, Math.min(255, d[i] + n));
      imgData.data[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      imgData.data[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const ts = 128;
    ctx.fillStyle = 'rgba(200, 195, 190, 0.3)';
    ctx.strokeStyle = 'rgba(180, 175, 170, 0.15)';
    ctx.lineWidth = 1;
    for (let py = 0; py < size; py += ts) {
      for (let px = 0; px < size; px += ts) {
        ctx.strokeRect(px, py, ts, ts);
        const cx = px + ts / 2, cy = py + ts / 2;
        ctx.beginPath();
        ctx.arc(cx - ts * 0.35, cy - ts * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + ts * 0.35, cy - ts * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - ts * 0.35, cy + ts * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + ts * 0.35, cy + ts * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  _buildCeiling() {
    const ceilMat = new THREE.MeshStandardMaterial({
      map: this._generateCeilingTexture(),
      roughness: 0.95,
      color: 0xeee8e0,
    });
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const ceil = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE, TILE),
          ceilMat
        );
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(x * TILE + TILE / 2, ROOM_H, z * TILE + TILE / 2);
        this.object3d.add(ceil);
      }
    }
  }

  _generateWallpaperTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d4c080';
    ctx.fillRect(0, 0, size, size);

    const d = ctx.getImageData(0, 0, size, size).data;
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      imgData.data[i] = Math.max(0, Math.min(255, d[i] + n));
      imgData.data[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      imgData.data[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const ps = 128;
    for (let py = 0; py < size; py += ps) {
      for (let px = 0; px < size; px += ps) {
        const cx = px + ps / 2, cy = py + ps / 2;

        ctx.strokeStyle = 'rgba(180, 140, 60, 0.25)';
        ctx.lineWidth = 1.5;
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 14, 7, 11, ang, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(200, 160, 70, 0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(180, 140, 60, 0.08)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let x = 0; x < size; x += 16) {
      ctx.strokeStyle = 'rgba(200, 180, 100, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(140, 100, 50, 0.03)';
    for (let i = 0; i < 30; i++) {
      const sx = Math.random() * size, sy = Math.random() * size;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 10 + Math.random() * 25, 8 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = 4;
    return tex;
  }

  _createWallMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this._generateWallpaperTexture(),
      roughness: 0.85,
      color: 0xddcc88,
    });
  }

  _buildWalls() {
    const wallMat = this._createWallMaterial();

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;

        if (z === 0 || !this._isWalkable(x, z - 1)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(TILE, ROOM_H, WALL_T),
            wallMat
          );
          wall.position.set(x * TILE + TILE / 2, ROOM_H / 2, z * TILE);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (z === GH - 1 || !this._isWalkable(x, z + 1)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(TILE, ROOM_H, WALL_T),
            wallMat
          );
          wall.position.set(x * TILE + TILE / 2, ROOM_H / 2, z * TILE + TILE);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (x === 0 || !this._isWalkable(x - 1, z)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(WALL_T, ROOM_H, TILE),
            wallMat
          );
          wall.position.set(x * TILE, ROOM_H / 2, z * TILE + TILE / 2);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }

        if (x === GW - 1 || !this._isWalkable(x + 1, z)) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(WALL_T, ROOM_H, TILE),
            wallMat
          );
          wall.position.set(x * TILE + TILE, ROOM_H / 2, z * TILE + TILE / 2);
          this.object3d.add(wall);
          this.wallBoxes.push(new THREE.Box3().setFromObject(wall));
        }
      }
    }
  }

  _buildTrim() {
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.9 });

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;

        if (z === 0 || !this._isWalkable(x, z - 1)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.1, 0.02), trimMat);
          t.position.set(x * TILE + TILE / 2, 0.05, z * TILE);
          this.object3d.add(t);
        }
        if (z === GH - 1 || !this._isWalkable(x, z + 1)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.1, 0.02), trimMat);
          t.position.set(x * TILE + TILE / 2, 0.05, z * TILE + TILE);
          this.object3d.add(t);
        }
        if (x === 0 || !this._isWalkable(x - 1, z)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, TILE), trimMat);
          t.position.set(x * TILE, 0.05, z * TILE + TILE / 2);
          this.object3d.add(t);
        }
        if (x === GW - 1 || !this._isWalkable(x + 1, z)) {
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, TILE), trimMat);
          t.position.set(x * TILE + TILE, 0.05, z * TILE + TILE / 2);
          this.object3d.add(t);
        }
      }
    }
  }

  _generateCarpetTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d4c49a';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const tw = 64, th = 64;
    ctx.strokeStyle = 'rgba(170, 140, 80, 0.2)';
    ctx.lineWidth = 1.5;
    for (let py = 0; py < size; py += th) {
      for (let px = 0; px < size; px += tw) {
        const cx = px + tw / 2, cy = py + th / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - th / 2 + 4);
        ctx.lineTo(cx + tw / 2 - 4, cy);
        ctx.lineTo(cx, cy + th / 2 - 4);
        ctx.lineTo(cx - tw / 2 + 4, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(200, 180, 120, 0.35)';
    ctx.lineWidth = 2;
    for (let py = 0; py < size; py += th * 2) {
      for (let px = 0; px < size; px += tw * 2) {
        const cx = px + tw, cy = py + th;
        ctx.beginPath();
        ctx.moveTo(cx, cy - th + 4);
        ctx.lineTo(cx + tw - 4, cy);
        ctx.lineTo(cx, cy + th - 4);
        ctx.lineTo(cx - tw + 4, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(160, 130, 80, 0.04)';
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * size, sy = Math.random() * size;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 15 + Math.random() * 30, 10 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    tex.anisotropy = 4;
    return tex;
  }

  _generateCarpetRoughness() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 60;
      const val = Math.max(150, Math.min(255, d[i] + n));
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.fillStyle = 'rgba(60, 60, 60, 0.2)';
    for (let i = 0; i < 30; i++) {
      const sx = Math.random() * size, sy = Math.random() * size;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 20 + Math.random() * 30, 15 + Math.random() * 25, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
  }

  _createLights() {
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xffeecc,
      emissive: 0xffeedd,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    });

    const ambient = new THREE.AmbientLight(0xffeedd, 1.2);
    this.object3d.add(ambient);

    const lightPositions = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        if ((x + z) % 2 === 0) lightPositions.push({ x, z });
      }
    }

    for (const { x, z } of lightPositions) {
      const cx = x * TILE + TILE / 2;
      const cz = z * TILE + TILE / 2;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.06, 0.25),
        fixtureMat
      );
      frame.position.set(cx, ROOM_H - 0.03, cz);
      this.object3d.add(frame);

      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.15),
        panelMat
      );
      panel.rotation.x = Math.PI / 2;
      panel.position.set(cx, ROOM_H - 0.06, cz);
      this.object3d.add(panel);
    }

    const flickerPositions = [
      [23, 9], [30, 12], [13, 10], [23, 17], [38, 10], [10, 12],
    ];

    for (const [lx, lz] of flickerPositions) {
      if (!this._isWalkable(lx, lz)) continue;
      const pl = new THREE.PointLight(0xffeedd, 0.3, TILE * 6);
      pl.position.set(lx * TILE + TILE / 2, ROOM_H - 0.5, lz * TILE + TILE / 2);
      pl.userData = {
        timer: Math.random() * 100,
        buzzRange: 0.8 + Math.random() * 0.4,
      };
      this.object3d.add(pl);
      this.lights.push(pl);
    }
  }

  _addWallDetails() {
    const stainMat = new THREE.MeshStandardMaterial({
      color: 0x554433,
      transparent: true,
      opacity: 0.12,
      roughness: 1,
      side: THREE.DoubleSide,
    });

    const wallCells = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        wallCells.push({ x, z });
      }
    }

    if (wallCells.length === 0) return;
    for (let i = 0; i < 60; i++) {
      const cell = wallCells[Math.floor(Math.random() * wallCells.length)];
      const dirs = [];
      if (cell.z === 0 || !this._isWalkable(cell.x, cell.z - 1)) dirs.push(0);
      if (cell.z === GH - 1 || !this._isWalkable(cell.x, cell.z + 1)) dirs.push(1);
      if (cell.x === 0 || !this._isWalkable(cell.x - 1, cell.z)) dirs.push(2);
      if (cell.x === GW - 1 || !this._isWalkable(cell.x + 1, cell.z)) dirs.push(3);
      if (dirs.length === 0) continue;

      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const cx = cell.x * TILE + TILE / 2;
      const cz = cell.z * TILE + TILE / 2;
      const stainY = 0.5 + Math.random() * 2;
      const offset = (Math.random() - 0.5) * 2.5;

      const stain = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.25, 8), stainMat);

      switch (dir) {
        case 0:
          stain.position.set(cx + offset, stainY, cell.z * TILE + WALL_T / 2 + 0.001);
          stain.rotation.y = 0;
          break;
        case 1:
          stain.position.set(cx + offset, stainY, cell.z * TILE + TILE - WALL_T / 2 - 0.001);
          stain.rotation.y = Math.PI;
          break;
        case 2:
          stain.position.set(cell.x * TILE + WALL_T / 2 + 0.001, stainY, cz + offset);
          stain.rotation.y = Math.PI / 2;
          break;
        case 3:
          stain.position.set(cell.x * TILE + TILE - WALL_T / 2 - 0.001, stainY, cz + offset);
          stain.rotation.y = -Math.PI / 2;
          break;
      }
      this.object3d.add(stain);
    }
  }

  _createFilingCabinet(cx, cz) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.5, roughness: 0.4 });
    const drawerMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.4, roughness: 0.5 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.7, roughness: 0.2 });

    const cab = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.4), metalMat);
    body.position.y = 0.5;
    cab.add(body);

    for (let i = 0; i < 3; i++) {
      const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.36), drawerMat);
      drawer.position.set(0, 0.15 + i * 0.28, 0.01);
      cab.add(drawer);

      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), handleMat);
      handle.position.set(0, 0.15 + i * 0.28, 0.2);
      cab.add(handle);
    }
    cab.position.set(cx, 0, cz);
    return cab;
  }

  _createShelf(cx, cz) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.3 });

    const shelf = new THREE.Group();

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.0, 0.3), metalMat);
    left.position.set(-0.35, 0.5, 0);
    shelf.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.0, 0.3), metalMat);
    right.position.set(0.35, 0.5, 0);
    shelf.add(right);

    for (let i = 0; i < 4; i++) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.025, 0.28), woodMat);
      board.position.set(0, 0.05 + i * 0.25, 0);
      shelf.add(board);
    }
    shelf.position.set(cx, 0, cz);
    return shelf;
  }

  _createWaterCooler(cx, cz) {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
    const blueMat = new THREE.MeshPhysicalMaterial({
      color: 0x88bbdd,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0,
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.3 });

    const cooler = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), baseMat);
    base.position.y = 0.35;
    cooler.add(base);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.4, 10), blueMat);
    tank.position.y = 0.9;
    cooler.add(tank);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.04, 10), metalMat);
    cap.position.y = 1.1;
    cooler.add(cap);

    const spigot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.06, 6), metalMat);
    spigot.position.set(0.12, 0.35, 0);
    spigot.rotation.z = Math.PI / 2;
    cooler.add(spigot);

    cooler.position.set(cx, 0, cz);
    return cooler;
  }

  _createProps() {
    const cells = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (this.grid[z][x] === 'r') cells.push({ x, z });
      }
    }

    const cabCells = cells.filter(() => Math.random() < 0.3);
    for (const cell of cabCells.slice(0, 4)) {
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      this.object3d.add(this._createFilingCabinet(cx, cz));
    }

    const shelfCells = cells.filter(() => Math.random() < 0.3);
    for (const cell of shelfCells.slice(0, 4)) {
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      this.object3d.add(this._createShelf(cx, cz));
    }

    const coolerCells = cells.filter(() => Math.random() < 0.15);
    for (const cell of coolerCells.slice(0, 2)) {
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 1.5;
      this.object3d.add(this._createWaterCooler(cx, cz));
    }
  }

  _createItemMesh(type) {
    const g = new THREE.Group();

    switch (type) {
      case 'almond_water': {
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xaaccee,
          transparent: true,
          opacity: 0.5,
          roughness: 0.1,
          metalness: 0,
          clearcoat: 0.3,
        });
        const liquidMat = new THREE.MeshPhysicalMaterial({
          color: 0x88bbdd,
          transparent: true,
          opacity: 0.6,
          roughness: 0,
          metalness: 0,
        });
        const labelMat = new THREE.MeshStandardMaterial({ color: 0x446688, roughness: 0.6 });
        const capMat = new THREE.MeshStandardMaterial({ color: 0x335577, roughness: 0.4 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.32, 12), glassMat);
        body.position.y = 0.16;
        g.add(body);

        const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.2, 12), liquidMat);
        liquid.position.y = 0.1;
        g.add(liquid);

        const label = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.1, 12), labelMat);
        label.position.y = 0.16;
        g.add(label);

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.04, 12), capMat);
        cap.position.y = 0.34;
        g.add(cap);

        break;
      }
      case 'flashlight': {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.3 });
        const headMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.2 });
        const lensMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.2, transparent: true, opacity: 0.6 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 10), bodyMat);
        body.rotation.x = Math.PI / 2;
        g.add(body);

        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.06, 10), headMat);
        head.rotation.x = Math.PI / 2;
        head.position.x = 0.16;
        g.add(head);

        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), lensMat);
        lens.position.x = 0.19;
        g.add(lens);

        const grip1 = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 10), gripMat);
        grip1.rotation.y = Math.PI / 2;
        grip1.position.x = -0.05;
        g.add(grip1);

        const grip2 = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 10), gripMat);
        grip2.rotation.y = Math.PI / 2;
        grip2.position.x = 0.05;
        g.add(grip2);

        const button = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.015), new THREE.MeshStandardMaterial({ color: 0xcc3333 }));
        button.position.set(0, 0.05, 0);
        g.add(button);

        break;
      }
      case 'batteries': {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 });
        const topMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.3 });
        const labelMat = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.6 });

        for (let i = -1; i <= 1; i += 2) {
          const bat = new THREE.Group();
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 8), bodyMat);
          body.position.y = 0.06;
          body.rotation.x = Math.PI / 2;
          bat.add(body);

          const label = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.03, 8), labelMat);
          label.position.y = 0.06;
          label.rotation.x = Math.PI / 2;
          label.position.x = 0.02;
          bat.add(label);

          const pos = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.015, 8), topMat);
          pos.position.y = 0.06;
          pos.rotation.x = Math.PI / 2;
          pos.position.x = 0.075;
          bat.add(pos);

          bat.position.x = i * 0.07;
          g.add(bat);
        }
        break;
      }
      case 'lighter': {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.3 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.3 });
        const fuelMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.025), bodyMat);
        body.position.y = 0.07;
        g.add(body);

        const fuel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.015), fuelMat);
        fuel.position.y = 0.05;
        g.add(fuel);

        const striker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.01), metalMat);
        striker.position.y = 0.14;
        g.add(striker);

        const top = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.02), metalMat);
        top.position.y = 0.145;
        g.add(top);

        break;
      }
      case 'medkit': {
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
        const crossMat = new THREE.MeshStandardMaterial({ color: 0xee2222 });
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdd1111 });

        const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.14), boxMat);
        box.position.y = 0.04;
        g.add(box);

        const stripeH = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.01), stripeMat);
        stripeH.position.set(0, 0.045, 0.07);
        g.add(stripeH);

        const stripeV = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.14), stripeMat);
        stripeV.position.set(0, 0.045, 0);
        g.add(stripeV);

        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), crossMat);
        crossH.position.set(0, 0.05, 0.05);
        g.add(crossH);

        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.06), crossMat);
        crossV.position.set(0, 0.05, 0.05);
        g.add(crossV);

        const lidLine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.002, 0.12), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
        lidLine.position.y = 0.075;
        g.add(lidLine);

        break;
      }
      case 'key': {
        const keyMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.7, roughness: 0.2 });

        const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.06), keyMat);
        shaft.position.set(0, 0.005, 0.03);
        g.add(shaft);

        const head = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 10), keyMat);
        head.position.set(0, 0.005, -0.02);
        g.add(head);

        const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.015), keyMat);
        tooth1.position.set(0, 0.005, 0.05);
        g.add(tooth1);

        const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.01), keyMat);
        tooth2.position.set(0, 0.005, 0.035);
        g.add(tooth2);

        break;
      }
      case 'note': {
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xeeddbb, roughness: 0.9 });
        const textMat = new THREE.MeshStandardMaterial({ color: 0x554433 });
        const paperGeo = new THREE.BoxGeometry(0.12, 0.005, 0.14);
        paperGeo.translate(0, 0.002, 0.03);

        const paper = new THREE.Mesh(paperGeo, paperMat);
        paper.position.y = 0.002;
        g.add(paper);

        const paper2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, 0.12), paperMat);
        paper2.position.set(0.002, 0.004, 0);
        paper2.rotation.z = 0.02;
        g.add(paper2);

        const lineMat = new THREE.MeshStandardMaterial({ color: 0x665544 });
        for (let i = 0; i < 4; i++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.001, 0.002), lineMat);
          line.position.set(0, 0.006, 0.04 - i * 0.025);
          g.add(line);
        }

        g.rotation.z = (Math.random() - 0.5) * 0.05;
        g.rotation.x = (Math.random() - 0.5) * 0.03;

        break;
      }
      default:
        return null;
    }
    return g;
  }

  _spawnItem(type, x, z) {
    const mesh = this._createItemMesh(type);
    if (!mesh) return;
    mesh.position.set(x, 0.05, z);
    this.object3d.add(mesh);
    this.interactables.push({
      mesh,
      type,
      position: new THREE.Vector3(x, 0.1, z),
    });
  }

  _createItems() {
    for (const [type, gx, gz] of ITEM_PLACEMENTS) {
      this._spawnItem(type, gx * TILE + TILE / 2, gz * TILE + TILE / 2);
    }
  }

  _placeEntities() {
    for (const [type, gx, gz, config] of ENTITY_PLACEMENTS) {
      this.entities.push({
        type,
        position: new THREE.Vector3(gx * TILE + TILE / 2, 0, gz * TILE + TILE / 2),
        speed: config.speed || 0,
        aggroRange: config.aggroRange || 0,
        patrolRadius: config.patrolRadius || 0,
        damage: config.damage || 0,
      });
    }
  }

  _createExit() {
    const px = 54 * TILE + TILE / 2;
    const pz = 13 * TILE + TILE / 2;

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.3 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.5 });
    const barMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, emissive: 0xcc2222, emissiveIntensity: 0.6 });
    const signGlowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.12), frameMat);
    frame.position.set(px, 1.3, pz);
    this.object3d.add(frame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.08), doorMat);
    door.position.set(px, 1.15, pz + 0.02);
    this.object3d.add(door);

    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.03), barMat);
    pushBar.position.set(px, 1.0, pz + 0.07);
    this.object3d.add(pushBar);

    const barL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), barMat);
    barL.position.set(px - 0.5, 1.0, pz + 0.07);
    barL.rotation.x = Math.PI / 2;
    this.object3d.add(barL);

    const barR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), barMat);
    barR.position.set(px + 0.5, 1.0, pz + 0.07);
    barR.rotation.x = Math.PI / 2;
    this.object3d.add(barR);

    const hingeMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.3 });
    for (const hz of [0.3, -0.3]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), hingeMat);
      hinge.position.set(px - 0.56, hz + 1.15, pz + 0.02);
      this.object3d.add(hinge);
    }

    const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.03), signMat);
    signBox.position.set(px, 2.6, pz + 0.06);
    this.object3d.add(signBox);

    const glowBg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.002), signGlowMat);
    glowBg.position.set(px, 2.6, pz + 0.075);
    this.object3d.add(glowBg);

    this.interactables.push({
      mesh: door,
      type: 'exit',
      position: new THREE.Vector3(px, 1.2, pz),
    });
  }

  getWallColliders() { return this.wallBoxes; }

  update(delta) {
    for (const light of this.lights) {
      light.userData.timer += delta;
      const f = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      light.intensity = 0.3 * Math.max(0.85, 1 - Math.abs(f * 0.15));
    }
  }

  getInteractables() { return this.interactables; }

  getThreatPositions() { return this.entities; }
}
