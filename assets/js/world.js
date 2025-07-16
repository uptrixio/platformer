import * as THREE from './three.module.js';
import { Chunk } from './chunk.js';
import { worldSettings } from './world_config.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.worldBlocks = new Map();

        this.chunkGenerationQueue = [];
        this.maxChunksToGeneratePerFrame = 1;
        this.gameInstance = null;
        this.onProgress = null;
    }
    
    dispose() {
        for (const chunk of this.chunks.values()) {
            chunk.dispose();
        }
        this.chunks.clear();
        this.worldBlocks.clear();
        this.chunkGenerationQueue = [];
    }

    setGameInstance(gameInstance) {
        this.gameInstance = gameInstance;
    }

    setBlock(x, y, z, type) {
        const key = `${Math.floor(x)}_${Math.floor(y)}_${Math.floor(z)}`;
        this.worldBlocks.set(key, type);
    }

    getBlock(x, y, z) {
        const key = `${Math.floor(x)}_${Math.floor(y)}_${Math.floor(z)}`;
        return this.worldBlocks.get(key);
    }

    isSolidBlock(x, y, z) {
        const type = this.getBlock(x, y, z);
        return type && type !== 'water' && type !== 'air' && type !== 'leaves';
    }

    getChunk(chunkX, chunkZ) {
        const key = `${chunkX}_${chunkZ}`;
        return this.chunks.get(key);
    }

    addChunk(chunkX, chunkZ) {
        const key = `${chunkX}_${chunkZ}`;
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(this, chunkX, chunkZ);
            this.chunks.set(key, chunk);
            this.chunkGenerationQueue.push(chunk);
        }
    }

    removeChunk(chunkX, chunkZ) {
        const key = `${chunkX}_${chunkZ}`;
        const chunk = this.chunks.get(key);
        if (chunk) {
            chunk.dispose();
            this.chunks.delete(key);
            this.chunkGenerationQueue = this.chunkGenerationQueue.filter(qChunk => qChunk !== chunk);
        }
    }

    updateChunks(centerX, centerZ) {
        const renderDist = this.gameInstance.isMenu ? 4 : worldSettings.renderDistance;
        const currentChunkX = Math.floor(centerX / worldSettings.chunkSize);
        const currentChunkZ = Math.floor(centerZ / worldSettings.chunkSize);

        const chunksToLoad = new Set();
        for (let x = currentChunkX - renderDist; x <= currentChunkX + renderDist; x++) {
            for (let z = currentChunkZ - renderDist; z <= currentChunkZ + renderDist; z++) {
                chunksToLoad.add(`${x}_${z}`);
                if (!this.getChunk(x, z)) {
                    this.addChunk(x, z);
                }
            }
        }

        for (const key of this.chunks.keys()) {
            if (!chunksToLoad.has(key)) {
                const [cx, cz] = key.split('_').map(Number);
                this.removeChunk(cx, cz);
            }
        }

        this.processChunkGenerationQueue();
    }

    processChunkGenerationQueue() {
        if (!this.gameInstance) return;
        
        let refX, refZ;
        if (this.gameInstance.isGameActive && this.gameInstance.player && this.gameInstance.player.mesh) {
            refX = this.gameInstance.player.mesh.position.x;
            refZ = this.gameInstance.player.mesh.position.z;
        } else if (this.gameInstance.camera && this.gameInstance.camera.position) {
            refX = this.gameInstance.camera.position.x;
            refZ = this.gameInstance.camera.position.z;
        } else {
            return;
        }
        
        const refChunkX = Math.floor(refX / worldSettings.chunkSize);
        const refChunkZ = Math.floor(refZ / worldSettings.chunkSize);

        this.chunkGenerationQueue.sort((a, b) => {
            const distA = Math.hypot(a.chunkX - refChunkX, a.chunkZ - refChunkZ);
            const distB = Math.hypot(b.chunkX - refChunkX, b.chunkZ - refChunkZ);
            return distA - distB;
        });

        let generatedCount = 0;
        while (this.chunkGenerationQueue.length > 0 && generatedCount < this.maxChunksToGeneratePerFrame) {
            const chunk = this.chunkGenerationQueue.shift();
            if (chunk && !chunk.isGenerated) {
                chunk.generateGeometry();
                if (chunk.mesh) {
                    this.scene.add(chunk.mesh);
                }
                if (this.onProgress) {
                    this.onProgress();
                }
                generatedCount++;
            }
        }
    }
}