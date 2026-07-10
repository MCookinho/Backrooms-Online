import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;

const GW = 160;
const GH = 120;

const ITEM_PLACEMENTS = [
  ['flashlight', 20, 18], ['almond_water', 25, 12], ['almond_water', 30, 40],
  ['almond_water', 80, 60], ['almond_water', 110, 30],
  ['batteries', 35, 25], ['batteries', 50, 55], ['batteries', 90, 80], ['batteries', 130, 50],
  ['lighter', 45, 15], ['lighter', 75, 90],
  ['medkit', 60, 35], ['medkit', 100, 70], ['medkit', 145, 95],
  ['note', 28, 8], ['note', 65, 45], ['note', 40, 95], ['note', 120, 20], ['note', 95, 105],
  ['key', 150, 15], ['key', 110, 105],
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
  // [x, z, w, h, type]
  // types: spawn, rooms, open, maze, halls, exit, pits, raised

  // Top band (z: 0-24)
  [0, 0, 24, 24, 'spawn'],
  [24, 0, 20, 24, 'maze'],
  [44, 0, 20, 24, 'open'],
  [64, 0, 16, 24, 'maze'],
  [80, 0, 24, 24, 'rooms'],
  [104, 0, 20, 24, 'open'],
  [124, 0, 12, 24, 'maze'],
  [136, 0, 24, 24, 'exit'],

  // Mid-top band (z: 24-48)
  [0, 24, 20, 24, 'open'],
  [20, 24, 20, 24, 'rooms'],
  [40, 24, 24, 24, 'maze'],
  [64, 24, 16, 24, 'pits'],
  [80, 24, 20, 24, 'halls'],
  [100, 24, 20, 24, 'rooms'],
  [120, 24, 20, 24, 'maze'],
  [140, 24, 20, 24, 'open'],

  // Mid-bottom band (z: 48-72)
  [0, 48, 24, 24, 'maze'],
  [24, 48, 20, 24, 'pits'],
  [44, 48, 20, 24, 'open'],
  [64, 48, 24, 24, 'rooms'],
  [88, 48, 20, 24, 'maze'],
  [108, 48, 20, 24, 'raised'],
  [128, 48, 16, 24, 'maze'],
  [144, 48, 16, 24, 'halls'],

  // Bottom band (z: 72-96)
  [0, 72, 16, 24, 'halls'],
  [16, 72, 20, 24, 'open'],
  [36, 72, 20, 24, 'rooms'],
  [56, 72, 24, 24, 'maze'],
  [80, 72, 20, 24, 'pits'],
  [100, 72, 20, 24, 'open'],
  [120, 72, 20, 24, 'rooms'],
  [140, 72, 20, 24, 'maze'],

  // Bottom strip (z: 96-120)
  [0, 96, 30, 24, 'open'],
  [30, 96, 20, 24, 'halls'],
  [50, 96, 30, 24, 'maze'],
  [80, 96, 30, 24, 'raised'],
  [110, 96, 20, 24, 'halls'],
  [130, 96, 30, 24, 'open'],
];

