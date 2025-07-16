import { t } from './localization.js';

export class WorldManager {
    constructor() {
        this.worlds = this.loadWorldsFromStorage();
        this.worldListElement = document.getElementById('worldList');
    }

    loadWorldsFromStorage() {
        const worldsJson = localStorage.getItem('platformerWorlds');
        return worldsJson ? JSON.parse(worldsJson) : {};
    }

    saveWorldsToStorage() {
        localStorage.setItem('platformerWorlds', JSON.stringify(this.worlds));
    }

    createWorld(name, gameMode = 'survival') {
        if (this.worlds[name]) {
            alert('World with this name already exists.');
            return;
        }
        const seed = Math.random().toString(36).substring(7);
        this.worlds[name] = { name, seed, gameMode, createdAt: new Date().toISOString(), generated: false };
        this.saveWorldsToStorage();
    }

    deleteWorld(name) {
        if (this.worlds[name]) {
            delete this.worlds[name];
            localStorage.removeItem(`world_${name}_chunks`);
            this.saveWorldsToStorage();
        }
    }

    getWorld(name) {
        return this.worlds[name];
    }
    
    isWorldGenerated(name) {
        return this.worlds[name] && this.worlds[name].generated;
    }

    setWorldAsGenerated(name) {
        if (this.worlds[name]) {
            this.worlds[name].generated = true;
            this.saveWorldsToStorage();
        }
    }

    getAllWorlds() {
        return Object.values(this.worlds).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderWorldList() {
        this.worldListElement.innerHTML = '';
        const allWorlds = this.getAllWorlds();
        if (allWorlds.length === 0) {
            this.worldListElement.innerHTML = `<li>${t('No worlds yet...')}</li>`;
            return;
        }

        allWorlds.forEach(world => {
            const li = document.createElement('li');
            li.className = 'world-list-item';
            li.dataset.world = world.name;

            const gameModeText = world.gameMode === 'creative' ? t('Creative') : t('Survival');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${world.name} (${gameModeText})`;
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-world-button';
            deleteButton.textContent = t('Delete');
            deleteButton.dataset.world = world.name;
            
            li.appendChild(nameSpan);
            li.appendChild(deleteButton);
            this.worldListElement.appendChild(li);
        });
    }
}