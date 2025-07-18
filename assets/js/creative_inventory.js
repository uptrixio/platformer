import { blockTypes } from './world_config.js';
import { isMobile } from './utils.js';

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
        
        if (isMobile()) {
            this.grid.addEventListener('click', (e) => {
                const item = e.target.closest('.inventory-item');
                if (item) {
                    const blockType = item.dataset.blockType;
                    if (blockType) {
                        this.hotbar.setItem(this.hotbar.selectedSlot, blockType);
                        this.toggle();
                    }
                }
            });
        } else {
            this.grid.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('inventory-item')) {
                    e.dataTransfer.setData('text/plain', e.target.dataset.blockType);
                }
            });
        }
    }

    populateGrid() {
        this.grid.innerHTML = '';
        for (const type in blockTypes) {
            if(type === 'air') continue;
            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.textContent = blockTypes[type].name;
            item.dataset.blockType = type;
            item.draggable = !isMobile();
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
            if (this.game.isGameActive && !isMobile()) {
                this.game.controls.lock();
            } else if(this.game.isGameActive && isMobile()) {
                this.game.isGameActive = true; 
            }
        }
    }
}