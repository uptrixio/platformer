import * as THREE from 'three';
import { Chunk } from './chunk.js';
import { setWorldSeed, worldSettings, blockMaterials } from './world_config.js';

export class World {
    constructor(game, renderDistance) {
        this.game = game;
        this.scene = game.scene;
        this.seed = game.worldData.seed;
        this.blockMaterials = blockMaterials;
        setWorldSeed(this.seed);

        this.chunks = new Map();
        this.chunkGenerationQueue = [];
        this.maxChunksPerFrame = 2;
        
        this.setRenderDistance(renderDistance);
        
        this.clock = new THREE.Clock();
        this.totalInitialChunks = 0;
        this.initialChunksGeneratedCount = 0;
        this.initialGenerationDone = false;
        
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 6;
        const highlightGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
        this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        this.scene.add(this.highlightMesh);
        this.highlightMesh.visible = false;

        this.onInitialChunksGenerated = () => {};
        this.onProgress = () => {};
    }
    
    setRenderDistance(distance) {
        worldSettings.renderDistance = distance;
        const R = worldSettings.renderDistance;
        this.totalInitialChunks = Math.pow(R * 2 + 1, 2);
    }

    startInitialGeneration(centerPosition) {
        const R = worldSettings.renderDistance;
        const currentChunkX = Math.floor(centerPosition.x / worldSettings.chunkSize);
        const currentChunkZ = Math.floor(centerPosition.z / worldSettings.chunkSize);

        for (let x = currentChunkX - R; x <= currentChunkX + R; x++) {
            for (let z = currentChunkZ - R; z <= currentChunkZ + R; z++) {
                this.addChunk(x, z);
            }
        }
    }
    
    update(centerPosition) {
        if (this.initialGenerationDone) {
            const R = worldSettings.renderDistance;
            const currentChunkX = Math.floor(centerPosition.x / worldSettings.chunkSize);
            const currentChunkZ = Math.floor(centerPosition.z / worldSettings.chunkSize);

            const chunksToLoad = new Set();
            for (let x = currentChunkX - R; x <= currentChunkX + R; x++) {
                for (let z = currentChunkZ - R; z <= currentChunkZ + R; z++) {
                    const key = `${x}_${z}`;
                    chunksToLoad.add(key);
                    if (!this.chunks.has(key)) {
                        this.addChunk(x, z);
                    }
                }
            }

            for (const key of this.chunks.keys()) {
                if (!chunksToLoad.has(key)) {
                    this.removeChunkByKey(key);
                }
            }
        }
        
        this.processChunkGenerationQueue(centerPosition);
        
        if (this.game.controls && (this.game.isGameActive || this.game.controls.thirdPersonView)) {
            this.updateHighlight();
        } else {
            this.highlightMesh.visible = false;
        }
    }
    
    processChunkGenerationQueue(center) {
        this.chunkGenerationQueue.sort((a, b) => {
            const distA = a.position.distanceToSquared(center);
            const distB = b.position.distanceToSquared(center);
            return distA - distB;
        });

        for (let i = 0; i < this.maxChunksPerFrame; i++) {
            if (this.chunkGenerationQueue.length > 0) {
                const chunk = this.chunkGenerationQueue.shift();
                if (chunk && !chunk.isGenerated) {
                    chunk.generate();
                    this.scene.add(chunk.mesh);

                    if(!this.initialGenerationDone) {
                        this.initialChunksGeneratedCount++;
                        const progress = this.initialChunksGeneratedCount / this.totalInitialChunks;
                        this.onProgress(progress > 1 ? 1 : progress);
                        if(this.initialChunksGeneratedCount >= this.totalInitialChunks) {
                            this.initialGenerationDone = true;
                            if (this.onInitialChunksGenerated) {
                                this.onInitialChunksGenerated();
                            }
                        }
                    }
                }
            } else {
                break;
            }
        }
    }

