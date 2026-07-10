export class HUD {
  constructor() {
    this.healthFill = document.getElementById('health-fill');
    this.staminaFill = document.getElementById('stamina-fill');
    this.interactPrompt = document.getElementById('interact-prompt');
    this.inventoryPanel = document.getElementById('inventory-panel');
    this.inventoryGrid = document.getElementById('inventory-grid');
    this.inventoryInfo = document.getElementById('inventory-info');
    this.invEquipSlots = document.querySelectorAll('.equip-slot');
    this.controlsHint = document.getElementById('controls-hint');
    this.crosshair = document.getElementById('crosshair');
    this.mobileControls = document.getElementById('mobile-controls');
  }

  update(player) {
    const hp = Math.round(player.health / player.maxHealth * 100);
    const sp = Math.round(player.stamina / player.maxStamina * 100);
    this.healthFill.style.width = `${hp}%`;
    this.staminaFill.style.width = `${sp}%`;
  }

  showInteractPrompt(text) {
    this.interactPrompt.textContent = text;
    this.interactPrompt.style.display = 'block';
  }

  hideInteractPrompt() {
    this.interactPrompt.style.display = 'none';
  }

  showInventory(inventory, equipment) {
    this.inventoryPanel.classList.remove('hidden');
    this.inventoryGrid.innerHTML = '';
    this.inventoryInfo.textContent = '▸ CLICK TO USE';

    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      if (inventory[i]) {
        const icon = document.createElement('span');
        icon.className = 'inv-icon';
        icon.textContent = inventory[i].icon || '?';
        const name = document.createElement('span');
        name.className = 'inv-name';
        name.textContent = inventory[i].name;
        if (inventory[i].quantity > 1) {
          name.textContent += ` ×${inventory[i].quantity}`;
        }
        slot.appendChild(icon);
        slot.appendChild(name);
        slot.dataset.index = i;
        slot.addEventListener('click', () => {
          window.__useItem && window.__useItem(i);
        });
      } else {
        const num = document.createElement('span');
        num.className = 'inv-idx';
        num.textContent = String(i + 1);
        slot.appendChild(num);
      }
      this.inventoryGrid.appendChild(slot);
    }

    if (equipment) {
      for (const es of this.invEquipSlots) {
        const slot = es.dataset.slot;
        const item = equipment[slot];
        const icon = es.querySelector('.equip-icon');
        const name = es.querySelector('.equip-name');
        if (item) {
          icon.textContent = item.icon || '◆';
          name.textContent = item.name;
          es.dataset.filled = 'true';
        } else {
          name.textContent = '—';
          delete es.dataset.filled;
        }
      }
    }
  }

  hideInventory() {
    this.inventoryPanel.classList.add('hidden');
  }

  showMobileControls() {
    this.mobileControls.classList.remove('hidden');
  }

  hideMobileControls() {
    this.mobileControls.classList.add('hidden');
  }

  showControlsHint() {
    if (this.controlsHint) this.controlsHint.classList.remove('hidden');
  }

  hideControlsHint() {
    if (this.controlsHint) this.controlsHint.classList.add('hidden');
  }
}
