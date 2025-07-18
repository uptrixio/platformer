import { blockTypes } from './world_config.js';
import { t } from './localization.js';

export class Hotbar {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('hotbar-container');
        this.slots = [];
        this.selectedSlot = 0;
        this.items = new Array(5).fill(null);
        
        this.init();
    }

    init() {
        this.container.innerHTML = ''; 
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.index = i;
            this.container.appendChild(slot);
            this.slots.push(slot);

            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
    
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const blockType = e.dataTransfer.getData('text/plain');
                if (blockType && blockTypes[blockType]) {
                    this.setItem(i, blockType);
                }
            });
        }
        this.updateSelection();
        if (this.game.player) {
            this.game.player.updateHeldItem(this.getActiveItem());
        }
    }

    getActiveItem() {
        return this.items[this.selectedSlot];
    }
    
    changeSlot(direction) {
        this.selectedSlot = (this.selectedSlot + direction + 5) % 5;
        this.updateSelection();
    }

    selectSlot(index) {
        this.selectedSlot = index;
        this.updateSelection();
    }

    updateSelection() {
        this.slots.forEach((slot, i) => {
            slot.classList.toggle('active', i === this.selectedSlot);
        });
        if (this.game.player) {
            this.game.player.updateHeldItem(this.getActiveItem());
        }
    }

    setItem(index, blockType) {
        if (index < 0 || index >= 5) return;
        this.items[index] = blockType;
        
        const slot = this.slots[index];
        if (blockType && blockTypes[blockType]) {
            slot.textContent = t(blockTypes[blockType].name);
        } else {
            slot.textContent = '';
        }
        this.updateSelection();
    }

    updateAllSlots() {
        this.items.forEach((item, index) => {
            this.setItem(index, item);
        });
    }

    show() {
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.style.display = 'none';
    }
}