export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: {}, locked: false };
    this.touch = { active: false, startX: 0, startY: 0, x: 0, y: 0, dx: 0, dy: 0 };
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.mobileStickX = 0;
    this.mobileStickY = 0;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this._bind();
  }

  _bind() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('touchstart', this.onTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  onMouseMove(e) {
    if (this.locked) {
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    }
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  onMouseDown(e) {
    this.mouse.buttons[e.button] = true;
  }

  onMouseUp(e) {
    this.mouse.buttons[e.button] = false;
  }

  onPointerLockChange() {
    this.locked = document.pointerLockElement === this.canvas;
  }

  onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.touch.active = true;
      this.touch.startX = t.clientX;
      this.touch.startY = t.clientY;
      this.touch.x = t.clientX;
      this.touch.y = t.clientY;
      this.touch.dx = 0;
      this.touch.dy = 0;
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.touch.dx = t.clientX - this.touch.x;
      this.touch.dy = t.clientY - this.touch.y;
      this.touch.x = t.clientX;
      this.touch.y = t.clientY;
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
    this.touch.active = false;
    this.touch.dx = 0;
    this.touch.dy = 0;
  }

  requestPointerLock() {
    this.canvas.requestPointerLock();
  }

  exitPointerLock() {
    document.exitPointerLock();
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  consumeMouseDelta() {
    const dx = this.mouse.dx;
    const dy = this.mouse.dy;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  consumeTouchDelta() {
    const dx = this.touch.dx;
    const dy = this.touch.dy;
    this.touch.dx = 0;
    this.touch.dy = 0;
    return { dx, dy };
  }

  isPointerLocked() {
    return this.locked;
  }

  isMobileDevice() {
    return this.isMobile;
  }
}
