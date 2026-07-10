import * as THREE from 'three';

const TILE = 4;
const ROOM_H = 3.5;
const WALL_T = 0.15;

export class Level0 {
  constructor() {
    this.spawnPoint = new THREE.Vector3(0, 0, 0);
    this.object3d = new THREE.Group();
    this.interactables = [];
    this.props = [];
    this.lights = [];
    this.wallBoxes = [];
    this.maze = null;
    this.GW = 10;
    this.GH = 10;
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
    load('floorDiff', 'backrooms-carpet-diffuse.png', 4, 4);
    load('floorNor', 'backrooms-carpet-normal.png', 4, 4);
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
    this.maze = this._generateMaze();
    this._buildFloor();
    this._buildCeiling();
    this._buildWalls();
    this._buildTrim();
    this._createLights();
    this._createProps();
    this._createExit();
  }

  _generateMaze() {
    const GW = this.GW, GH = this.GH;
    const cells = [];
    for (let z = 0; z < GH; z++) {
      cells[z] = [];
      for (let x = 0; x < GW; x++) {
        cells[z][x] = { n: true, s: true, e: true, w: true, visited: false };
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

    // Remove random walls for loops
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x < GW; x++) {
        if (Math.random() > 0.15) continue;
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

    // Merge 2x2 blocks into rooms
    for (let z = 0; z < GH - 1; z += 2) {
      for (let x = 0; x < GW - 1; x += 2) {
        if (Math.random() > 0.35) continue;
        cells[z][x].e = false; cells[z][x + 1].w = false;
        cells[z][x].s = false; cells[z + 1][x].n = false;
        cells[z + 1][x].e = false; cells[z + 1][x + 1].w = false;
        cells[z][x + 1].s = false; cells[z + 1][x + 1].n = false;
        this.roomCells.push({ x, z }, { x: x + 1, z }, { x, z: z + 1 }, { x: x + 1, z: z + 1 });
      }
    }

    this.spawnPoint.set(sx * TILE + TILE / 2, 0, sz * TILE + TILE / 2);
    return cells;
  }

  _buildFloor() {
    const mat = this._createFloorMaterial();
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(this.GW * TILE, 0.2, this.GH * TILE),
      mat
    );
    m.position.set(this.GW * TILE / 2, -0.1, this.GH * TILE / 2);
    this.object3d.add(m);
  }

  _buildCeiling() {
    const mat = this._createCeilingMaterial();
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(this.GW * TILE, 0.1, this.GH * TILE),
      mat
    );
    m.position.set(this.GW * TILE / 2, ROOM_H, this.GH * TILE / 2);
    this.object3d.add(m);
  }
  _buildWalls() {
    const mat = this._createWallMaterial();
    const wallY = ROOM_H / 2;
    const GW = this.GW, GH = this.GH;

    const addWall = (cx, cz, len, ry) => {
      if (len <= 0.01) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, ROOM_H, WALL_T), mat);
      m.position.set(cx, wallY, cz);
      m.rotation.y = ry;
      this.object3d.add(m);
      m.updateMatrixWorld(true);
      this.wallBoxes.push(new THREE.Box3().setFromObject(m));
    };

    // Horizontal walls (along X axis, at Z boundaries between rows)
    for (let z = 0; z <= GH; z++) {
      for (let x = 0; x < GW; x++) {
        const hasWall = (z === 0 || z === GH) ? true : this.maze[z - 1][x].s;
        if (!hasWall) continue;
        const cz = z * TILE;
        addWall(x * TILE + TILE / 2, cz, TILE, 0);
      }
    }

    // Vertical walls (along Z axis, at X boundaries between columns)
    for (let z = 0; z < GH; z++) {
      for (let x = 0; x <= GW; x++) {
        const hasWall = (x === 0 || x === GW) ? true : this.maze[z][x - 1].e;
        if (!hasWall) continue;
        const cx = x * TILE;
        addWall(cx, z * TILE + TILE / 2, TILE, Math.PI / 2);
      }
    }
  }

  _buildTrim() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x887755, roughness: 0.7 });
    const th = 0.08, td = 0.06, ty = th / 2;
    const GW = this.GW, GH = this.GH;

    const addTrim = (cx, cz, len, ry) => {
      if (len <= 0.01) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, th, td), mat);
      m.position.set(cx, ty, cz);
      m.rotation.y = ry;
      this.object3d.add(m);
    };

    for (let z = 0; z <= GH; z++) {
      for (let x = 0; x < GW; x++) {
        const hasWall = (z === 0 || z === GH) ? true : this.maze[z - 1][x].s;
        if (!hasWall) continue;
        const cz = z * TILE;
        addTrim(x * TILE + TILE / 2, cz, TILE, 0);
      }
    }

    for (let z = 0; z < GH; z++) {
      for (let x = 0; x <= GW; x++) {
        const hasWall = (x === 0 || x === GW) ? true : this.maze[z][x - 1].e;
        if (!hasWall) continue;
        const cx = x * TILE;
        addTrim(cx, z * TILE + TILE / 2, TILE, Math.PI / 2);
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

    const lightSet = new Set();
    for (const rc of this.roomCells) lightSet.add(`${rc.x},${rc.z}`);

    for (let z = 0; z < this.GH; z++) {
      for (let x = 0; x < this.GW; x++) {
        const isRoom = lightSet.has(`${x},${z}`);
        if (!isRoom && Math.random() > 0.5) continue;

        const px = x * TILE + TILE / 2;
        const pz = z * TILE + TILE / 2;

        const fix = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.2), fixMat);
        fix.position.set(px, ROOM_H - 0.05, pz);
        this.object3d.add(fix);

        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.1), bulbMat);
        bulb.position.set(px, ROOM_H - 0.08, pz);
        this.object3d.add(bulb);

        const pl = new THREE.PointLight(0xfff0cc, 1.2, 10, 1.5);
        pl.position.set(px, ROOM_H - 0.2, pz);
        this.object3d.add(pl);
        this.lights.push(pl);
        pl.userData = { buzzRange: 0.95 + Math.random() * 0.1, timer: 0 };
      }
    }

    const ambient = new THREE.AmbientLight(0xffeedd, 0.4);
    this.object3d.add(ambient);
  }
  _createProps() {
    const placed = [];

    for (const rc of this.roomCells) {
      const x = rc.x * TILE, z = rc.z * TILE;
      for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
        for (let att = 0; att < 5; att++) {
          const px = x + 0.8 + Math.random() * (TILE - 1.6);
          const pz = z + 0.8 + Math.random() * (TILE - 1.6);
          const tooClose = placed.some(p => Math.abs(p.x - px) < 1.2 && Math.abs(p.z - pz) < 1.2);
          if (!tooClose) {
            placed.push({ x: px, z: pz });
            const isChair = Math.random() < 0.6;
            this.object3d.add(isChair ? this._createChair(px, pz) : this._createDesk(px, pz));
            break;
          }
        }
      }
    }

    this._createScatteredItems();
  }

  _createChair(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.5 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat);
    seat.position.set(0, 0.5, 0);
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.05), mat);
    back.position.set(0, 0.75, -0.25);
    g.add(back);

    for (const lx of [-0.2, 0.2]) {
      for (const lz of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), metal);
        leg.position.set(lx, 0.225, lz);
        g.add(leg);
      }
    }

    g.position.set(x, 0, z);
    return g;
  }

  _createDesk(x, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), mat);
    top.position.set(0, 0.75, 0);
    g.add(top);

    for (const lx of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), mat);
      leg.position.set(lx, 0.36, 0);
      g.add(leg);
    }

    g.position.set(x, 0, z);
    return g;
  }

  _createScatteredItems() {
    const itemTypes = ['almond_water', 'flashlight', 'batteries', 'lighter', 'note', 'almond_water'];
    let idx = 0;

    for (const rc of this.roomCells) {
      if (idx >= itemTypes.length) break;
      // Only use first few room cells for items
      if (Math.random() > 0.5) continue;
      const px = rc.x * TILE + TILE / 2;
      const pz = rc.z * TILE + TILE / 2;
      this._spawnItem(itemTypes[idx], px, pz);
      idx++;
    }
  }

  _spawnItem(type, x, z) {
    const item = this._createItemMesh(type);
    if (!item) return;
    item.position.set(x, 0.05, z);
    this.object3d.add(item);
    this.interactables.push({
      mesh: item,
      type,
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
  _createExit() {
    // BFS to farthest cell
    const GW = this.GW, GH = this.GH;
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
    const px = ex * TILE + TILE / 2;
    const pz = ez * TILE + TILE / 2;

    const exitMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x445566, emissive: 0x223344, emissiveIntensity: 0.3 });

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

  _createFloorMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.floorDiff, normalMap: this.textures.floorNor,
      roughness: 0.95, color: 0x887744,
    });
  }

  _createCeilingMaterial() {
    return new THREE.MeshStandardMaterial({
      map: this.textures.ceilDiff, normalMap: this.textures.ceilNor,
      roughnessMap: this.textures.ceilRough, roughness: 0.9, color: 0xccbb99,
    });
  }

  getWallColliders() { return this.wallBoxes; }

  update(delta) {
    for (const light of this.lights) {
      light.userData.timer += delta;
      const f = Math.sin(light.userData.timer * light.userData.buzzRange * 3);
      light.intensity = 1.2 * Math.max(0.9, 1 - Math.abs(f * 0.1));
    }
  }

  getInteractables() { return this.interactables; }

  getThreatPositions() {
    const positions = [];
    // Place threats in random cells (not spawn area)
    for (let i = 0; i < 3; i++) {
      for (let att = 0; att < 20; att++) {
        const x = Math.floor(Math.random() * this.GW);
        const z = Math.floor(Math.random() * this.GH);
        if (x === Math.floor(this.GW / 2) && z === Math.floor(this.GH / 2)) continue;
        const px = x * TILE + TILE / 2;
        const pz = z * TILE + TILE / 2;
        positions.push(new THREE.Vector3(px, 0, pz));
        break;
      }
    }
    return positions;
  }
}
