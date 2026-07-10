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
    };

    this.velocity = new THREE.Vector3();
    this.target = null;
    this.state = 'idle';
    this.health = this.config.type === 'duller' ? 999 : 100;
    this.alive = true;
    this.attackCooldown = 0;
    this.patrolTarget = this._randomPatrolPoint();
    this.wanderTimer = 0;

    this.object3d = this._createMesh();
    this.object3d.position.copy(position);
    scene.add(this.object3d);
  }

  _createMesh() {
    const group = new THREE.Group();

    if (this.config.type === 'hound') {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 0.5 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), bodyMat);
      body.position.y = 0.6; group.add(body);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), bodyMat);
      head.position.set(0, 0.8, -0.6); group.add(head);

      for (const sx of [-0.15, 0.15]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
        eye.position.set(sx, 0.9, -0.7); group.add(eye);
      }

      for (const lx of [-0.3, 0.3]) {
        for (const lz of [-0.4, 0.4]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 6), bodyMat);
          leg.position.set(lx, 0.2, lz); group.add(leg);
        }
      }
      group.scale.set(0.8, 0.8, 0.8);

    } else if (this.config.type === 'faceling') {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.8 });
      const clothesMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.9 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), clothesMat);
      body.position.y = 0.85; group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), skinMat);
      head.position.y = 1.4; group.add(head);

      // No face - just a smooth sphere

      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), clothesMat);
      legs.position.y = 0.3; group.add(legs);

      for (const sx of [-0.15, 0.15]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), skinMat);
        arm.position.set(sx, 0.8, 0); group.add(arm);
      }

      group.scale.set(0.9, 0.9, 0.9);

    } else if (this.config.type === 'duller') {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.9 });
      const clothesMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9, transparent: true, opacity: 0.8 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), clothesMat);
      body.position.y = 0.8; group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), skinMat);
      head.position.y = 1.3; group.add(head);

      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.25), clothesMat);
      legs.position.y = 0.3; group.add(legs);

      // Slight tilt for that "lost" look
      group.rotation.z = 0.03;
    }

    return group;
  }

  update(delta, player) {
    if (!this.alive) return;

    if (this.config.type === 'duller') {
      // Dullers don't move or react
      this.object3d.rotation.y += delta * 0.05;
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
        // Facelings move more slowly and hesitantly
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
