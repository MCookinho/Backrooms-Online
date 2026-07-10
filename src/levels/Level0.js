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

  _buildCeiling() {
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0xddccbb,
      roughness: 0.95,
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

  _createWallMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.wallDiff,
      normalMap: this.textures.wallNor,
      roughness: 0.85,
      color: 0xccbb77,
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
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xffeecc,
      emissive: 0xffeecc,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });

    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });

    const ambient = new THREE.AmbientLight(0xffeedd, 1.2);
    this.object3d.add(ambient);

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const cx = x * TILE + TILE / 2;
        const cz = z * TILE + TILE / 2;

        const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), fixtureMat);
        fixture.position.set(cx, ROOM_H - 0.04, cz);
        this.object3d.add(fixture);

        const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), panelMat);
        panel.rotation.x = Math.PI / 2;
        panel.position.set(cx, ROOM_H - 0.08, cz);
        this.object3d.add(panel);
      }
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

  _createProps() {
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6, metalness: 0.3 });
    const coolerMat = new THREE.MeshStandardMaterial({ color: 0xbbcccc, roughness: 0.2, transparent: true, opacity: 0.6 });

    const cells = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        const c = this.grid[z][x];
        if (c === 'r') cells.push({ x, z });
      }
    }

    for (let i = 0; i < Math.min(6, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 2;

      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.3), shelfMat);
      shelf.position.set(cx, 0.6, cz);
      this.object3d.add(shelf);

      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.25), shelfMat);
      s2.position.set(cx, 0.4, cz);
      this.object3d.add(s2);

      const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.25), shelfMat);
      s3.position.set(cx, 0.8, cz);
      this.object3d.add(s3);
    }

    for (let i = 0; i < Math.min(2, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 2;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 10), metalMat);
      body.position.set(cx, 0.4, cz);
      this.object3d.add(body);

      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.5, 10), coolerMat);
      tank.position.set(cx, 0.85, cz);
      this.object3d.add(tank);
    }
  }

  _spawnItem(type, x, z) {
    const g = new THREE.Group();
    switch (type) {
      case 'almond_water': {
        const bMat = new THREE.MeshStandardMaterial({ color: 0x88bbcc, transparent: true, opacity: 0.7, roughness: 0.2 });
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8), bMat);
        b.position.y = 0.15; g.add(b);
        const cMat = new THREE.MeshStandardMaterial({ color: 0x334455 });
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), cMat);
        c.position.y = 0.3; g.add(c);
        const lMat = new THREE.MeshStandardMaterial({ color: 0xaaddff });
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 8), lMat);
        l.position.y = 0.15; l.scale.set(1, 1, 1.01); g.add(l);
        break;
      }
      case 'flashlight': {
        const bMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8), bMat);
        b.rotation.x = Math.PI / 2; g.add(b);
        const hMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 });
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.04, 8), hMat);
        h.rotation.x = Math.PI / 2; h.position.x = 0.14; g.add(h);
        const lMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.1 });
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), lMat);
        l.position.x = 0.16; g.add(l);
        break;
      }
      case 'batteries': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xcc3333 });
        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), mat);
        b1.rotation.x = Math.PI / 2; g.add(b1);
        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6), mat);
        b2.rotation.x = Math.PI / 2; b2.position.set(0, 0, 0.1); g.add(b2);
        break;
      }
      case 'lighter': {
        const mat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.03), mat);
        b.position.y = 0.06; g.add(b);
        break;
      }
      case 'medkit': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xee4444 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), mat);
        box.position.y = 0.04; g.add(box);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        cross.position.set(0, 0.05, 0.06); g.add(cross);
        break;
      }
      case 'key': {
        const mat = new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.3 });
        const card = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.09), mat);
        card.position.y = 0.005; g.add(card);
        break;
      }
      case 'note': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xeeddbb });
        const n = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.12), mat);
        n.position.y = 0.01; g.add(n);
        break;
      }
      default: return;
    }
    g.position.set(x, 0.05, z);
    this.object3d.add(g);
    this.interactables.push({
      mesh: g,
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
    const exitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x445566, emissive: 0x223344, emissiveIntensity: 0.4 });

    const px = 54 * TILE + TILE / 2;
    const pz = 13 * TILE + TILE / 2;

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.1), exitMat);
    door.position.set(px, 1.2, pz);
    this.object3d.add(door);

    const glow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.05), glowMat);
    glow.position.set(px, 2.5, pz + 0.05);
    this.object3d.add(glow);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.05), glowMat);
    sign.position.set(px, 2.5, pz + 0.1);
    this.object3d.add(sign);

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
