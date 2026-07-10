import * as THREE from 'three';

export class Threat {
  constructor(scene, position, config = {}) {
    this.scene = scene;
    this.position = position.clone();
    this.config = {
      speed: config.speed || 1.5,
      damage: config.damage || 15,
      aggroRange: config.aggroRange || 8,
      attackRange: config.attackRange || 1.5,
      patrolRadius: config.patrolRadius || 4,
      type: config.type || 'hound',
      model: config.model || null,
    };

    this.velocity = new THREE.Vector3();
    this.target = null;
    this.state = 'idle';
    this.health = this.config.type === 'duller' ? 999 : 100;
    this.alive = true;
    this.attackCooldown = 0;
    this.patrolTarget = this._randomPatrolPoint();
    this.wanderTimer = 0;

    const defaultModel = this._createMesh();
    this.object3d = this.config.model ? this._applyToModel(this.config.model) : defaultModel;
    this.object3d.position.copy(position);
    scene.add(this.object3d);
  }

  _applyToModel(model) {
    const group = model.clone(true);
    group.traverse((child) => {
      if (child.isMesh) {
        if (this.config.type === 'hound') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.95,
            metalness: 0,
          });
        } else if (this.config.type === 'faceling') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xccbbaa,
            roughness: 0.9,
            metalness: 0,
          });
        } else if (this.config.type === 'duller') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x665544,
            roughness: 0.95,
            metalness: 0,
            transparent: true,
            opacity: 0.85,
          });
        }
      }
    });
    return group;
  }

  _createMesh() {
    const group = new THREE.Group();

    if (this.config.type === 'hound') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 0.8 });
      const teethMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.6 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 1.1), mat);
      body.position.y = 0.55;
      body.geometry.translate(0, 0, -0.05);
      group.add(body);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.4), mat);
      head.position.set(0, 0.75, -0.55);
      group.add(head);

      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.15), mat);
      snout.position.set(0, 0.65, -0.7);
      group.add(snout);

      for (const sx of [-0.12, 0.12]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
        eye.position.set(sx, 0.82, -0.58);
        group.add(eye);
      }

      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.08), new THREE.MeshStandardMaterial({ color: 0x330000 }));
      mouth.position.set(0, 0.58, -0.7);
      group.add(mouth);

      for (const tx of [-0.05, 0.05]) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.03, 4), teethMat);
        tooth.position.set(tx, 0.6, -0.73);
        group.add(tooth);
      }

      const earShape = new THREE.ConeGeometry(0.06, 0.1, 4);
      for (const ex of [-0.15, 0.15]) {
        const ear = new THREE.Mesh(earShape, mat);
        ear.position.set(ex, 0.92, -0.5);
        group.add(ear);
      }

      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.2, 6), mat);
      tail.position.set(0, 0.5, 0.55);
      tail.rotation.x = 0.4;
      group.add(tail);

      for (const lx of [-0.25, 0.25]) {
        for (const lz of [-0.4, 0.4]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.35, 6), mat);
          leg.position.set(lx, 0.18, lz);
          group.add(leg);
        }
      }
      group.scale.set(0.85, 0.85, 0.85);
    } else if (this.config.type === 'faceling') {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.9 });
      const clothesMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.95 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.25), clothesMat);
      body.position.y = 0.85;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), skinMat);
      head.position.set(0, 1.35, 0);
      head.scale.set(1, 1.1, 0.9);
      group.add(head);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.08, 8), skinMat);
      neck.position.set(0, 1.15, 0);
      group.add(neck);

      for (const sx of [-0.3, 0.3]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), skinMat);
        arm.position.set(sx, 0.75, 0);
        group.add(arm);
      }

      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.25), clothesMat);
      legs.position.y = 0.35;
      group.add(legs);

      const hairMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), hairMat);
      hair.position.set(0, 1.4, 0.01);
      hair.scale.set(1.05, 0.15, 0.95);
      group.add(hair);

      group.scale.set(0.95, 0.95, 0.95);
    } else if (this.config.type === 'duller') {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.95 });
      const clothesMat = new THREE.MeshPhysicalMaterial({ color: 0x554433, roughness: 0.9, transparent: true, opacity: 0.85 });
      const tearMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 1 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.22), clothesMat);
      body.position.y = 0.8;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), skinMat);
      head.position.set(0, 1.25, 0.02);
      head.scale.set(1, 1.05, 0.85);
      group.add(head);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 8), skinMat);
      neck.position.set(0, 1.05, 0);
      group.add(neck);

      for (const sx of [-0.25, 0.25]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), clothesMat);
        arm.position.set(sx, 0.7, 0);
        arm.rotation.z = sx > 0 ? 0.08 : -0.08;
        group.add(arm);
      }

      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.22), clothesMat);
      legs.position.y = 0.3;
      group.add(legs);

      const tear1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.001, 0.04), tearMat);
      tear1.position.set(0.12, 0.6, 0.11);
      tear1.rotation.z = 0.2;
      group.add(tear1);

      const tear2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.001, 0.03), tearMat);
      tear2.position.set(-0.1, 0.4, 0.11);
      tear2.rotation.z = -0.15;
      group.add(tear2);

      group.rotation.z = 0.03;
      group.rotation.x = 0.02;
    }

    return group;
  }

  update(delta, player) {
    if (!this.alive) return;

    if (this.config.type === 'duller') {
      this.object3d.rotation.y += delta * 0.03;
      this.object3d.position.y = Math.sin(Date.now() * 0.001) * 0.002;
      return;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    const distToPlayer = this.object3d.position.distanceTo(player.position);

    if (distToPlayer < this.config.aggroRange) {
      this.state = 'chasing';
      this.target = player.position;
    } else if (this.state === 'chasing') {
      this.state = 'patrolling';
      this.target = null;
    }

    switch (this.state) {
      case 'idle':
        this.state = 'patrolling';
        break;
      case 'patrolling':
        this._patrol(delta);
        break;
      case 'chasing':
        this._chase(delta, player);
        break;
    }

    if (distToPlayer < this.config.attackRange && this.attackCooldown <= 0) {
      if (player.takeDamage) player.takeDamage(this.config.damage);
      this.attackCooldown = 1.5;
    }
  }

  _patrol(delta) {
    const dir = new THREE.Vector3()
      .copy(this.patrolTarget)
      .sub(this.object3d.position);
    dir.y = 0;

    if (dir.length() < 0.5) {
      if (this.config.type === 'faceling') {
        this.wanderTimer += delta;
        if (this.wanderTimer > 2) {
          this.patrolTarget = this._randomPatrolPoint();
          this.wanderTimer = 0;
        }
        return;
      }
      this.patrolTarget = this._randomPatrolPoint();
      return;
    }

    dir.normalize();
    const speed = this.config.type === 'faceling'
      ? this.config.speed * (0.5 + Math.sin(Date.now() * 0.001) * 0.3)
      : this.config.speed * 0.5;

    this.object3d.position.x += dir.x * speed * delta;
    this.object3d.position.z += dir.z * speed * delta;
    this.object3d.lookAt(
      this.object3d.position.x + dir.x,
      this.object3d.position.y,
      this.object3d.position.z + dir.z
    );
  }

  _chase(delta, player) {
    if (!this.target) return;
    const dir = new THREE.Vector3()
      .copy(this.target)
      .sub(this.object3d.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 0.5) {
      dir.normalize();
      const speed = this.config.type === 'faceling'
        ? this.config.speed * 1.5
        : this.config.speed;
      this.object3d.position.x += dir.x * speed * delta;
      this.object3d.position.z += dir.z * speed * delta;
      this.object3d.lookAt(
        this.object3d.position.x + dir.x,
        this.object3d.position.y,
        this.object3d.position.z + dir.z
      );
    }
  }

  _randomPatrolPoint() {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.patrolRadius;
    return new THREE.Vector3(
      this.position.x + Math.cos(angle) * radius,
      0,
      this.position.z + Math.sin(angle) * radius,
    );
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      if (this.object3d.parent) {
        this.object3d.parent.remove(this.object3d);
      }
    }
  }

  dispose() {
    if (this.object3d.parent) {
      this.object3d.parent.remove(this.object3d);
    }
    this.object3d.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
}
