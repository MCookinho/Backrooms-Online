import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;

const GW = 240;
const GH = 160;

const ITEM_PLACEMENTS = [
  ['flashlight', 16, 20],
  ['note', 12, 14],
  ['almond_water', 28, 7],
  ['almond_water', 46, 28],
  ['batteries', 65, 16],
  ['lighter', 85, 32],
  ['almond_water', 98, 12],
  ['note', 50, 55],
  ['batteries', 110, 50],
  ['medkit', 75, 88],
  ['almond_water', 135, 65],
  ['note', 180, 45],
  ['lighter', 160, 28],
  ['batteries', 90, 100],
  ['almond_water', 120, 115],
  ['medkit', 145, 95],
  ['note', 45, 85],
  ['note', 205, 78],
  ['batteries', 55, 135],
  ['almond_water', 100, 140],
  ['medkit', 175, 130],
  ['lighter', 215, 105],
  ['key', 226, 146],
  ['note', 224, 150],
  ['almond_water', 220, 142],
];

const ITEM_MODEL_MAP = {
  almond_water: 'water_bottle.glb', flashlight: '__procedural_flashlight',
  batteries: '__procedural_battery', lighter: 'lighter.glb',
  medkit: 'firstaid.glb', key: '__procedural_key', note: 'papers.glb',
};

const ITEM_SCALES = {
  almond_water: 0.0056,
  flashlight: 1,
  lighter: 0.00136,
  medkit: 25,
  key: 1,
  note: 0.00175,
};

const FURNITURE_SCALES = {
  water_cooler: 0.103,
};

const FURNITURE_MODEL_MAP = {
  water_cooler: 'water_cooler.glb',
};

function _makeMat(name, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    roughness: 0.85, metalness: 0, ...opts,
  });
  m.name = name;
  return m;
}

const ZONES = [
  // ── Row 0 (z:0-40) — Entry ground floor ──
  [0, 0, 32, 40, 'spawn', 0],
  [32, 0, 32, 40, 'rooms', 0],
  [64, 0, 20, 40, 'garden', 0],
  [84, 0, 32, 40, 'halls', 0],
  [116, 0, 32, 40, 'rooms_lg', 0],
  [148, 0, 20, 40, 'open', 0],
  [168, 0, 32, 40, 'halls', 0],
  [200, 0, 40, 40, 'rooms', 0],

  // ── Row 1 (z:40-80) — Mid ground level ──
  [0, 40, 28, 40, 'halls', 0],
  [28, 40, 32, 40, 'rooms_lg', 0],
  [60, 40, 24, 40, 'server', 0],
  [84, 40, 32, 40, 'maze', 0],
  [116, 40, 28, 40, 'halls', 0],
  [144, 40, 20, 40, 'open', 0],
  [164, 40, 32, 40, 'rooms', 0],
  [196, 40, 44, 40, 'rooms_lg', 0],

  // ── Row 2 (z:80-120) — Ground level, varied ──
  [0, 80, 28, 40, 'basement', 0],
  [28, 80, 32, 40, 'pits', 0],
  [60, 80, 24, 40, 'maze', 0],
  [84, 80, 32, 40, 'halls', 0],
  [116, 80, 28, 40, 'basement', 0],
  [144, 80, 20, 40, 'void', 0],
  [164, 80, 32, 40, 'pits', 0],
  [196, 80, 44, 40, 'halls', 0],

  // ── Row 3 (z:120-160) — Underground level ──
  [0, 120, 32, 40, 'basement', -1.5],
  [32, 120, 32, 40, 'rooms', -1.5],
  [64, 120, 24, 40, 'halls', -1.5],
  [88, 120, 32, 40, 'maze', -1.5],
  [120, 120, 32, 40, 'rooms_lg', -1.5],
  [152, 120, 20, 40, 'void', -1.5],
  [172, 120, 28, 40, 'basement', -1.5],
  [200, 120, 40, 40, 'void', -1.5],
];

