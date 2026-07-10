import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;
const FOOTER_H = 0.12;

const GW = 80;
const GH = 60;

const SECTORS = [
  // === TOP EDGE CORRIDOR (full width) ===
  [0, 0, GW, 2, 'hall'],
  [0, 58, GW, 2, 'hall'],

  // === ZONE 1: SPAWN COMPLEX (col 4-18, row 2-18) ===
  [4, 2, 15, 17, 'spawn'],
  // Internal divisions within spawn
  [4, 2, 3, 17, 'hall'],
  [16, 2, 3, 17, 'hall'],

  // === ZONE 2: THE GREAT HUB (col 22-54, row 2-18) ===
  [22, 2, 33, 17, 'room'],
  // Hub columns as void
  [26, 5, 2, 2, ' '],
  [30, 5, 2, 2, ' '],
  [34, 5, 2, 2, ' '],
  [38, 5, 2, 2, ' '],
  [42, 5, 2, 2, ' '],
  [46, 5, 2, 2, ' '],
  [50, 5, 2, 2, ' '],
  [26, 10, 2, 2, ' '],
  [30, 10, 2, 2, ' '],
  [34, 10, 2, 2, ' '],
  [38, 10, 2, 2, ' '],
  [42, 10, 2, 2, ' '],
  [46, 10, 2, 2, ' '],
  [50, 10, 2, 2, ' '],
  [26, 15, 2, 2, ' '],
  [30, 15, 2, 2, ' '],
  [34, 15, 2, 2, ' '],
  [38, 15, 2, 2, ' '],
  [42, 15, 2, 2, ' '],
  [46, 15, 2, 2, ' '],
  [50, 15, 2, 2, ' '],

  // === ZONE 3: EAST WING (col 58-77, row 2-18) ===
  [58, 2, 20, 17, 'room'],

  // === ZONE 4: MAZE (col 4-18, row 22-38) ===
  [4, 22, 6, 5, 'room'], [12, 22, 5, 5, 'room'],
  [4, 29, 6, 5, 'room'], [12, 29, 5, 5, 'room'],
  [4, 36, 6, 4, 'room'], [12, 36, 5, 4, 'room'],
  [10, 22, 2, 5, 'hall'],
  [10, 29, 2, 5, 'hall'],
  [10, 36, 2, 4, 'hall'],
  [4, 27, 6, 2, 'hall'],
  [12, 27, 5, 2, 'hall'],
  [4, 34, 6, 2, 'hall'],
  [12, 34, 5, 2, 'hall'],

  // === ZONE 5: CENTER COMPLEX (col 22-54, row 22-38) ===
  // Outer ring
  [22, 22, 33, 3, 'hall'],
  [22, 22, 3, 17, 'hall'],
  [52, 22, 3, 17, 'hall'],
  [22, 36, 33, 3, 'hall'],
  // Inner ring
  [28, 25, 3, 13, 'hall'],
  [46, 25, 3, 13, 'hall'],
  [28, 25, 21, 3, 'hall'],
  [28, 35, 21, 3, 'hall'],
  // Center room
  [31, 28, 15, 7, 'room'],
  // Cross corridors
  [25, 28, 6, 7, 'hall'],
  [41, 28, 11, 7, 'hall'],
  [31, 25, 15, 3, 'hall'],
  [31, 33, 15, 3, 'hall'],

  // === ZONE 6: EAST MIDDLE (col 58-77, row 22-38) ===
  [58, 22, 20, 17, 'room'],

  // === ZONE 7: OFFICES (col 4-18, row 42-57) ===
  [4, 44, 5, 5, 'room'], [12, 44, 5, 5, 'room'],
  [4, 51, 5, 6, 'room'], [12, 51, 5, 6, 'room'],
  [9, 44, 3, 5, 'hall'],
  [9, 51, 3, 6, 'hall'],
  [4, 49, 5, 2, 'hall'],
  [12, 49, 5, 2, 'hall'],

  // === ZONE 8: SOUTH ROOMS (col 22-54, row 42-57) ===
  [22, 42, 16, 16, 'room'],
  [40, 42, 14, 16, 'room'],
  [22, 42, 4, 16, 'hall'],
  [36, 42, 4, 16, 'hall'],
  [22, 50, 18, 2, 'hall'],

  // === ZONE 9: EXIT WING (col 58-77, row 42-57) ===
  [58, 42, 20, 16, 'exit'],

  // === CONNECTING CORRIDORS ===
  // Horizontal: Spawn ↔ Hub
  [19, 8, 3, 5, 'hall'],
  // Horizontal: Hub ↔ East
  [55, 8, 3, 5, 'hall'],
  // Horizontal: Maze ↔ Center
  [19, 28, 3, 5, 'hall'],
  // Horizontal: Center ↔ East Mid
  [55, 28, 3, 5, 'hall'],
  // Horizontal: Offices ↔ South
  [19, 48, 3, 5, 'hall'],
  // Horizontal: South ↔ Exit
  [55, 48, 3, 5, 'hall'],
  // Vertical: Hub ↔ Center
  [28, 19, 5, 3, 'hall'],
  [48, 19, 5, 3, 'hall'],
  // Vertical: Center ↔ South
  [28, 39, 5, 3, 'hall'],
  [48, 39, 5, 3, 'hall'],
  // Vertical: East ↔ East Mid
  [66, 19, 5, 3, 'hall'],
  // Vertical: East Mid ↔ Exit
  [66, 39, 5, 3, 'hall'],

  // === EXTRA ATMOSPHERE ===
  // Narrow walkways within South Rooms
  [26, 48, 6, 2, 'hall'],
  [44, 46, 6, 2, 'hall'],
  // Dead-end hall in East
  [62, 2, 4, 16, 'hall'],
  [62, 22, 4, 16, 'hall'],
  [70, 2, 4, 16, 'hall'],
  [70, 22, 4, 16, 'hall'],

  // Center void areas (negative space with walls around them)
  [38, 46, 2, 2, ' '],
  [46, 46, 2, 2, ' '],
];

