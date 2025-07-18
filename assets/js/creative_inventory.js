import { blockTypes } from './world_config.js';

export class CreativeInventory {
    constructor(game) {
        this.game = game;
        this.hotbar = game.hotbar;
        this.menu = document.getElementById('creative-inventory-menu');
        this.grid = document.getElementById('creative-inventory-grid');
        this.searchInput = document.getElementById('inventory-search');
        this.isOpen = false;

        this.init();
    }

    init() {
        this.populateGrid();
        this.searchInput.addEventListener('input', () => this.filterBlocks());
        
        this.grid.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('inventory-item')) {
                e.dataTransfer.setData('text/plain', e.target.dataset.blockType);
            }
        });
    }

    populateGrid() {
        this.grid.innerHTML = '';
        for (const type in blockTypes) {
            if(type === 'air') continue;
            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.textContent = blockTypes[type].name;
            item.dataset.blockType = type;
            item.draggable = true;
            this.grid.appendChild(item);
        }
    }

    filterBlocks() {
        const query = this.searchInput.value.toLowerCase();
        this.grid.querySelectorAll('.inventory-item').forEach(item => {
            const name = item.textContent.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.menu.style.display = this.isOpen ? 'flex' : 'none';
        
        if (this.isOpen) {
            this.game.controls.unlock();
        } else {
            this.game.controls.lock();
        }
    }
}