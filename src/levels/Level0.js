import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;

const GW = 160;
const GH = 120;

const ITEM_PLACEMENTS = [
  ['flashlight', 14, 15],
  ['almond_water', 52, 15], ['almond_water', 90, 8], ['almond_water', 115, 40],
  ['almond_water', 60, 75], ['almond_water', 45, 105],
  ['batteries', 35, 18], ['batteries', 78, 8], ['batteries', 22, 50],
  ['batteries', 115, 72], ['batteries', 75, 105],
  ['lighter', 25, 10], ['lighter', 60, 45], ['lighter', 90, 105],
  ['medkit', 48, 8], ['medkit', 85, 65], ['medkit', 55, 105],
  ['note', 10, 5], ['note', 42, 28], ['note', 52, 75], ['note', 82, 45],
  ['note', 35, 112], ['note', 115, 95],
  ['key', 148, 18], ['key', 115, 105],
];

const ITEM_MODEL_MAP = {
  almond_water: 'water_bottle.glb', flashlight: 'flashlight.glb',
  batteries: '__procedural_battery', lighter: 'lighter.glb',
  medkit: 'firstaid.glb', key: 'key.glb', note: 'papers.glb',
};

const ITEM_SCALES = {
  almond_water: 0.0038,
  flashlight: 2.5,
  lighter: 0.00047,
  medkit: 19,
  key: 0.12,
  note: 0.0016,
};

const FURNITURE_SCALES = {
  filing_cabinet: 0.65,
};

const FURNITURE_MODEL_MAP = {
  filing_cabinet: 'filing_cabinet.glb', water_cooler: 'water_cooler.glb',
};

function _makeMat(name, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    roughness: 0.85, metalness: 0, ...opts,
  });
  m.name = name;
  return m;
}

const ZONES = [
  // [x, z, w, d, type, baseH]
  // types: spawn, rooms, rooms_lg, open, maze, halls, pits, raised,
  //        garden, server, ruins, basement, void

  // ── Row 0 (z:0-30) — Upper Level: bright public ground floor ──
  [0, 0, 28, 30, 'spawn', 0],
  [28, 0, 30, 30, 'rooms', 0],
  [58, 0, 20, 30, 'garden', 0],
  [78, 0, 28, 30, 'rooms', 0],
  [106, 0, 24, 30, 'halls', 0],
  [130, 0, 30, 30, 'halls', 0],

  // ── Row 1 (z:30-60) — Mid Level: functional ground floor ──
  [0, 30, 24, 30, 'rooms_lg', 0],
  [24, 30, 24, 30, 'halls', 0],
  [48, 30, 24, 30, 'server', 0],
  [72, 30, 28, 30, 'maze', 0],
  [100, 30, 28, 30, 'open', 0],
  [128, 30, 32, 30, 'halls', 0],

  // ── Row 2 (z:60-90) — Transition: damage above, stairwell to basement ──
  [0, 60, 28, 30, 'ruins', 0],
  [28, 60, 24, 30, 'pits', 0],
  [52, 60, 24, 30, 'halls', 0],
  [76, 60, 28, 30, 'ruins', 0],
  [104, 60, 24, 30, 'maze', 0],
  [128, 60, 32, 30, 'basement', 0],

  // ── Row 3 (z:90-120) — Underground Level: dark basement ──
  [0, 90, 28, 30, 'basement', -1.5],
  [28, 90, 28, 30, 'rooms', -1.5],
  [56, 90, 24, 30, 'open', -1.5],
  [80, 90, 24, 30, 'pits', -1.5],
  [104, 90, 28, 30, 'maze', -1.5],
  [132, 90, 28, 30, 'void', 0],
];