    addChunk(chunkX, chunkZ) {
        const key = `${chunkX}_${chunkZ}`;
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(this, chunkX, chunkZ);
            this.chunks.set(key, chunk);
            this.chunkGenerationQueue.push(chunk);
        }
    }

    removeChunkByKey(key) {
        const chunk = this.chunks.get(key);
        if (chunk) {
            this.saveChunk(chunk);
            chunk.dispose();
            this.chunks.delete(key);
        }
        if (chunk) {
            const indexInQueue = this.chunkGenerationQueue.findIndex(c => c.chunkX === chunk.chunkX && c.chunkZ === chunk.chunkZ);
            if (indexInQueue > -1) {
                this.chunkGenerationQueue.splice(indexInQueue, 1);
            }
        }
    }
    
    getChunk(x, z) {
        const chunkX = Math.floor(x / worldSettings.chunkSize);
        const chunkZ = Math.floor(z / worldSettings.chunkSize);
        return this.chunks.get(`${chunkX}_${chunkZ}`);
    }

    getBlock(x, y, z) {
        const chunk = this.getChunk(x, z);
        if (chunk && chunk.isGenerated) {
            const localX = ((x % worldSettings.chunkSize) + worldSettings.chunkSize) % worldSettings.chunkSize;
            const localY = y;
            const localZ = ((z % worldSettings.chunkSize) + worldSettings.chunkSize) % worldSettings.chunkSize;
            return chunk.getBlock(localX, localY, localZ);
        }
        return null;
    }

    setBlock(x, y, z, type) {
        const chunk = this.getChunk(x,z);
        if (chunk) {
            const localX = ((x % worldSettings.chunkSize) + worldSettings.chunkSize) % worldSettings.chunkSize;
            const localY = y;
            const localZ = ((z % worldSettings.chunkSize) + worldSettings.chunkSize) % worldSettings.chunkSize;
            chunk.setBlock(localX, localY, localZ, type);
            chunk.regenerate();
            
            const adjacentChunksToUpdate = new Set();
            if (localX === 0) adjacentChunksToUpdate.add(this.getChunk(x - 1, z));
            if (localX === worldSettings.chunkSize - 1) adjacentChunksToUpdate.add(this.getChunk(x + 1, z));
            if (localZ === 0) adjacentChunksToUpdate.add(this.getChunk(x, z - 1));
            if (localZ === worldSettings.chunkSize - 1) adjacentChunksToUpdate.add(this.getChunk(x, z + 1));
            
            adjacentChunksToUpdate.forEach(adjChunk => {
                if(adjChunk) adjChunk.regenerate();
            });
        }
    }

    handleBlockInteraction(camera, isPlacement, activeItem) {
        const intersects = this.getIntersectedBlock(camera);

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const position = new THREE.Vector3().copy(intersection.point);
            
            if (isPlacement) {
                if (activeItem) {
                    position.add(intersection.face.normal.multiplyScalar(0.5));
                    this.setBlock(Math.floor(position.x), Math.floor(position.y), Math.floor(position.z), activeItem);
                }
            } else {
                position.sub(intersection.face.normal.multiplyScalar(0.5));
                this.setBlock(Math.floor(position.x), Math.floor(position.y), Math.floor(position.z), 'air');
            }
        }
    }
    
    getIntersectedBlock(camera) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        
        const player = this.game.player;
        const chunkMeshes = [];

        for(let x = -1; x <= 1; x++){
            for(let z = -1; z <= 1; z++){
                const chunk = this.getChunk(player.position.x + x * worldSettings.chunkSize, player.position.z + z * worldSettings.chunkSize);
                if(chunk && chunk.mesh){
                    chunkMeshes.push(...chunk.mesh.children);
                }
            }
        }

        return this.raycaster.intersectObjects(chunkMeshes);
    }
    
    updateHighlight() {
        const intersects = this.getIntersectedBlock(this.game.camera);
    
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const position = new THREE.Vector3().copy(intersection.point).sub(intersection.face.normal.multiplyScalar(0.5));
            this.highlightMesh.position.set(Math.floor(position.x) + 0.5, Math.floor(position.y) + 0.5, Math.floor(position.z) + 0.5);
            this.highlightMesh.visible = true;
        } else {
            this.highlightMesh.visible = false;
        }
    }

    saveChunk(chunk) {
        if (chunk.isModified) {
            const key = `chunk_${this.game.worldData.name}_${chunk.chunkX}_${chunk.chunkZ}`;
            const dataToSave = JSON.stringify(Array.from(chunk.blocks));
            localStorage.setItem(key, dataToSave);
            chunk.isModified = false;
        }
    }

    saveWorldData() {
        this.chunks.forEach(chunk => {
            this.saveChunk(chunk);
        });
    }
    
    dispose() {
        this.saveWorldData();
        for (const chunk of this.chunks.values()) {
            chunk.dispose();
        }
        this.chunks.clear();
        this.scene.remove(this.highlightMesh);
    }
}