const CONNECTORS = [
  // Row 0 → 1 (z=40 border, same height)
  [30, 38, 4, 4], [62, 38, 4, 4], [82, 38, 4, 4],
  [114, 38, 4, 4], [146, 38, 4, 4], [166, 38, 4, 4], [198, 38, 4, 4],

  // Row 1 → 2 (z=80 border, same height)
  [26, 78, 4, 4], [58, 78, 4, 4], [82, 78, 4, 4],
  [114, 78, 4, 4], [142, 78, 4, 4], [162, 78, 4, 4], [194, 78, 4, 4],

  // Row 2 → 3 (z=120 border, different height — 1-tide-wide ramps)
  [14, 118, 1, 4], [46, 118, 1, 4], [74, 118, 1, 4],
  [102, 118, 1, 4], [132, 118, 1, 4], [158, 118, 1, 4],
  [184, 118, 1, 4], [220, 118, 1, 4],

  // Vertical connectors — zone borders within each row
  [31, 0, 2, 40], [63, 0, 2, 40], [83, 0, 2, 40],
  [115, 0, 2, 40], [147, 0, 2, 40], [167, 0, 2, 40], [199, 0, 2, 40],

  [27, 40, 2, 40], [59, 40, 2, 40], [83, 40, 2, 40],
  [115, 40, 2, 40], [143, 40, 2, 40], [163, 40, 2, 40], [195, 40, 2, 40],

  [27, 80, 2, 40], [59, 80, 2, 40], [83, 80, 2, 40],
  [115, 80, 2, 40], [143, 80, 2, 40], [163, 80, 2, 40], [195, 80, 2, 40],

  [31, 120, 2, 40], [63, 120, 2, 40], [87, 120, 2, 40],
  [119, 120, 2, 40], [151, 120, 2, 40], [171, 120, 2, 40], [199, 120, 2, 40],

  // Diagonal shortcut passages
  [44, 44, 3, 4], [94, 18, 3, 4], [140, 95, 3, 4],
  [178, 60, 3, 4], [210, 25, 3, 4], [36, 100, 3, 4],
];

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3(16 * TILE, 0, 20 * TILE);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.grid = null;
    this.heightMap = null;
    this.textures = {};
    this.models = {};
    this._walkableTiles = [];
  }

  _genLayout() {
    this.grid = Array.from({ length: GH }, () => Array(GW).fill(' '));
    this.heightMap = Array.from({ length: GH }, () => Array(GW).fill(0));

    this._genZones();

    const connectorTiles = new Set();
    this._applyConnectors(connectorTiles);
    this._punchDoorways();
    this._wallHeightBorders(connectorTiles);
    this._clearSpawn();
    this._clearExit();
    this._collectWalkableTiles();
  }

  _genZones() {
    for (const [xz, zz, w, d, type, baseH = 0] of ZONES) {
      for (let dz = 0; dz < d; dz++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = xz + dx, cz = zz + dz;
          if (cx < 0 || cx >= GW || cz < 0 || cz >= GH) continue;
          this.heightMap[cz][cx] = baseH;

          if (type === 'void') {
            if (Math.random() < 0.35) this.grid[cz][cx] = '.';
            continue;
          }

          if (type === 'pits') {
            if (Math.random() < 0.55) {
              this.grid[cz][cx] = '.';
              if (Math.random() < 0.12) {
                this.grid[cz][cx] = ' ';
                this.heightMap[cz][cx] = baseH - 2.0;
              }
            }
            continue;
          }

          if (type === 'basement') {
            this.grid[cz][cx] = '.';
            if (Math.random() < 0.12) this.grid[cz][cx] = ' ';
            continue;
          }

          if (type === 'spawn') {
            this.grid[cz][cx] = 'S';
            continue;
          }

          if (type === 'garden') {
            if (Math.random() < 0.85) {
              this.grid[cz][cx] = '.';
              if (Math.random() < 0.2) this.grid[cz][cx] = 'r';
            }
            continue;
          }

          if (type === 'server') {
            this.grid[cz][cx] = '.';
            const row = Math.floor(dz / 3);
            if (row % 2 === 0 && dz % 3 === 1 && dx % 2 === 0 && dx > 0 && dx < w - 1) {
              this.grid[cz][cx] = 'r';
            }
            if (Math.random() < 0.08) this.grid[cz][cx] = ' ';
            continue;
          }

          if (type === 'open') {
            if (Math.random() < 0.88) this.grid[cz][cx] = '.';
            continue;
          }

          if (type === 'rooms') {
            const cellX = Math.floor(dx / 5), cellZ = Math.floor(dz / 5);
            const locX = dx % 5, locZ = dz % 5;
            if (cellX % 2 === 0 && cellZ % 2 === 0) {
              if (locX >= 1 && locX <= 3 && locZ >= 1 && locZ <= 3) {
                this.grid[cz][cx] = 'r';
              } else if (locX === 0 || locX === 4 || locZ === 0 || locZ === 4) {
                this.grid[cz][cx] = '.';
              }
            } else {
              if (Math.random() < 0.2) this.grid[cz][cx] = '.';
            }
            continue;
          }

          if (type === 'rooms_lg') {
            const cellX = Math.floor(dx / 7), cellZ = Math.floor(dz / 7);
            const locX = dx % 7, locZ = dz % 7;
            if (cellX % 2 === 0 && cellZ % 2 === 0) {
              if (locX >= 1 && locX <= 5 && locZ >= 1 && locZ <= 5) {
                this.grid[cz][cx] = 'r';
              } else if (locX === 0 || locX === 6 || locZ === 0 || locZ === 6) {
                this.grid[cz][cx] = '.';
              }
            } else {
              if (Math.random() < 0.2) this.grid[cz][cx] = '.';
            }
            continue;
          }

          if (type === 'halls') {
            if (Math.random() < 0.72) this.grid[cz][cx] = '.';
            continue;
          }

          if (type === 'maze') {
            const r = Math.random();
            if (r < 0.55) {
              this.grid[cz][cx] = Math.random() < 0.5 ? '.' : 'r';
            }
            continue;
          }
        }
      }
    }
  }

  _applyConnectors(connectorTiles) {
    for (const [cx, cz, cw, ch] of CONNECTORS) {
      for (let dz = 0; dz < ch; dz++) {
        for (let dx = 0; dx < cw; dx++) {
          const tx = cx + dx, tz = cz + dz;
          if (tx < 0 || tx >= GW || tz < 0 || tz >= GH) continue;
          connectorTiles.add(`${tx},${tz}`);
          if (this.grid[tz][tx] === ' ') {
            this.grid[tz][tx] = '.';
          }
          this.heightMap[tz][tx] = this._getZoneBaseH(tx, tz);
        }
      }
    }
  }

  _getZoneBaseH(x, z) {
    for (const [zx, zz, zw, zd, _t, baseH = 0] of ZONES) {
      if (x >= zx && x < zx + zw && z >= zz && z < zz + zd) return baseH;
    }
    return 0;
  }

  _punchDoorways() {
    for (let z = 1; z < GH - 1; z++) {
      for (let x = 1; x < GW - 1; x++) {
        if (this.grid[z][x] !== ' ') continue;
        if (Math.random() > 0.25) continue;
        const neighbors = [];
        if (this.grid[z][x - 1] === 'r') neighbors.push({x: x - 1, z});
        if (this.grid[z][x + 1] === 'r') neighbors.push({x: x + 1, z});
        if (this.grid[z - 1][x] === 'r') neighbors.push({x, z: z - 1});
        if (this.grid[z + 1][x] === 'r') neighbors.push({x, z: z + 1});
        if (neighbors.length >= 2) {
          this.grid[z][x] = '.';
        }
      }
    }
  }

  _wallHeightBorders(connectorTiles) {
    const toRemove = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (this.grid[z][x] === ' ') continue;
        const key = `${x},${z}`;
        if (connectorTiles.has(key)) continue;
        const h = this._getHeight(x, z);
        for (const [nx, nz] of [[x+1,z],[x-1,z],[x,z+1],[x,z-1]]) {
          if (nx < 0 || nx >= GW || nz < 0 || nz >= GH) continue;
          if (this.grid[nz][nx] === ' ') continue;
          const nKey = `${nx},${nz}`;
          if (connectorTiles.has(nKey)) continue;
          const nh = this._getHeight(nx, nz);
          if (Math.abs(nh - h) > 0.01) {
            if (h < nh) toRemove.push({x, z});
            else toRemove.push({x: nx, z: nz});
            break;
          }
        }
      }
    }
    for (const {x, z} of toRemove) {
      this.grid[z][x] = ' ';
    }
  }

  _clearSpawn() {
    const sx = 16, sz = 20;
    for (let dz = -5; dz <= 5; dz++)
      for (let dx = -5; dx <= 5; dx++) {
        const tx = sx + dx, tz = sz + dz;
        if (tx >= 0 && tx < GW && tz >= 0 && tz < GH) {
          this.grid[tz][tx] = 'S';
          this.heightMap[tz][tx] = 0;
        }
      }
  }

  _clearExit() {
    const ex = 228, ez = 148;
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const tx = ex + dx, tz = ez + dz;
        if (tx >= 0 && tx < GW && tz >= 0 && tz < GH) {
          this.grid[tz][tx] = 'E';
          this.heightMap[tz][tx] = this._getZoneBaseH(tx, tz);
        }
      }

    for (let z = 140; z <= 155; z++)
      for (let x = 220; x <= 235; x++) {
        if (z >= 0 && z < GH && x >= 0 && x < GW) {
          this.grid[z][x] = '.';
          this.heightMap[z][x] = this._getZoneBaseH(x, z);
        }
      }
  }

  _collectWalkableTiles() {
    this._walkableTiles = [];
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] !== ' ') this._walkableTiles.push({ x, z });
  }

  async load(scene) {
    this.object3d = new THREE.Group();
    scene.add(this.object3d);
    this._genLayout();
    this.textureLoader = new THREE.TextureLoader();
    this.spawnPoint = this._findSpawnPoint();
    await this._loadAssets();
    this._buildLevel();
  }

  _findSpawnPoint() {
    let bestX = 8, bestZ = 8, bestScore = -1;
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (this.grid[z][x] !== 'S') continue;
        let score = 0;
        for (let dz = -3; dz <= 3; dz++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx, nz = z + dz;
            if (nx >= 0 && nx < GW && nz >= 0 && nz < GH && this.grid[nz][nx] !== ' ')
              score++;
          }
        }
        if (score > bestScore) { bestScore = score; bestX = x; bestZ = z; }
      }
    }
    return new THREE.Vector3((bestX + 0.5) * TILE, this.heightMap[bestZ][bestX], (bestZ + 0.5) * TILE);
  }

  async _loadAssets() {
    const base = window.location.pathname.replace(/\/[^/]*$/, '') || '.';
    const loadTex = (key, path, rx, ry) => {
      const t = this.textureLoader.load(`${base}/assets/textures/${path}`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      this.textures[key] = t;
    };
    loadTex('floorDiff', 'backrooms-level-0/backrooms-carpet-diffuse.png', 3, 3);
    loadTex('floorNorm', 'backrooms-level-0/backrooms-carpet-normal.png', 3, 3);
    loadTex('wallDiff', 'backrooms-level-0/backrooms-wall-diffuse.png', 2, 2);
    loadTex('wallNor', 'backrooms-level-0/backrooms-wall-normal.png', 2, 2);
    loadTex('ceilDiff', 'backrooms-level-0/backrooms-ceiling-tile-diffuse.png', 3, 3);
    loadTex('ceilNor', 'backrooms-level-0/backrooms-ceiling-tile-normal.png', 3, 3);
    loadTex('ceilRough', 'backrooms-level-0/backrooms-ceiling-tile-roughness.png', 3, 3);
    loadTex('fixtureDiff', 'backrooms-level-0/backrooms-ceiling-light-diffuse.png', 1, 1);
    loadTex('fixtureEmit', 'backrooms-level-0/backrooms-ceiling-light-emission.png', 1, 1);

    const loadModel = (key, filename) => new Promise(resolve => {
      const loader = new GLTFLoader();
      loader.load(
        `${base}/assets/models/${filename}`,
        gltf => { this.models[key] = gltf.scene; resolve(); },
        undefined,
        () => { this.models[key] = new THREE.Group(); resolve(); }
      );
    });

    const modelPromises = [];
    const seen = new Set();
    for (const key of Object.values(ITEM_MODEL_MAP)) {
      if (!key.endsWith('.glb')) continue;
      const name = key.replace('.glb', '');
      if (!seen.has(name)) { seen.add(name); modelPromises.push(loadModel(name, key)); }
    }
    for (const key of Object.values(FURNITURE_MODEL_MAP)) {
      if (!key.endsWith('.glb')) continue;
      const name = key.replace('.glb', '');
      if (!seen.has(name)) { seen.add(name); modelPromises.push(loadModel(name, key)); }
    }
    await Promise.all(modelPromises);
  }

  unload() {
    if (this.object3d.parent) this.object3d.parent.remove(this.object3d);
    this.object3d.traverse(c => {
      if (c.isMesh) {
        c.geometry.dispose();
        (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
      }
    });
  }

  _buildLevel() {
    this._buildUnderFloor();
    this._buildFloor();
    this._buildCeiling();
    this._buildFloorSteps();
    this._buildCeilingSteps();
    this._buildWalls();
    this._buildBaseboards();
    this._buildRamps();
    this._buildPitWalls();
    this._buildPitFloors();
    this._buildWallDecorations();
    this._createLights();
    this._createProps();
    this._createItems();
    this._createExit();
  }

  _getHeight(x, z) {
    if (x < 0 || x >= GW || z < 0 || z >= GH) return 0;
    return this.heightMap ? this.heightMap[z][x] : 0;
  }

  _isWalkable(x, z) {
    return x >= 0 && x < GW && z >= 0 && z < GH && this.grid[z][x] !== ' ';
  }

  _buildUnderFloor() {
    const mat = _makeMat('underfloor', { color: 0x111111, roughness: 1, metalness: 0 });
    const geom = new THREE.PlaneGeometry(GW * TILE, GH * TILE);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(GW * TILE / 2, -2.5, GH * TILE / 2);
    mesh.renderOrder = -1;
    this.object3d.add(mesh);
  }

  _buildFloor() {
    const mat = _makeMat('floor', {
      map: this.textures.floorDiff, normalMap: this.textures.floorNorm,
      roughness: 0.9, side: THREE.DoubleSide,
    });
    const floorTiles = this._walkableTiles.filter(({ x, z }) => {
      const h = this._getHeight(x, z);
      for (const [nx, nz] of [[x+1,z],[x,z+1]]) {
        if (nx >= GW || nz >= GH) continue;
        if (!this._isWalkable(nx, nz)) continue;
        const nh = this._getHeight(nx, nz);
        const dh = Math.abs(nh - h);
        if (dh >= 0.1 && dh <= 2.0) return false;
      }
      return true;
    });
    const geom = new THREE.PlaneGeometry(TILE, TILE);
    const count = floorTiles.length;
    if (count === 0) return;
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const { x, z } = floorTiles[i];
      const h = this._getHeight(x, z);
      dummy.position.set(x * TILE + TILE / 2, h, z * TILE + TILE / 2);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.object3d.add(mesh);
  }

  _buildCeiling() {
    const mat = _makeMat('ceiling', {
      map: this.textures.ceilDiff, normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough, color: 0xeee8e0,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.PlaneGeometry(TILE, TILE);
    const count = this._walkableTiles.length;
    if (count === 0) return;
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const { x, z } = this._walkableTiles[i];
      const h = this._getHeight(x, z);
      dummy.position.set(x * TILE + TILE / 2, h + ROOM_H, z * TILE + TILE / 2);
      dummy.rotation.x = Math.PI / 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.object3d.add(mesh);
  }

  _buildFloorSteps() {
    const mat = _makeMat('floorStep', {
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85,
    });
    const geoms = [];
    for (const { x, z } of this._walkableTiles) {
      const h = this._getHeight(x, z);
      for (const [nx, nz] of [[x+1,z],[x,z+1]]) {
        if (nx >= GW || nz >= GH || !this._isWalkable(nx, nz)) continue;
        const nh = this._getHeight(nx, nz);
        const dh = Math.abs(nh - h);
        if (dh <= 0.01 || (dh >= 0.1 && dh <= 2.0)) continue;
        const isX = nx !== x;
        const w = isX ? WALL_T : TILE;
        const d = isX ? TILE : WALL_T;
        const g = new THREE.BoxGeometry(w, dh, d);
        const cx = isX ? (x + 1) * TILE : x * TILE + TILE / 2;
        const cz = isX ? z * TILE + TILE / 2 : (z + 1) * TILE;
        g.translate(cx, Math.min(h, nh) + dh / 2, cz);
        geoms.push(g);
      }
    }
    if (geoms.length > 0) {
      const merged = mergeGeoms(geoms);
      this.object3d.add(new THREE.Mesh(merged, mat));
    }
  }

  _buildCeilingSteps() {
    const mat = _makeMat('ceilStep', {
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85,
    });
    const geoms = [];
    for (const { x, z } of this._walkableTiles) {
      const h = this._getHeight(x, z) + ROOM_H;
      for (const [nx, nz] of [[x+1,z],[x,z+1]]) {
        if (nx >= GW || nz >= GH || !this._isWalkable(nx, nz)) continue;
        const nh = this._getHeight(nx, nz) + ROOM_H;
        const dh = Math.abs(nh - h);
        if (dh <= 0.01) continue;
        const isX = nx !== x;
        const w = isX ? WALL_T : TILE;
        const d = isX ? TILE : WALL_T;
        const g = new THREE.BoxGeometry(w, dh, d);
        const cx = isX ? (x + 1) * TILE : x * TILE + TILE / 2;
        const cz = isX ? z * TILE + TILE / 2 : (z + 1) * TILE;
        g.translate(cx, Math.min(h, nh) + dh / 2, cz);
        geoms.push(g);
      }
    }
    if (geoms.length > 0) {
      const merged = mergeGeoms(geoms);
      this.object3d.add(new THREE.Mesh(merged, mat));
    }
  }

  _buildWalls() {
    const wallMat = _makeMat('wall', {
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85,
    });

    const geomsX = [];
    const geomsZ = [];

    for (const { x, z } of this._walkableTiles) {
      const h = this._getHeight(x, z);
      const cx = x * TILE + TILE / 2, cz = z * TILE + TILE / 2;

      const addWall = (nx, nz, isX, neighborX, neighborZ) => {
        if (this._isWalkable(neighborX, neighborZ)) return;
        const w = isX ? TILE : WALL_T;
        const d = isX ? WALL_T : TILE;
        const g = new THREE.BoxGeometry(w, ROOM_H, d);
        g.translate(nx, h + ROOM_H / 2, nz);
        (isX ? geomsX : geomsZ).push(g);
      };

      if (z === 0 || !this._isWalkable(x, z - 1))
        addWall(cx, z * TILE, true, x, z - 1);
      if (z === GH - 1 || !this._isWalkable(x, z + 1))
        addWall(cx, z * TILE + TILE, true, x, z + 1);
      if (x === 0 || !this._isWalkable(x - 1, z))
        addWall(x * TILE, cz, false, x - 1, z);
      if (x === GW - 1 || !this._isWalkable(x + 1, z))
        addWall(x * TILE + TILE, cz, false, x + 1, z);
    }

    const merge = (geoms, mat) => {
      if (geoms.length === 0) return;
      const merged = mergeGeoms(geoms);
      const mesh = new THREE.Mesh(merged, mat);
      this.object3d.add(mesh);
    };

    merge(geomsX, wallMat);
    merge(geomsZ, wallMat);
  }

  _buildBaseboards() {
    const mat = _makeMat('baseboard', {
      color: 0xe8e0d5, roughness: 0.7, metalness: 0,
    });
    const geoms = [];
    const bh = 0.13;
    const bp = 0.04;
    for (const { x, z } of this._walkableTiles) {
      const h = this._getHeight(x, z);
      const cx = x * TILE + TILE / 2, cz = z * TILE + TILE / 2;

      const addBase = (nx, nz, isX, nX, nZ) => {
        if (this._isWalkable(nX, nZ)) return;
        const w = isX ? TILE : WALL_T + bp;
        const d = isX ? WALL_T + bp : TILE;
        const g = new THREE.BoxGeometry(w, bh, d);
        g.translate(nx, h + bh / 2, nz);
        geoms.push(g);
      };

      if (z === 0 || !this._isWalkable(x, z - 1))
        addBase(cx, z * TILE, true, x, z - 1);
      if (z === GH - 1 || !this._isWalkable(x, z + 1))
        addBase(cx, z * TILE + TILE, true, x, z + 1);
      if (x === 0 || !this._isWalkable(x - 1, z))
        addBase(x * TILE, cz, false, x - 1, z);
      if (x === GW - 1 || !this._isWalkable(x + 1, z))
        addBase(x * TILE + TILE, cz, false, x + 1, z);
    }
    if (geoms.length > 0) {
      this.object3d.add(new THREE.Mesh(mergeGeoms(geoms), mat));
    }
  }

  _buildWallDecorations() {
    const rng = () => Math.random();

    for (const { x, z } of this._walkableTiles) {
      const h = this._getHeight(x, z);
      const cx = x * TILE + TILE / 2, cz = z * TILE + TILE / 2;

      const tryDeco = (nx, nz, isX, nX, nZ) => {
        if (this._isWalkable(nX, nZ)) return;
        if (rng() > 0.13) return;

        const wallH = ROOM_H;
        const decoX = isX ? nx : (x * TILE + TILE / 2);
        const decoZ = isX ? (z * TILE + TILE / 2) : nz;
        const wallDir = isX ? 'z' : 'x';

        const kind = rng();
        if (kind < 0.33) {
          const outletGroup = new THREE.Group();
          const faceZ = (nz === z * TILE) ? nz + WALL_T / 2 + 0.003 : nz - WALL_T / 2 - 0.003;
          const faceX = (nx === x * TILE) ? nx + WALL_T / 2 + 0.003 : nx - WALL_T / 2 - 0.003;
          outletGroup.position.set(
            wallDir === 'z' ? decoX : faceX,
            h + 0.14,
            wallDir === 'z' ? faceZ : decoZ
          );

          const plateMat = _makeMat('outlet', { color: 0xf0ece4, roughness: 0.6, metalness: 0 });
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.068, 0.004), plateMat);
          outletGroup.add(plate);

          const slotMat = _makeMat('outletSlot', { color: 0x2a2520, roughness: 0.9 });
          for (const sx of [-0.011, 0.011]) {
            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.020, 0.006), slotMat);
            slot.position.set(sx, 0.006, 0.001);
            outletGroup.add(slot);
          }

          const gndMat = _makeMat('outletGround', { color: 0x2a2520, roughness: 0.9 });
          const gnd = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.006), gndMat);
          gnd.position.set(0, -0.010, 0.001);
          outletGroup.add(gnd);

          const screwMat = _makeMat('outletScrew', { color: 0xbbb8b0, roughness: 0.2, metalness: 0.3 });
          for (const sy of [-0.028, 0.028]) {
            const screw = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.005), screwMat);
            screw.position.set(0, sy, 0.001);
            outletGroup.add(screw);
          }

          if (wallDir === 'x') outletGroup.rotation.y = Math.PI / 2;
          this.object3d.add(outletGroup);
        } else if (kind < 0.66) {
          const frameStyles = [
            { color: 0xc8b898, roughness: 0.3, metalness: 0.05 },  // warm wood
            { color: 0x3a3028, roughness: 0.6, metalness: 0.02 },  // dark wood
            { color: 0x222222, roughness: 0.7, metalness: 0 },     // black
            { color: 0xe8e0d8, roughness: 0.5, metalness: 0 },     // white
            { color: 0x887050, roughness: 0.6, metalness: 0 },     // rustic
            { color: 0xd4b88a, roughness: 0.2, metalness: 0.15 },  // gold
          ];
          const fs = frameStyles[Math.floor(rng() * frameStyles.length)];
          const frameMat = _makeMat('frame', fs);
          const portrait = rng() < 0.5;
          const fw = portrait ? 0.12 + rng() * 0.06 : 0.16 + rng() * 0.12;
          const fh = portrait ? 0.16 + rng() * 0.10 : 0.10 + rng() * 0.06;
          const borderW = Math.max(0.015, fw * 0.10);
          const fy = h + 0.5 + rng() * (wallH - 0.8);
          const frameGroup = new THREE.Group();
          const fFaceZ = (nz === z * TILE) ? nz + WALL_T / 2 + 0.003 : nz - WALL_T / 2 - 0.003;
          const fFaceX = (nx === x * TILE) ? nx + WALL_T / 2 + 0.003 : nx - WALL_T / 2 - 0.003;
          frameGroup.position.set(
            wallDir === 'z' ? decoX : fFaceX,
            fy,
            wallDir === 'z' ? fFaceZ : decoZ
          );

          const hw = fw / 2, hh = fh / 2, bw = borderW;
          const openW = fw - bw * 2, openH = fh - bw * 2;
          const fd = 0.008;
          const framePieces = [
            [0, hh - bw / 2, fw, bw],
            [0, -(hh - bw / 2), fw, bw],
            [-(hw - bw / 2), 0, bw, openH],
            [hw - bw / 2, 0, bw, openH],
          ];
          for (const [fx, fy, fw2, fh2] of framePieces) {
            const piece = new THREE.Mesh(new THREE.BoxGeometry(fw2, fh2, fd), frameMat);
            piece.position.set(fx, fy, 0);
            frameGroup.add(piece);
          }

          const innerColors = [
            0xf5f0e8, 0xe8e0d0, 0xd8d0c0, 0xf0ebe0, 0xe0d8cc,
            0xb8c0b0, 0xc8b8a0, 0xd0c8d0, 0xe8dcd0, 0xa8a898,
          ];
          const ic = innerColors[Math.floor(rng() * innerColors.length)];
          const innerMat = _makeMat('frameInner', { color: ic, roughness: 0.6 });
          const inner = new THREE.Mesh(new THREE.BoxGeometry(openW, openH, fd * 0.6), innerMat);
          inner.position.z = -0.001;
          frameGroup.add(inner);

          if (rng() < 0.25) {
            const accentMat = _makeMat('frameAccent', {
              color: innerColors[Math.floor(rng() * innerColors.length)],
              roughness: 0.5,
            });
            const aw = openW * 0.4, ah = openH * 0.2;
            const accent = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, fd * 0.7), accentMat);
            accent.position.z = 0.001;
            frameGroup.add(accent);
          }

          if (wallDir === 'x') frameGroup.rotation.y = Math.PI / 2;
          this.object3d.add(frameGroup);
        } else {
          const scratchMat = _makeMat('scratch', { color: 0x55504a, roughness: 0.6 });
          const sw = wallDir === 'z' ? 0.002 + rng() * 0.015 : 0.025 + rng() * 0.04;
          const sh = 0.002 + rng() * 0.004;
          const sd = wallDir === 'z' ? 0.025 + rng() * 0.04 : 0.002 + rng() * 0.015;
          const scratch = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), scratchMat);
          const sy = h + 0.15 + rng() * (wallH - 0.3);
          const sFaceZ = (nz === z * TILE) ? nz + WALL_T / 2 + 0.002 : nz - WALL_T / 2 - 0.002;
          const sFaceX = (nx === x * TILE) ? nx + WALL_T / 2 + 0.002 : nx - WALL_T / 2 - 0.002;
          scratch.position.set(
            wallDir === 'z' ? decoX : sFaceX,
            sy,
            wallDir === 'z' ? sFaceZ : decoZ
          );
          if (wallDir === 'x') scratch.rotation.y = Math.PI / 2;
          this.object3d.add(scratch);
        }
      };

      if (z === 0 || !this._isWalkable(x, z - 1))
        tryDeco(cx, z * TILE, true, x, z - 1);
      if (z === GH - 1 || !this._isWalkable(x, z + 1))
        tryDeco(cx, z * TILE + TILE, true, x, z + 1);
      if (x === 0 || !this._isWalkable(x - 1, z))
        tryDeco(x * TILE, cz, false, x - 1, z);
      if (x === GW - 1 || !this._isWalkable(x + 1, z))
        tryDeco(x * TILE + TILE, cz, false, x + 1, z);
    }
  }

  _buildRamps() {
    const rampMat = _makeMat('ramp', {
      map: this.textures.floorDiff, normalMap: this.textures.floorNorm,
      roughness: 0.9, side: THREE.DoubleSide,
    });
    const sideMat = _makeMat('rampSide', {
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85,
    });
    const rampGeoms = [];
    const sideGeoms = [];

    for (const { x, z } of this._walkableTiles) {
      const h = this._getHeight(x, z);
      for (const [nx, nz] of [[x + 1, z], [x, z + 1], [x - 1, z], [x, z - 1]]) {
        if (nx < 0 || nx >= GW || nz < 0 || nz >= GH) continue;
        if (!this._isWalkable(nx, nz)) continue;
        const nh = this._getHeight(nx, nz);
        const dh = nh - h;
        if (Math.abs(dh) < 0.1 || Math.abs(dh) > 2.0) continue;

        const isX = nx !== x;
        const ox = isX ? Math.min(x, nx) : x;
        const oz = isX ? z : Math.min(z, nz);
        if (x !== ox || z !== oz) continue;

        const px = ox * TILE, pz = oz * TILE;
        const oh = this._getHeight(ox, oz);
        const oNh = isX ? this._getHeight(ox + 1, oz) : this._getHeight(ox, oz + 1);
        const absDh = Math.abs(oNh - oh);

        if (isX) {
          const verts = new Float32Array([
            px, oh, pz, px + TILE, oNh, pz + TILE, px + TILE, oNh, pz,
            px, oh, pz, px, oh, pz + TILE, px + TILE, oNh, pz + TILE,
          ]);
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
            0, 0, 1, 1, 1, 0,
            0, 0, 0, 1, 1, 1,
          ]), 2));
          g.computeVertexNormals();
          rampGeoms.push(g);
        } else {
          const verts = new Float32Array([
            px, oh, pz, px + TILE, oNh, pz + TILE, px + TILE, oh, pz,
            px, oh, pz, px, oNh, pz + TILE, px + TILE, oNh, pz + TILE,
          ]);
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
            0, 0, 1, 1, 1, 0,
            0, 0, 0, 1, 1, 1,
          ]), 2));
          g.computeVertexNormals();
          rampGeoms.push(g);
        }

        const sw = WALL_T;
        if (isX) {
          for (const sz of [pz, pz + TILE]) {
            const az = (sz === pz) ? oz - 1 : oz + 1;
            if (az >= 0 && az < GH &&
                this._isWalkable(ox, az) && this._isWalkable(ox + 1, az)) {
              const dh2 = Math.abs(this._getHeight(ox + 1, az) - this._getHeight(ox, az));
              if (dh2 >= 0.1 && dh2 <= 2.0) continue;
            }
            const sg = new THREE.BoxGeometry(TILE, absDh, sw);
            sg.translate(px + TILE / 2, Math.min(oh, oNh) + absDh / 2, sz);
            sideGeoms.push(sg);
          }
        } else {
          for (const sx of [px, px + TILE]) {
            const ax = (sx === px) ? ox - 1 : ox + 1;
            if (ax >= 0 && ax < GW &&
                this._isWalkable(ax, oz) && this._isWalkable(ax, oz + 1)) {
              const dh2 = Math.abs(this._getHeight(ax, oz + 1) - this._getHeight(ax, oz));
              if (dh2 >= 0.1 && dh2 <= 2.0) continue;
            }
            const sg = new THREE.BoxGeometry(sw, absDh, TILE);
            sg.translate(sx, Math.min(oh, oNh) + absDh / 2, pz + TILE / 2);
            sideGeoms.push(sg);
          }
        }
      }
    }

    if (rampGeoms.length > 0) {
      this.object3d.add(new THREE.Mesh(mergeGeoms(rampGeoms), rampMat));
    }
    if (sideGeoms.length > 0) {
      this.object3d.add(new THREE.Mesh(mergeGeoms(sideGeoms), sideMat));
    }
  }

  _buildPitWalls() {
    const pitMat = _makeMat('pitwall', {
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85,
    });
    const pitGeoms = [];

    for (const { x, z } of this._walkableTiles) {
      const h = this._getHeight(x, z);
      for (const [dx, dz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nx >= GW || nz < 0 || nz >= GH) continue;
        if (this.grid[nz][nx] !== ' ') continue;
        const nh = this._getHeight(nx, nz);
        if (nh < -1.0) {
          const isX = dz !== 0;
          const w = isX ? TILE : WALL_T;
          const d = isX ? WALL_T : TILE;
          const dropH = h - nh;
          const g = new THREE.BoxGeometry(w, dropH, d);
          const px = x * TILE + TILE / 2 + dx * TILE / 2;
          const pz = z * TILE + TILE / 2 + dz * TILE / 2;
          g.translate(px, h - dropH / 2, pz);
          pitGeoms.push(g);
        }
      }
    }

    if (pitGeoms.length > 0) {
      const merged = mergeGeoms(pitGeoms);
      this.object3d.add(new THREE.Mesh(merged, pitMat));
    }
  }

  _buildPitFloors() {
    const mat = _makeMat('pitFloor', {
      map: this.textures.floorDiff, normalMap: this.textures.floorNorm,
      roughness: 0.95, side: THREE.DoubleSide, color: 0x555555,
    });
    const pitTiles = [];
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] === ' ' && this._getHeight(x, z) < -1.0)
          pitTiles.push({ x, z });
    if (pitTiles.length === 0) return;
    const geom = new THREE.PlaneGeometry(TILE, TILE);
    const mesh = new THREE.InstancedMesh(geom, mat, pitTiles.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < pitTiles.length; i++) {
      const { x, z } = pitTiles[i];
      const h = this._getHeight(x, z);
      dummy.position.set(x * TILE + TILE / 2, h, z * TILE + TILE / 2);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.object3d.add(mesh);
  }

  _createLights() {
    const ambient = new THREE.AmbientLight(0xffdd99, 0.45);
    this.object3d.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfff0d0, 0x887755, 0.35);
    this.object3d.add(hemi);

    const dir = new THREE.DirectionalLight(0xffdd88, 0.3);
    dir.position.set(0, 10, 0);
    this.object3d.add(dir);

    const fixtureMat = _makeMat('fixture', {
      map: this.textures.fixtureDiff, roughness: 0.4, metalness: 0,
      emissiveMap: this.textures.fixtureEmit, emissive: 0xffe8bb, emissiveIntensity: 3.0,
    });

    const fGeom = new THREE.BoxGeometry(1.6, 0.05, 0.25);
    const positions = [];

    for (const { x, z } of this._walkableTiles) {
      if (x % 6 !== 2 || z % 6 !== 2) continue;
      const h = this._getHeight(x, z);
      positions.push({ x: x * TILE + TILE / 2, h, z: z * TILE + TILE / 2 });
    }

    if (positions.length > 0) {
      const fMesh = new THREE.InstancedMesh(fGeom, fixtureMat, positions.length);
      const d = new THREE.Object3D();
      for (let i = 0; i < positions.length; i++) {
        d.position.set(positions[i].x, positions[i].h + ROOM_H - 0.025, positions[i].z);
        d.updateMatrix();
        fMesh.setMatrixAt(i, d.matrix);
      }
      fMesh.instanceMatrix.needsUpdate = true;
      this.object3d.add(fMesh);
    }
  }

  _cloneModel(key) {
    const src = this.models[key];
    if (!src || src.children.length === 0) return new THREE.Group();
    const clone = src.clone(true);
    clone.traverse(c => {
      if (!c.isMesh) return;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (!m.map) {
          const h = m.color ? m.color.getHex() : 0;
          if (h === 0xffffff || h === 0x2194f3) m.color.setHex(0xddd0c0);
          m.roughness = 0.85;
          m.metalness = 0;
        }
      }
    });
    return clone;
  }

  _createProps() {
    const cells = [];
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] === 'r') cells.push({ x, z });

    if (cells.length === 0) return;

    const cabMat = _makeMat('cabinet', { color: 0x888c8a, metalness: 0.5, roughness: 0.4 });
    const handleMat = _makeMat('cabinet_handle', { color: 0x555555, metalness: 0.7, roughness: 0.3 });
    for (let i = 0; i < Math.min(10, cells.length); i++) {
      const cell = cells[(i * 7 + 3) % cells.length];
      const cx = cell.x * TILE + TILE / 2 + ((i % 3) - 1) * 0.8;
      const cz = cell.z * TILE + TILE / 2 + ((i * 2 + 1) % 3 - 1) * 0.8;
      const cab = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.6), cabMat);
      body.position.y = 0.65;
      cab.add(body);
      for (let d = 0; d < 4; d++) {
        const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.04), cabMat);
        drawer.position.set(0, d * 0.28 + 0.14, 0.32);
        cab.add(drawer);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.02), handleMat);
        handle.position.set(0, d * 0.28 + 0.14, 0.36);
        cab.add(handle);
      }
      cab.rotation.y = i * 1.2;
      cab.position.set(cx, this._getHeight(cell.x, cell.z), cz);
      this.object3d.add(cab);
    }

    const shelfMat = _makeMat('shelf', { color: 0x9a8c7a, roughness: 0.6, metalness: 0.05 });
    for (let i = 0; i < Math.min(8, cells.length); i++) {
      const cell = cells[(i * 11 + 5) % cells.length];
      const cx = cell.x * TILE + TILE / 2 + ((i * 3) % 3 - 1) * 0.8;
      const cz = cell.z * TILE + TILE / 2 + ((i + 5) % 3 - 1) * 0.8;
      const group = new THREE.Group();
      for (const sx of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), shelfMat);
        leg.position.set(sx, 0.8, 0);
        group.add(leg);
      }
      for (let j = 0; j < 4; j++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.4), shelfMat);
        board.position.set(0, j * 0.4 + 0.2, 0);
        group.add(board);
      }
      group.position.set(cx, this._getHeight(cell.x, cell.z), cz);
      group.rotation.y = i * 0.9;
      this.object3d.add(group);
    }

    for (let i = 0; i < Math.min(5, cells.length); i++) {
      const cell = cells[(i * 13 + 7) % cells.length];
      const cx = cell.x * TILE + TILE / 2 + ((i * 2) % 3 - 1) * 0.8;
      const cz = cell.z * TILE + TILE / 2 + ((i + 5) % 3 - 1) * 0.8;
      const cooler = this._cloneModel('water_cooler');
      cooler.rotation.set(-Math.PI / 2, i * 1.5, 0);
      cooler.scale.setScalar(FURNITURE_SCALES.water_cooler);
      const box = new THREE.Box3().setFromObject(cooler);
      cooler.position.set(cx, this._getHeight(cell.x, cell.z) - box.min.y, cz);
      this.object3d.add(cooler);
    }
  }

  _spawnItem(type, x, z) {
    const modelKey = ITEM_MODEL_MAP[type];
    if (!modelKey) return;

    let mesh;
    if (modelKey === '__procedural_battery') {
      const mat = _makeMat('battery', { color: 0xcc3333, metalness: 0.4, roughness: 0.3 });
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.08, 8), mat);
    } else if (modelKey === '__procedural_flashlight') {
      const g = new THREE.Group();
      const bodyMat = _makeMat('flashlight_body', { color: 0x333333, metalness: 0.6, roughness: 0.3 });
      const headMat = _makeMat('flashlight_head', { color: 0x444444, metalness: 0.5, roughness: 0.4 });
      const lensMat = _makeMat('flashlight_lens', { color: 0xcccc88, metalness: 0.1, roughness: 0.2 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.12, 12), bodyMat);
      body.rotation.x = Math.PI / 2;
      g.add(body);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.03, 12), headMat);
      head.rotation.x = Math.PI / 2;
      head.position.x = 0.075;
      g.add(head);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), lensMat);
      lens.rotation.y = Math.PI / 2;
      lens.position.x = 0.09;
      g.add(lens);
      g.scale.setScalar(1.5);
      mesh = g;
    } else if (modelKey === '__procedural_key') {
      const g = new THREE.Group();
      const mat = _makeMat('key', { color: 0xccaa44, metalness: 0.7, roughness: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 8, 12), mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.z = 0.06;
      g.add(ring);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.003, 0.09), mat);
      g.add(shaft);
      for (let i = 0; i < 3; i++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.003, 0.015), mat);
        tooth.position.set(0, -0.008 - i * 0.006, -0.04 - i * 0.012);
        g.add(tooth);
      }
      mesh = g;
    } else {
      mesh = this._cloneModel(modelKey.replace('.glb', ''));
      const s = ITEM_SCALES[type];
      if (s) mesh.scale.setScalar(s);
    }

    const gx = Math.floor((x) / TILE);
    const gz = Math.floor((z) / TILE);
    const floorH = this._getHeight(gx, gz);

    if (mesh.isGroup) {
      const box = new THREE.Box3().setFromObject(mesh);
      mesh.position.set(x, floorH - box.min.y, z);
    } else {
      mesh.position.set(x, floorH + 0.04, z);
    }
    this.object3d.add(mesh);
    this.interactables.push({ mesh, type, position: new THREE.Vector3(x, floorH + 0.1, z) });
  }

  _createItems() {
    for (const [type, gx, gz] of ITEM_PLACEMENTS)
      this._spawnItem(type, gx * TILE + TILE / 2, gz * TILE + TILE / 2);
  }

  _createExit() {
    const px = 228 * TILE + TILE / 2, pz = 148 * TILE + TILE / 2;
    const floorH = this._getHeight(228, 148);
    const doorMat = _makeMat('door', { map: this.textures.wallDiff });
    const frameMat = _makeMat('frame', { map: this.textures.wallDiff, roughness: 0.6, metalness: 0.1, color: 0x887755 });
    const barMat = _makeMat('bar', { color: 0x888888, metalness: 0.8, roughness: 0.2 });
    const signMat = _makeMat('sign', { color: 0xcc3333, emissive: 0xcc2222, emissiveIntensity: 0.6, roughness: 0.3 });
    const signGlowMat = _makeMat('signGlow', { color: 0xffeedd, emissive: 0xffaa66, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.12), frameMat);
    frame.position.set(px, floorH + 1.3, pz); this.object3d.add(frame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.08), doorMat);
    door.position.set(px, floorH + 1.15, pz + 0.02); this.object3d.add(door);

    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.03), barMat);
    pushBar.position.set(px, floorH + 1.0, pz + 0.07); this.object3d.add(pushBar);

    for (const hz of [0.3, -0.3]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), barMat);
      bar.position.set(px + hz * 0.5 / 0.3, floorH + 1.0, pz + 0.07);
      bar.rotation.x = Math.PI / 2;
      this.object3d.add(bar);
    }

    const hingeMat = _makeMat('hinge', { color: 0x666666, metalness: 0.6, roughness: 0.3 });
    for (const hz of [0.3, -0.3]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), hingeMat);
      hinge.position.set(px - 0.56, floorH + hz + 1.15, pz + 0.02);
      this.object3d.add(hinge);
    }

    const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.03), signMat);
    signBox.position.set(px, floorH + 2.6, pz + 0.06); this.object3d.add(signBox);

    const glowBg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.002), signGlowMat);
    glowBg.position.set(px, floorH + 2.6, pz + 0.075); this.object3d.add(glowBg);

    this.interactables.push({ mesh: door, type: 'exit', position: new THREE.Vector3(px, floorH + 1.2, pz) });
  }

  getCollisionGrid() { return this.grid; }
  getWallColliders() { return []; }

  getFloorHeight(wx, wz) {
    const gx = Math.floor(wx / TILE);
    const gz = Math.floor(wz / TILE);
    if (gx < 0 || gx >= GW || gz < 0 || gz >= GH) return 0;
    if (this.grid[gz][gx] === ' ') return null;
    const h = this.heightMap[gz][gx];
    for (const [dx, dz] of [[1,0],[0,1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (nx >= GW || nz >= GH) continue;
      if (this.grid[nz][nx] === ' ') continue;
      const nh = this.heightMap[nz][nx];
      const dh = nh - h;
      if (Math.abs(dh) < 0.1 || Math.abs(dh) > 2.0) continue;
      const lerp = dx !== 0 ? (wx - gx * TILE) / TILE : (wz - gz * TILE) / TILE;
      return h + dh * Math.min(Math.max(lerp, 0), 1);
    }
    return h;
  }

  getTileSize() { return TILE; }

  update(delta) {
  }

  getInteractables() { return this.interactables; }
}

function mergeGeoms(geoms) {
  if (geoms.length === 1) return geoms[0];
  let totalVerts = 0, totalIdx = 0;
  for (const g of geoms) {
    totalVerts += g.getAttribute('position').count;
    totalIdx += g.index ? g.index.count : g.getAttribute('position').count;
  }
  const pos = new Float32Array(totalVerts * 3);
  const nrm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  const idx = new Uint32Array(totalIdx);
  let vo = 0, io = 0;
  for (const g of geoms) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    const gi = g.index;
    const count = p.count;
    pos.set(p.array, vo * 3);
    nrm.set(n.array, vo * 3);
    uv.set(u.array, vo * 2);
    if (gi) {
      for (let k = 0; k < gi.count; k++) idx[io + k] = gi.array[k] + vo;
      io += gi.count;
    } else {
      for (let k = 0; k < count; k++) idx[io + k] = vo + k;
      io += count;
    }
    vo += count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  merged.computeVertexNormals();
  return merged;
}