// Connector corridors between zones — ensures walkable paths across zone borders
const CONNECTORS = [
  // Row 0 → Row 1 horizontal (z=30 border)
  [26, 29, 4, 2], [56, 29, 4, 2], [76, 29, 4, 2], [104, 29, 4, 2], [128, 29, 4, 2],
  // Row 1 → Row 2 horizontal (z=60 border)
  [22, 59, 4, 2], [46, 59, 4, 2], [70, 59, 4, 2], [98, 59, 4, 2], [126, 59, 4, 2],
  // Row 2 → Row 3 horizontal (z=90 border)
  [26, 89, 4, 2], [50, 89, 4, 2], [74, 89, 4, 2], [102, 89, 4, 2], [126, 89, 4, 2],
  // Vertical connectors — multiple passages between column zones
  [27, 0, 2, 30], [57, 0, 2, 30], [77, 0, 2, 30], [105, 0, 2, 30], [129, 0, 2, 30],
  [27, 30, 2, 30], [47, 30, 2, 30], [71, 30, 2, 30], [99, 30, 2, 30], [127, 30, 2, 30],
  [27, 60, 2, 30], [51, 60, 2, 30], [75, 60, 2, 30], [103, 60, 2, 30], [127, 60, 2, 30],
  [27, 90, 2, 30], [55, 90, 2, 30], [79, 90, 2, 30], [103, 90, 2, 30], [131, 90, 2, 30],
  // Diagonal / shortcut paths
  [14, 28, 3, 4], [42, 58, 3, 4], [88, 88, 3, 4],
];

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3(14 * TILE, 0, 15 * TILE);
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

    // ── Zone generation ──
    for (const [xz, zz, w, d, type, baseH = 0] of ZONES) {
      for (let dz = 0; dz < d; dz++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = xz + dx, cz = zz + dz;
          if (cx < 0 || cx >= GW || cz < 0 || cz >= GH) continue;
          this.heightMap[cz][cx] = baseH;

          if (type === 'void') {
            if (Math.random() < 0.35) {
              this.grid[cz][cx] = '.';
            }
            continue;
          }

          if (type === 'pits') {
            if (Math.random() < 0.5) {
              this.grid[cz][cx] = '.';
              this.heightMap[cz][cx] = baseH - 0.3 + Math.random() * 0.6;
              if (Math.random() < 0.15) {
                this.grid[cz][cx] = ' ';
                this.heightMap[cz][cx] = baseH - 1.5 - Math.random() * 0.5;
              }
            }
            continue;
          }

          if (type === 'basement') {
            this.grid[cz][cx] = '.';
            if (baseH < 0 && Math.random() < 0.12) {
              this.grid[cz][cx] = ' ';
            }
            continue;
          }

          if (type === 'raised') {
            if (Math.random() < 0.55) {
              this.grid[cz][cx] = '.';
              this.heightMap[cz][cx] = baseH + 1.5 + Math.random() * 0.8;
            }
            continue;
          }

          if (type === 'ruins') {
            const r = Math.random();
            if (r < 0.65) {
              this.grid[cz][cx] = '.';
              this.heightMap[cz][cx] = baseH + Math.random() * 1.5;
            } else if (r < 0.8) {
              this.grid[cz][cx] = 'r';
              this.heightMap[cz][cx] = baseH + Math.random() * 1.0;
            }
            continue;
          }

          if (type === 'spawn') {
            this.grid[cz][cx] = 'S';
            continue;
          }

          if (type === 'garden') {
            if (Math.random() < 0.85) {
              this.grid[cz][cx] = '.';
              if (Math.random() < 0.2) {
                this.grid[cz][cx] = 'r';
              }
            }
            continue;
          }

          if (type === 'server') {
            this.grid[cz][cx] = '.';
            this.heightMap[cz][cx] = baseH + 0.5 + (dx % 2) * 0.05;
            const row = Math.floor(dz / 3);
            if (row % 2 === 0 && dz % 3 === 1 && dx % 2 === 0 && dx > 0 && dx < w - 1) {
              this.grid[cz][cx] = 'r';
            }
            if (Math.random() < 0.08) this.grid[cz][cx] = ' ';
            continue;
          }

          if (type === 'open') {
            if (Math.random() < 0.88) {
              this.grid[cz][cx] = '.';
            }
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
              const r = Math.random();
              if (r < 0.25) this.grid[cz][cx] = '.';
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
            if (Math.random() < 0.72) {
              this.grid[cz][cx] = '.';
            }
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

    // ── Apply connectors ──
    for (const [cx, cz, cw, ch] of CONNECTORS) {
      for (let dz = 0; dz < ch; dz++) {
        for (let dx = 0; dx < cw; dx++) {
          const tx = cx + dx, tz = cz + dz;
          if (tx >= 0 && tx < GW && tz >= 0 && tz < GH && this.grid[tz][tx] === ' ') {
            this.grid[tz][tx] = '.';
          }
        }
      }
    }

    // ── Punch random doorways between adjacent room cells ──
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

    // ── Ensure spawn is clear (11x11 cleared) ──
    for (let dz = -5; dz <= 5; dz++)
      for (let dx = -5; dx <= 5; dx++) {
        const tx = 14 + dx, tz = 15 + dz;
        if (tx >= 0 && tx < GW && tz >= 0 && tz < GH) {
          this.grid[tz][tx] = 'S';
          this.heightMap[tz][tx] = 0;
        }
      }

    // ── Ensure exit area at far bottom-right ──
    const ex = 152, ez = 112;
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const tx = ex + dx, tz = ez + dz;
        if (tx >= 0 && tx < GW && tz >= 0 && tz < GH) {
          if (this.grid[tz][tx] !== ' ') {
            this.grid[tz][tx] = 'E';
            this.heightMap[tz][tx] = 0;
          }
          this.grid[tz][tx] = 'E';
          this.heightMap[tz][tx] = 0;
        }
      }

    // ── Carve a spiral path from the basement exit to surface ──
    for (let z = 108; z <= 114; z++) {
      for (let x = 148; x <= 155; x++) {
        if (z >= 0 && z < GH && x >= 0 && x < GW) {
          this.grid[z][x] = '.';
          this.heightMap[z][x] = 0;
        }
      }
    }

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
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] === 'S')
          return new THREE.Vector3((x + 0.5) * TILE, this.heightMap[z][x], (z + 0.5) * TILE);
    return new THREE.Vector3(8 * TILE, 0, 8 * TILE);
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
      const name = key.replace('.glb', '');
      if (!seen.has(name)) { seen.add(name); modelPromises.push(loadModel(name, key)); }
    }
    for (const key of Object.values(FURNITURE_MODEL_MAP)) {
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
    this._buildRamps();
    this._buildPitWalls();
    this._buildPitFloors();
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

  _buildPitFloors() {
    const mat = _makeMat('pitFloor', {
      map: this.textures.floorDiff, normalMap: this.textures.floorNorm,
      roughness: 0.95, side: THREE.DoubleSide, color: 0x555555,
    });
    const pitTiles = [];
    for (let z = 0; z < GH; z++)
      for (let x = 0; x < GW; x++)
        if (this.grid[z][x] === ' ' && this._getHeight(x, z) <= -1.5)
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
        const walkable = this._isWalkable(neighborX, neighborZ);
        if (walkable) return;
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

        // Origin = leftmost (X) or bottommost (Z) tile → each pair processed once
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
            const sg = new THREE.BoxGeometry(TILE, absDh, sw);
            sg.translate(px + TILE / 2, Math.min(oh, oNh) + absDh / 2, sz);
            sideGeoms.push(sg);
          }
        } else {
          for (const sx of [px, px + TILE]) {
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
        if (nh <= -1.5) {
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
      // Place fixtures every 6 tiles, skip tight areas
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

    for (let i = 0; i < Math.min(10, cells.length); i++) {
      const cell = cells[(i * 7 + 3) % cells.length];
      const cx = cell.x * TILE + TILE / 2 + ((i % 3) - 1) * 0.8;
      const cz = cell.z * TILE + TILE / 2 + ((i * 2 + 1) % 3 - 1) * 0.8;
      const cab = this._cloneModel('filing_cabinet');
      cab.rotation.y = i * 1.2;
      cab.scale.setScalar(FURNITURE_SCALES.filing_cabinet);
      const box = new THREE.Box3().setFromObject(cab);
      cab.position.set(cx, this._getHeight(cell.x, cell.z) - box.min.y, cz);
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
      cooler.scale.setScalar(0.1);
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
    const px = 152 * TILE + TILE / 2, pz = 112 * TILE + TILE / 2;
    const floorH = this._getHeight(152, 112);
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