// Connector corridors between zones
const CONNECTORS = [
  // Horizontal connectors between vertically adjacent zones
  [24, 23, 4, 2], [64, 23, 4, 2], [100, 23, 4, 2],
  [40, 47, 4, 2], [80, 47, 4, 2], [120, 47, 4, 2],
  [24, 71, 4, 2], [88, 71, 4, 2], [128, 71, 4, 2],
  [36, 95, 4, 2], [80, 95, 4, 2], [120, 95, 4, 2],
  // Vertical connectors
  [23, 24, 2, 24], [79, 24, 2, 24], [135, 24, 2, 24],
  [23, 48, 2, 24], [63, 48, 2, 24], [119, 48, 2, 24],
  [15, 72, 2, 24], [55, 72, 2, 24], [99, 72, 2, 24],
];

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3(8 * TILE, 0, 8 * TILE);
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

    for (const [xz, zz, w, h, type] of ZONES) {
      for (let dz = 0; dz < h; dz++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = xz + dx, cz = zz + dz;
          if (cx < 0 || cx >= GW || cz < 0 || cz >= GH) continue;

          if (type === 'void' || type === 'pits') {
            // Leave most tiles void, make some walkable
            if (Math.random() < 0.25) {
              this.grid[cz][cx] = '.';
              if (type === 'pits') {
                // Random holes within pits zone
                if (Math.random() < 0.2) {
                  this.grid[cz][cx] = ' ';
                  this.heightMap[cz][cx] = -2;
                } else {
                  this.heightMap[cz][cx] = -1.5;
                }
              }
            }
            continue;
          }

          if (type === 'raised') {
            if (Math.random() < 0.6) {
              this.grid[cz][cx] = '.';
              this.heightMap[cz][cx] = 1.5 + Math.random() * 0.5;
            }
            continue;
          }

          if (type === 'spawn') {
            this.grid[cz][cx] = 'S';
            // Clear a large open area around spawn
            continue;
          }

          if (type === 'exit') {
            // Dense room placement
            if (Math.random() < 0.8 || (dx === 0 || dx === w - 1 || dz === 0 || dz === h - 1)) {
              this.grid[cz][cx] = Math.random() < 0.4 ? '.' : 'r';
            }
            continue;
          }

          if (type === 'open') {
            if (Math.random() < 0.9) {
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
              if (Math.random() < 0.3) this.grid[cz][cx] = '.';
            }
            continue;
          }

          if (type === 'halls') {
            if (Math.random() < 0.7) {
              this.grid[cz][cx] = '.';
            }
            continue;
          }

          if (type === 'maze') {
            const wallsRemoved = 0.6;
            if (Math.random() < wallsRemoved) {
              this.grid[cz][cx] = Math.random() < 0.5 ? '.' : 'r';
            }
            continue;
          }
        }
      }
    }

    // Apply connectors
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

    // Ensure spawn is clear (9x9 area)
    for (let dz = -4; dz <= 4; dz++)
      for (let dx = -4; dx <= 4; dx++) {
        const tx = 8 + dx, tz = 8 + dz;
        if (tx >= 0 && tx < GW && tz >= 0 && tz < GH) {
          this.grid[tz][tx] = 'S';
          this.heightMap[tz][tx] = 0;
        }
      }

    // Ensure exit is accessible
    const ex = 150, ez = 110;
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const tx = ex + dx, tz = ez + dz;
        if (tx >= 0 && tx < GW && tz >= 0 && tz < GH) {
          if (this.grid[tz][tx] !== ' ') this.grid[tz][tx] = 'E';
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
      for (const [nx, nz] of [[x+1,z],[x,z+1],[x-1,z],[x,z-1]]) {
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
            px, oh, pz, px + 2 * TILE, oNh, pz + TILE, px + 2 * TILE, oNh, pz,
            px, oh, pz, px, oh, pz + TILE, px + 2 * TILE, oNh, pz + TILE,
          ]);
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
            0, 0, 2, 1, 2, 0,
            0, 0, 0, 1, 2, 1,
          ]), 2));
          g.computeVertexNormals();
          rampGeoms.push(g);
        } else {
          const verts = new Float32Array([
            px, oh, pz, px + TILE, oNh, pz + 2 * TILE, px + TILE, oh, pz,
            px, oh, pz, px, oNh, pz + 2 * TILE, px + TILE, oNh, pz + 2 * TILE,
          ]);
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
            0, 0, 1, 2, 1, 0,
            0, 0, 0, 2, 1, 2,
          ]), 2));
          g.computeVertexNormals();
          rampGeoms.push(g);
        }

        const sw = WALL_T;
        if (isX) {
          for (const sz of [pz, pz + TILE]) {
            const sg = new THREE.BoxGeometry(2 * TILE, absDh, sw);
            sg.translate(px + TILE, Math.min(oh, oNh) + absDh / 2, sz);
            sideGeoms.push(sg);
          }
        } else {
          for (const sx of [px, px + TILE]) {
            const sg = new THREE.BoxGeometry(sw, absDh, 2 * TILE);
            sg.translate(sx, Math.min(oh, oNh) + absDh / 2, pz + TILE);
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
    const px = 150 * TILE + TILE / 2, pz = 110 * TILE + TILE / 2;
    const floorH = this._getHeight(150, 110);
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
    // Check for ramp: only when this tile is the LOWER side (dh > 0)
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (nx < 0 || nx >= GW || nz < 0 || nz >= GH) continue;
      if (this.grid[nz][nx] === ' ') continue;
      const nh = this.heightMap[nz][nx];
      const dh = nh - h;
      if (Math.abs(dh) < 0.1 || Math.abs(dh) > 2.0 || dh < 0) continue;
      let lerp;
      if (dx !== 0) {
        lerp = dx > 0 ? (wx - gx * TILE) / TILE : 1 - (wx - gx * TILE) / TILE;
      } else {
        lerp = dz > 0 ? (wz - gz * TILE) / TILE : 1 - (wz - gz * TILE) / TILE;
      }
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