const LIGHT_TILES = (() => {
  const tiles = [];
  for (let z = 2; z < GH - 2; z += 4) {
    for (let x = 2; x < GW - 2; x += 4) {
      tiles.push([x, z]);
    }
  }
  return tiles;
})();

const ITEM_PLACEMENTS = [
  ['flashlight', 8, 6],
  ['almond_water', 12, 6],
  ['almond_water', 10, 10],
  ['almond_water', 42, 6],
  ['almond_water', 30, 12],
  ['batteries', 14, 4],
  ['batteries', 7, 14],
  ['batteries', 36, 6],
  ['batteries', 46, 10],
  ['lighter', 14, 14],
  ['lighter', 66, 8],
  ['medkit', 26, 12],
  ['medkit', 44, 26],
  ['medkit', 72, 46],
  ['note', 16, 24],
  ['note', 36, 30],
  ['note', 8, 46],
  ['note', 68, 28],
  ['note', 28, 52],
  ['key', 74, 50],
  ['key', 50, 54],
];

const ITEM_MODEL_MAP = {
  almond_water: 'water_bottle.glb',
  flashlight: 'flashlight.glb',
  batteries: 'battery.glb',
  lighter: 'lighter.glb',
  medkit: 'firstaid.glb',
  key: 'key.glb',
  note: 'papers.glb',
};

