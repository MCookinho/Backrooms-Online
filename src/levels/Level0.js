import * as THREE from 'three';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;
const GW = 60;
const GH = 40;

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3(0, 0, 0);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.wallBoxes = [];
    this.maze = null;
    this.roomCells = [];
    this.entities = [];
  }

  async load(scene) {
    this.object3d = new THREE.Group();
    scene.add(this.object3d);
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
    load('wallDiff', 'backrooms-wall-diffuse.png', 2, 1);
    load('wallNor', 'backrooms-wall-normal.png', 2, 1);
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
    this.roomCells = [];
    this.entities = [];
    this.maze = this._generateMaze();
    this._buildFloor();
    this._buildCeiling();
    this._buildWalls();
    this._buildTrim();
    this._createLights();
    this._addWallDetails();
    this._createProps();
    this._placeEntities();
    this._createExit();
  }
  _generateMaze() {
    const cells = [];
    for (let z = 0; z < GH; z++) {
      cells[z] = [];
      for (let x = 0; x < GW; x++) {
        cells[z][x] = { n: true, s: true, e: true, w: true, visited: false, room: false };
      }
    }

    const sx = Math.floor(GW / 2);
    const sz = Math.floor(GH / 2);
    cells[sz][sx].visited = true;
    const stack = [{ x: sx, z: sz }];

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const nb = [];
      if (cur.z > 0 && !cells[cur.z - 1][cur.x].visited) nb.push({ x: cur.x, z: cur.z - 1, d: 'n' });
      if (cur.z < GH - 1 && !cells[cur.z + 1][cur.x].visited) nb.push({ x: cur.x, z: cur.z + 1, d: 's' });
      if (cur.x > 0 && !cells[cur.z][cur.x - 1].visited) nb.push({ x: cur.x - 1, z: cur.z, d: 'w' });
      if (cur.x < GW - 1 && !cells[cur.z][cur.x + 1].visited) nb.push({ x: cur.x + 1, z: cur.z, d: 'e' });
      if (!nb.length) { stack.pop(); continue; }

      const n = nb[Math.floor(Math.random() * nb.length)];
      if (n.d === 'n') { cells[cur.z][cur.x].n = false; cells[n.z][n.x].s = false; }
      if (n.d === 's') { cells[cur.z][cur.x].s = false; cells[n.z][n.x].n = false; }
      if (n.d === 'e') { cells[cur.z][cur.x].e = false; cells[n.z][n.x].w = false; }
      if (n.d === 'w') { cells[cur.z][cur.x].w = false; cells[n.z][n.x].e = false; }
      cells[n.z][n.x].visited = true;
      stack.push(n);
    }

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (Math.random() > 0.12) continue;
        const dirs = [];
        if (z > 0 && cells[z][x].n) dirs.push('n');
        if (z < GH - 1 && cells[z][x].s) dirs.push('s');
        if (x > 0 && cells[z][x].w) dirs.push('w');
        if (x < GW - 1 && cells[z][x].e) dirs.push('e');
        if (!dirs.length) continue;
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        if (d === 'n') { cells[z][x].n = false; cells[z - 1][x].s = false; }
        if (d === 's') { cells[z][x].s = false; cells[z + 1][x].n = false; }
        if (d === 'e') { cells[z][x].e = false; cells[z][x + 1].w = false; }
        if (d === 'w') { cells[z][x].w = false; cells[z][x - 1].e = false; }
      }
    }

    for (let z = 0; z < GH - 1; z += 2) {
      for (let x = 0; x < GW - 1; x += 2) {
        if (Math.random() > 0.35) continue;
        const rw = Math.random() < 0.25 ? 3 : 2;
        const rh = Math.random() < 0.25 ? 3 : 2;
        if (x + rw > GW || z + rh > GH) continue;
        for (let dz = 0; dz < rh; dz++) {
          for (let dx = 0; dx < rw; dx++) {
            const cx = x + dx, cz = z + dz;
            if (dz > 0) { cells[cz][cx].n = false; cells[cz - 1][cx].s = false; }
            if (dx > 0) { cells[cz][cx].w = false; cells[cz][cx - 1].e = false; }
            cells[cz][cx].room = true;
            this.roomCells.push({ x: cx, z: cz });
          }
        }
      }
    }

    this.spawnPoint.set(sx * TILE + TILE / 2, 0, sz * TILE + TILE / 2);
    return cells;
  }

  _buildFloor() {
    const tex = this._generateCarpetTexture();
    const rough = this._generateCarpetRoughness();
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughnessMap: rough,
      roughness: 0.85, color: 0xffffff,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(GW * TILE, 0.2, GH * TILE), mat);
    m.position.set(GW * TILE / 2, -0.1, GH * TILE / 2);
    this.object3d.add(m);
  }

  _buildCeiling() {
    const mat = this._createCeilingMaterial();
    const m = new THREE.Mesh(new THREE.BoxGeometry(GW * TILE, 0.1, GH * TILE), mat);
    m.position.set(GW * TILE / 2, ROOM_H, GH * TILE / 2);
    this.object3d.add(m);
  }
  _buildWalls() {
    const mat = this._createWallMaterial();
    const wallY = ROOM_H / 2;

    const addWallSeg = (cx, cz, len, ry) => {
      if (len <= 0.01) return;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(len, ROOM_H, ry === 0 ? WALL_T : len > WALL_T ? WALL_T : len),
        mat
      );
      const w = ry === 0 ? len : WALL_T;
      const d = ry === 0 ? WALL_T : len;
      const geom = new THREE.BoxGeometry(w, ROOM_H, d);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(cx, wallY, cz);
      mesh.rotation.y = ry;
      this.object3d.add(mesh);
      mesh.updateMatrixWorld(true);
      this.wallBoxes.push(new THREE.Box3().setFromObject(mesh));
    };

    // Horizontal walls (run along X axis) - merge consecutive cells
    for (let z = 0; z <= GH; z++) {
      let x = 0;
      while (x < GW) {
        const hasWall = (z === 0 || z === GH) ? true : this.maze[z - 1][x].s;
        if (!hasWall) { x++; continue; }
        const startX = x;
        while (x < GW && ((z === 0 || z === GH) ? true : this.maze[z - 1][x].s)) x++;
        const segLen = (x - startX) * TILE;
        addWallSeg(startX * TILE + segLen / 2, z * TILE, segLen, 0);
      }
    }

    // Vertical walls (run along Z axis) - merge consecutive cells
    for (let x = 0; x <= GW; x++) {
      let z = 0;
      while (z < GH) {
        const hasWall = (x === 0 || x === GW) ? true : this.maze[z][x - 1].e;
        if (!hasWall) { z++; continue; }
        const startZ = z;
        while (z < GH && ((x === 0 || x === GW) ? true : this.maze[z][x - 1].e)) z++;
        const segLen = (z - startZ) * TILE;
        addWallSeg(x * TILE, startZ * TILE + segLen / 2, segLen, Math.PI / 2);
      }
    }
  }

  _buildTrim() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.7 });
    const th = 0.08, td = 0.06, ty = th / 2;

    const addTrim = (cx, cz, len, ry) => {
      if (len <= 0.01) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, th, td), mat);
      m.position.set(cx, ty, cz);
      m.rotation.y = ry;
      this.object3d.add(m);
    };

    for (let z = 0; z <= GH; z++) {
      let x = 0;
      while (x < GW) {
        const hasWall = (z === 0 || z === GH) ? true : this.maze[z - 1][x].s;
        if (!hasWall) { x++; continue; }
        const startX = x;
        while (x < GW && ((z === 0 || z === GH) ? true : this.maze[z - 1][x].s)) x++;
        const segLen = (x - startX) * TILE;
        addTrim(startX * TILE + segLen / 2, z * TILE, segLen, 0);
      }
    }

    for (let x = 0; x <= GW; x++) {
      let z = 0;
      while (z < GH) {
        const hasWall = (x === 0 || x === GW) ? true : this.maze[z][x - 1].e;
        if (!hasWall) { z++; continue; }
        const startZ = z;
        while (z < GH && ((x === 0 || x === GW) ? true : this.maze[z][x - 1].e)) z++;
        const segLen = (z - startZ) * TILE;
        addTrim(x * TILE, startZ * TILE + segLen / 2, segLen, Math.PI / 2);
      }
    }
  }

  _createLights() {
    const fixMat = new THREE.MeshStandardMaterial({
      map: this.textures.lightDiff, normalMap: this.textures.lightNor,
      roughnessMap: this.textures.lightRough, roughness: 0.6, metalness: 0.3, color: 0xcccccc,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
      map: this.textures.lightEmit, emissive: 0xffffaa,
      emissiveIntensity: 0.5, color: 0xffffaa,
    });

    const roomSet = new Set();
    for (const rc of this.roomCells) roomSet.add(`${rc.x},${rc.z}`);

    let lightCount = 0;
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        const isRoom = roomSet.has(`${x},${z}`);
        const isMainPath = (x % 3 === 0 && z % 4 === 0);
        if (!isRoom && !isMainPath) continue;
        if (!isRoom && Math.random() > 0.4) continue;

        const px = x * TILE + TILE / 2;
        const pz = z * TILE + TILE / 2;

        const fix = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.2), fixMat);
        fix.position.set(px, ROOM_H - 0.05, pz);
        this.object3d.add(fix);

        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.1), bulbMat);
        bulb.position.set(px, ROOM_H - 0.08, pz);
        this.object3d.add(bulb);

        if (lightCount < 120) {
          const pl = new THREE.PointLight(0xfff0cc, 1.0, 12, 1.5);
          pl.position.set(px, ROOM_H - 0.2, pz);
          this.object3d.add(pl);
          this.lights.push(pl);
          pl.userData = { buzzRange: 0.95 + Math.random() * 0.1, timer: 0, broken: Math.random() < 0.08 };
          lightCount++;
        }
      }
    }

    const ambient = new THREE.AmbientLight(0xffeedd, 0.35);
    this.object3d.add(ambient);
  }

  _addWallDetails() {
    const stainMat = new THREE.MeshBasicMaterial({
      color: 0x665533, transparent: true, opacity: 0.12,
    });
    const moldMat = new THREE.MeshBasicMaterial({
      color: 0x445522, transparent: true, opacity: 0.2,
    });

    // Add stains/mold to random walls
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * GW);
      const z = Math.floor(Math.random() * GH);
      const px = x * TILE + TILE / 2 + (Math.random() - 0.5) * (TILE - 0.5);
      const pz = z * TILE + TILE / 2 + (Math.random() - 0.5) * (TILE - 0.5);
      const ph = 0.5 + Math.random() * 2;
      const isMold = Math.random() < 0.4;

      const stain = new THREE.Mesh(
        new THREE.CircleGeometry(0.1 + Math.random() * 0.3, 6),
        isMold ? moldMat : stainMat
      );
      stain.position.set(px, ph, pz);
      stain.rotation.x = 0;
      stain.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
      this.object3d.add(stain);
    }
  }
  _createProps() {
    const placed = [];

    for (const rc of this.roomCells) {
      if (Math.random() > 0.7) continue;
      const px = rc.x * TILE + 0.8 + Math.random() * (TILE - 1.6);
      const pz = rc.z * TILE + 0.8 + Math.random() * (TILE - 1.6);
      const tooClose = placed.some(p => Math.abs(p.x - px) < 1.2 && Math.abs(p.z - pz) < 1.2);
      if (tooClose) continue;
      placed.push({ x: px, z: pz });

      const roll = Math.random();
      if (roll < 0.45) this.object3d.add(this._createChair(px, pz));
      else if (roll < 0.75) this.object3d.add(this._createDesk(px, pz));
      else if (roll < 0.9) this.object3d.add(this._createShelf(px, pz));
      else this.object3d.add(this._createWaterCooler(px, pz));
    }

    this._createScatteredItems();
  }

  _createChair(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.5 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat);
    seat.position.set(0, 0.5, 0); g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.05), mat);
    back.position.set(0, 0.75, -0.25); g.add(back);

    for (const lx of [-0.2, 0.2]) {
      for (const lz of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), metal);
        leg.position.set(lx, 0.225, lz); g.add(leg);
      }
    }
    g.position.set(x, 0, z);
    return g;
  }

  _createDesk(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), mat);
    top.position.set(0, 0.75, 0); g.add(top);

    for (const lx of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), mat);
      leg.position.set(lx, 0.36, 0); g.add(leg);
    }
    g.position.set(x, 0, z);
    return g;
  }

  _createShelf(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.8, metalness: 0.3 });

    const sides = () => {
      for (const sx of [-0.4, 0.4]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.3), mat);
        s.position.set(sx, 0.6, 0); g.add(s);
      }
    };
    sides();

    for (let sy = 0; sy < 3; sy++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.03, 0.28), mat);
      shelf.position.set(0, 0.1 + sy * 0.4, 0); g.add(shelf);
    }
    g.position.set(x, 0, z);
    return g;
  }

  _createWaterCooler(x, z) {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.3, transparent: true, opacity: 0.6 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8), white);
    body.position.set(0, 0.3, 0); g.add(body);

    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8), blue);
    bottle.position.set(0, 0.7, 0); g.add(bottle);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.1, 8), blue);
    top.position.set(0, 0.9, 0); g.add(top);

    g.position.set(x, 0, z);
    return g;
  }

  _createScatteredItems() {
    const items = [
      { type: 'almond_water', count: 6 },
      { type: 'cashew_water', count: 2 },
      { type: 'flashlight', count: 2 },
      { type: 'batteries', count: 4 },
      { type: 'lighter', count: 3 },
      { type: 'first_aid', count: 3 },
      { type: 'keycard', count: 1 },
      { type: 'note', count: 4 },
    ];

    const roomCells = [...this.roomCells];
    // Also place some in corridor cells
    const corridorCells = [];
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (!this.maze[z][x].room) corridorCells.push({ x, z });
      }
    }

    let cellIdx = 0;
    for (const it of items) {
      for (let i = 0; i < it.count; i++) {
        const pool = it.type === 'keycard' ? roomCells : (Math.random() < 0.6 ? roomCells : corridorCells);
        if (!pool.length) continue;

        for (let att = 0; att < 20; att++) {
          const cell = pool[Math.floor(Math.random() * pool.length)];
          const cx = cell.x * TILE + TILE / 2;
          const cz = cell.z * TILE + TILE / 2;

          // Check no overlap with existing interactables
          const tooClose = this.interactables.some(
            int => Math.abs(int.position.x - cx) < 1.0 && Math.abs(int.position.z - cz) < 1.0
          );
          if (!tooClose || att === 19) {
            this._spawnItem(it.type, cx, cz);
            break;
          }
        }
      }
    }
  }

  _spawnItem(type, x, z) {
    const mesh = this._createItemMesh(type);
    if (!mesh) return;
    mesh.position.set(x, 0.05, z);
    this.object3d.add(mesh);
    this.interactables.push({
      mesh, type,
      position: new THREE.Vector3(x, 0.1, z),
    });
  }

  _createItemMesh(type) {
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
      case 'cashew_water': {
        const bMat = new THREE.MeshStandardMaterial({ color: 0xcc8866, transparent: true, opacity: 0.7, roughness: 0.2 });
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8), bMat);
        b.position.y = 0.15; g.add(b);
        const cMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), cMat);
        c.position.y = 0.3; g.add(c);
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
      case 'first_aid': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xee4444 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), mat);
        box.position.y = 0.04; g.add(box);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        cross.position.set(0, 0.05, 0.06); g.add(cross);
        break;
      }
      case 'keycard': {
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
      default: return null;
    }
    return g;
  }
  _placeEntities() {
    // Hounds - in random corridors away from spawn
    const sx = Math.floor(GW / 2), sz = Math.floor(GH / 2);
    for (let i = 0; i < 6; i++) {
      for (let att = 0; att < 50; att++) {
        const x = Math.floor(Math.random() * GW);
        const z = Math.floor(Math.random() * GH);
        if (Math.abs(x - sx) < 5 && Math.abs(z - sz) < 5) continue;
        if (this.maze[z][x].room) continue;
        this.entities.push({
          type: 'hound',
          position: new THREE.Vector3(x * TILE + TILE / 2, 0, z * TILE + TILE / 2),
          speed: 1.5 + Math.random() * 0.8,
          aggroRange: 8 + Math.random() * 4,
          patrolRadius: 3 + Math.random() * 3,
          damage: 15,
        });
        break;
      }
    }

    // Facelings - in rooms and corridors
    for (let i = 0; i < 4; i++) {
      for (let att = 0; att < 50; att++) {
        const x = Math.floor(Math.random() * GW);
        const z = Math.floor(Math.random() * GH);
        if (Math.abs(x - sx) < 4 && Math.abs(z - sz) < 4) continue;
        this.entities.push({
          type: 'faceling',
          position: new THREE.Vector3(x * TILE + TILE / 2, 0, z * TILE + TILE / 2),
          speed: 0.6 + Math.random() * 0.3,
          aggroRange: 5 + Math.random() * 3,
          patrolRadius: 2 + Math.random() * 2,
          damage: 5,
        });
        break;
      }
    }

    // Dullers - standing still in rooms
    for (let i = 0; i < 5; i++) {
      for (let att = 0; att < 50; att++) {
        const rc = this.roomCells[Math.floor(Math.random() * this.roomCells.length)];
        if (!rc) continue;
        const x = rc.x, z = rc.z;
        if (Math.abs(x - sx) < 3 && Math.abs(z - sz) < 3) continue;
        this.entities.push({
          type: 'duller',
          position: new THREE.Vector3(x * TILE + TILE / 2, 0, z * TILE + TILE / 2),
          speed: 0,
          aggroRange: 0,
          patrolRadius: 0,
          damage: 0,
        });
        break;
      }
    }
  }

  _createExit() {
    const sx = Math.floor(GW / 2), sz = Math.floor(GH / 2);
    const dist = {};
    const queue = [{ x: sx, z: sz }];
    dist[`${sx},${sz}`] = 0;
    let farKey = `${sx},${sz}`;

    while (queue.length) {
      const cur = queue.shift();
      const ck = `${cur.x},${cur.z}`;
      const d = dist[ck];
      if (d > dist[farKey]) farKey = ck;

      const cell = this.maze[cur.z][cur.x];
      if (!cell.n && cur.z > 0) {
        const nk = `${cur.x},${cur.z - 1}`;
        if (dist[nk] === undefined) { dist[nk] = d + 1; queue.push({ x: cur.x, z: cur.z - 1 }); }
      }
      if (!cell.s && cur.z < GH - 1) {
        const nk = `${cur.x},${cur.z + 1}`;
        if (dist[nk] === undefined) { dist[nk] = d + 1; queue.push({ x: cur.x, z: cur.z + 1 }); }
      }
      if (!cell.w && cur.x > 0) {
        const nk = `${cur.x - 1},${cur.z}`;
        if (dist[nk] === undefined) { dist[nk] = d + 1; queue.push({ x: cur.x - 1, z: cur.z }); }
      }
      if (!cell.e && cur.x < GW - 1) {
        const nk = `${cur.x + 1},${cur.z}`;
        if (dist[nk] === undefined) { dist[nk] = d + 1; queue.push({ x: cur.x + 1, z: cur.z }); }
      }
    }

    const [ex, ez] = farKey.split(',').map(Number);
    // Place exit in a room cell if possible, or corridor
    let exitX = ex, exitZ = ez;
    if (!this.maze[exitZ][exitX].room) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = ex + dx, nz = ez + dz;
          if (nx >= 0 && nx < GW && nz >= 0 && nz < GH && this.maze[nz][nx].room) {
            exitX = nx; exitZ = nz;
          }
        }
      }
    }

    const px = exitX * TILE + TILE / 2;
    const pz = exitZ * TILE + TILE / 2;

    const exitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x445566, emissive: 0x223344, emissiveIntensity: 0.4 });

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
  _createWallMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.wallDiff, normalMap: this.textures.wallNor,
      roughness: 0.85, color: 0xccbb77,
    });
  }

  _createCeilingMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.ceilDiff, normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough, roughness: 0.9, color: 0xccbb99,
    });
  }

  _generateCarpetTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
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

    const tw = 32, th = 32;
    ctx.strokeStyle = 'rgba(160, 130, 70, 0.25)';
    ctx.lineWidth = 1.5;
    for (let py = 0; py < size; py += th) {
      for (let px = 0; px < size; px += tw) {
        const cx = px + tw / 2, cy = py + th / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - th / 2 + 2);
        ctx.lineTo(cx + tw / 2 - 2, cy);
        ctx.lineTo(cx, cy + th / 2 - 2);
        ctx.lineTo(cx - tw / 2 + 2, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(140, 110, 50, 0.2)';
    ctx.lineWidth = 1;
    for (let py = 0; py < size; py += th) {
      for (let px = 0; px < size; px += tw) {
        const cx = px + tw / 2, cy = py + th / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - th / 2 + 6);
        ctx.lineTo(cx + tw / 2 - 6, cy);
        ctx.lineTo(cx, cy + th / 2 - 6);
        ctx.lineTo(cx - tw / 2 + 6, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(150, 120, 70, 0.06)';
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * size, sy = Math.random() * size;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 10 + Math.random() * 20, 8 + Math.random() * 16, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.anisotropy = 4;
    return tex;
  }

  _generateCarpetRoughness() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 60;
      const val = Math.max(150, Math.min(255, d[i] + n));
      d[i] = val; d[i + 1] = val; d[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.fillStyle = 'rgba(60, 60, 60, 0.3)';
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * size, sy = Math.random() * size;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 15 + Math.random() * 25, 12 + Math.random() * 20, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

  getWallColliders() { return this.wallBoxes; }

  update(delta) {
    for (const light of this.lights) {
      if (light.userData.broken) {
        light.intensity *= 0.98;
        if (light.intensity < 0.01) light.intensity = 0;
        continue;
      }
      light.userData.timer += delta;
      const f = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      light.intensity = 1.0 * Math.max(0.9, 1 - Math.abs(f * 0.1));
    }
  }

  getInteractables() { return this.interactables; }

  getThreatPositions() { return this.entities; }
}