const FURNITURE_MODEL_MAP = {
  filing_cabinet: 'filing_cabinet.glb',
  shelf: 'shelf.glb',
  water_cooler: 'water_cooler.glb',
};

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3((10 + 0.5) * TILE, 0, (10 + 0.5) * TILE);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.wallBoxes = [];
    this.grid = null;
    this.textures = {};
    this.models = {};
  }

  _initGrid() {
    this.grid = Array.from({ length: GH }, () => Array(GW).fill(' '));
    const carve = (x, z, w, h, type) => {
      for (let dz = 0; dz < h; dz++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = x + dx;
          const cz = z + dz;
          if (cx >= 0 && cx < GW && cz >= 0 && cz < GH) {
            if (type === 'spawn') this.grid[cz][cx] = 'S';
            else if (type === 'exit') this.grid[cz][cx] = 'E';
            else if (type === ' ') this.grid[cz][cx] = ' ';
            else this.grid[cz][cx] = type === 'hall' ? '.' : 'r';
          }
        }
      }
    };
    for (const [x, z, w, h, type] of SECTORS) {
      carve(x, z, w, h, type);
    }
  }

  async load(scene) {
    this.object3d = new THREE.Group();
    scene.add(this.object3d);
    this._initGrid();
    this.textureLoader = new THREE.TextureLoader();

    this.spawnPoint = this._findSpawnPoint();

    await this._loadAssets();
    this._buildLevel();
  }

  _findSpawnPoint() {
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (this.grid[z][x] === 'S') {
          return new THREE.Vector3((x + 0.5) * TILE, 0, (z + 0.5) * TILE);
        }
      }
    }
    return new THREE.Vector3(5 * TILE, 0, 5 * TILE);
  }

  async _loadAssets() {
    const base = window.location.pathname.replace(/\/[^/]*$/, '') || '.';

    const loadTex = (key, path, rx, ry) => {
      const t = this.textureLoader.load(`${base}/assets/textures/${path}`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      this.textures[key] = t;
    };

    loadTex('carpetDiff', 'assetpack/carpet016_2k_png_color_yellowed.jpg', 6, 6);
    loadTex('carpetNorm', 'assetpack/carpet016_2k_png_normalgl.jpg', 6, 6);
    loadTex('carpetRough', 'assetpack/carpet016_2k_png_roughness.jpg', 6, 6);
    loadTex('wallDiff', 'assetpack/backroom_wallpaper_texture___yellowed_loopable.jpg', 2, 2);
    loadTex('wallNor', 'assetpack/wallpaper002a_2k_png_normalgl.jpg', 2, 2);
    loadTex('wallRough', 'assetpack/wallpaper002a_2k_png_roughness.jpg', 2, 2);
    loadTex('ceilDiff', 'assetpack/officeceiling003_2k_png_color.jpg', 4, 4);
    loadTex('ceilNor', 'assetpack/officeceiling003_2k_png_normalgl.jpg', 4, 4);
    loadTex('ceilRough', 'assetpack/officeceiling003_2k_png_metalness_officeceiling003_2k_png_roughness.jpg', 4, 4);
    loadTex('ceilEmit', 'assetpack/officeceiling003_2k_png_emission.jpg', 4, 4);
    loadTex('footerDiff', 'assetpack/paper001_2k_png_color.jpg', 1, 1);
    loadTex('footerNor', 'assetpack/wood050_2k_png_normalgl.jpg', 1, 1);
    loadTex('footerRough', 'assetpack/wood050_2k_png_roughness.jpg', 1, 1);

    const loadModel = (key, filename) => {
      return new Promise((resolve) => {
        const loader = new GLTFLoader();
        loader.load(
          `${base}/assets/models/${filename}`,
          (gltf) => { this.models[key] = gltf.scene; resolve(); },
          undefined,
          () => { this.models[key] = new THREE.Group(); resolve(); }
        );
      });
    };

    const modelPromises = [];
    for (const key of Object.values(ITEM_MODEL_MAP)) {
      const name = key.replace('.glb', '');
      if (!this.models[name]) modelPromises.push(loadModel(name, key));
    }
    for (const key of Object.values(FURNITURE_MODEL_MAP)) {
      const name = key.replace('.glb', '');
      if (!this.models[name]) modelPromises.push(loadModel(name, key));
    }

    await Promise.all(modelPromises);
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
    this._createLights();
    this._createProps();
    this._createItems();
    this._createExit();
    this._createWallStains();
  }

  _isWalkable(x, z) {
    if (x < 0 || x >= GW || z < 0 || z >= GH) return false;
    return this.grid[z][x] !== ' ';
  }

  _buildFloor() {
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.carpetDiff,
      normalMap: this.textures.carpetNorm,
      roughnessMap: this.textures.carpetRough,
      roughness: 0.85,
      metalness: 0,
    });

    const meshGeom = new THREE.PlaneGeometry(TILE, TILE);

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const floor = new THREE.Mesh(meshGeom, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x * TILE + TILE / 2, 0, z * TILE + TILE / 2);
        floor.receiveShadow = true;
        this.object3d.add(floor);
      }
    }
  }

  _buildCeiling() {
    const ceilMat = new THREE.MeshStandardMaterial({
      map: this.textures.ceilDiff,
      normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough,
      roughness: 0.95,
      color: 0xeee8e0,
    });

    const meshGeom = new THREE.PlaneGeometry(TILE, TILE);

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;
        const ceil = new THREE.Mesh(meshGeom, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(x * TILE + TILE / 2, ROOM_H, z * TILE + TILE / 2);
        this.object3d.add(ceil);
      }
    }
  }

  _buildWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.wallDiff,
      normalMap: this.textures.wallNor,
      roughnessMap: this.textures.wallRough,
      roughness: 0.85,
    });

    const footerMat = new THREE.MeshStandardMaterial({
      map: this.textures.footerDiff,
      normalMap: this.textures.footerNor,
      roughnessMap: this.textures.footerRough,
      roughness: 0.8,
      color: 0x887755,
    });

    const addWall = (px, py, pz, w, h, d) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h - FOOTER_H, d), wallMat);
      wall.position.set(px, py + FOOTER_H / 2 + (h - FOOTER_H) / 2, pz);
      this.object3d.add(wall);

      const footer = new THREE.Mesh(new THREE.BoxGeometry(w + d, FOOTER_H, d + 0.02), footerMat);
      footer.position.set(px, py + FOOTER_H / 2, pz);
      this.object3d.add(footer);
    };

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this._isWalkable(x, z)) continue;

        const cx = x * TILE + TILE / 2;
        const cz = z * TILE + TILE / 2;

        if (z === 0 || !this._isWalkable(x, z - 1)) {
          addWall(cx, 0, z * TILE, TILE, ROOM_H, WALL_T);
        }
        if (z === GH - 1 || !this._isWalkable(x, z + 1)) {
          addWall(cx, 0, z * TILE + TILE, TILE, ROOM_H, WALL_T);
        }
        if (x === 0 || !this._isWalkable(x - 1, z)) {
          addWall(x * TILE, 0, cz, WALL_T, ROOM_H, TILE);
        }
        if (x === GW - 1 || !this._isWalkable(x + 1, z)) {
          addWall(x * TILE + TILE, 0, cz, WALL_T, ROOM_H, TILE);
        }
      }
    }
  }

  _createLights() {
    const ambient = new THREE.AmbientLight(0xffddbb, 1.2);
    this.object3d.add(ambient);

    const buzz = [0.3, 0.6, 0.45, 0.8, 0.35, 0.75, 0.5, 0.9, 0.4, 0.7, 0.55, 0.85, 0.65];
    let bi = 0;

    const fixtureMat = new THREE.MeshStandardMaterial({
      map: this.textures.ceilDiff,
      normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough,
      emissiveMap: this.textures.ceilEmit,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      metalness: 0.1,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.15,
    });

    for (let z = 2; z < GH - 1; z += 4) {
      for (let x = 2; x < GW - 1; x += 4) {
        if (!this._isWalkable(x, z)) continue;
        const cx = x * TILE + TILE / 2;
        const cz = z * TILE + TILE / 2;

        const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.25), fixtureMat);
        fixture.position.set(cx, ROOM_H - 0.025, cz);
        this.object3d.add(fixture);

        const glow = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.18), glowMat);
        glow.position.set(cx, ROOM_H - 0.04, cz);
        this.object3d.add(glow);

        const pl = new THREE.PointLight(0xffddaa, 0.3, 10);
        pl.position.set(cx, ROOM_H - 0.1, cz);
        pl.userData = { timer: Math.random() * 10, buzzRange: buzz[bi++ % buzz.length] };
        this.object3d.add(pl);
        this.lights.push(pl);
      }
    }
  }

  _cloneModel(key) {
    const src = this.models[key];
    if (!src || src.children.length === 0) return new THREE.Group();
    return src.clone(true);
  }

  _createProps() {
    const cells = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (this.grid[z][x] === 'r') cells.push({ x, z });
      }
    }

    if (cells.length === 0) return;

    for (let i = 0; i < Math.min(6, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const cab = this._cloneModel('filing_cabinet');
      cab.position.set(cx, 0, cz);
      cab.rotation.y = Math.random() * Math.PI * 2;
      cab.scale.set(0.8, 0.8, 0.8);
      this.object3d.add(cab);
    }

    for (let i = 0; i < Math.min(6, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const shelf = this._cloneModel('shelf');
      shelf.position.set(cx, 0, cz);
      shelf.rotation.y = Math.random() * Math.PI * 2;
      shelf.scale.set(1.5, 1.5, 1.5);
      this.object3d.add(shelf);
    }

    for (let i = 0; i < Math.min(3, cells.length); i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const cx = cell.x * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const cz = cell.z * TILE + TILE / 2 + (Math.random() - 0.5) * 2;
      const cooler = this._cloneModel('water_cooler');
      cooler.position.set(cx, 0, cz);
      cooler.rotation.y = Math.random() * Math.PI * 2;
      cooler.scale.set(3, 3, 3);
      this.object3d.add(cooler);
    }
  }

  _spawnItem(type, x, z) {
    const modelKey = ITEM_MODEL_MAP[type];
    if (!modelKey) return;
    const mesh = this._cloneModel(modelKey.replace('.glb', ''));
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

  _createExit() {
    const px = 75 * TILE + TILE / 2;
    const pz = 56 * TILE + TILE / 2;

    const doorMat = new THREE.MeshStandardMaterial({
      map: this.textures.wallDiff,
      roughness: 0.85,
      metalness: 0,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      map: this.textures.footerDiff,
      roughness: 0.6,
      metalness: 0.1,
      color: 0x887755,
    });
    const barMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
    const signMat = new THREE.MeshStandardMaterial({
      map: this.textures.ceilEmit,
      color: 0xcc3333,
      emissive: 0xcc2222,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const signGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffeedd,
      emissive: 0xffaa66,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.4,
    });

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

  _createWallStains() {
    const stainMat = new THREE.MeshStandardMaterial({
      color: 0x665544,
      transparent: true,
      opacity: 0.08,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 40; i++) {
      const gx = Math.floor(Math.random() * GW);
      const gz = Math.floor(Math.random() * GH);
      if (!this._isWalkable(gx, gz)) continue;

      const cx = gx * TILE + TILE / 2 + (Math.random() - 0.5) * TILE * 0.8;
      const cz = gz * TILE + TILE / 2 + (Math.random() - 0.5) * TILE * 0.8;
      const stain = new THREE.Mesh(
        new THREE.CircleGeometry(0.1 + Math.random() * 0.25, 6),
        stainMat
      );
      const wallDir = Math.floor(Math.random() * 4);
      const h = 0.5 + Math.random() * 1.5;

      if (wallDir === 0) {
        stain.position.set(cx, h, gz * TILE);
        stain.rotation.y = 0;
      } else if (wallDir === 1) {
        stain.position.set(cx, h, gz * TILE + TILE);
        stain.rotation.y = 0;
      } else if (wallDir === 2) {
        stain.position.set(gx * TILE, h, cz);
        stain.rotation.y = Math.PI / 2;
      } else {
        stain.position.set(gx * TILE + TILE, h, cz);
        stain.rotation.y = Math.PI / 2;
      }
      this.object3d.add(stain);
    }
  }

  getWallColliders() {
    return this.wallBoxes;
  }

  getCollisionGrid() {
    return this.grid;
  }

  update(delta) {
    for (const light of this.lights) {
      light.userData.timer += delta;
      const f = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      light.intensity = 0.3 * Math.max(0.85, 1 - Math.abs(f * 0.15));
    }
  }

  getInteractables() { return this.interactables; }
}
