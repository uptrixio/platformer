import * as THREE from 'three';
import { mergeGeometries } from 'buffer-geometry-utils';
import { blockTypes, blockMaterials, worldSettings, getHeightAt, getCaveNoise, getBiome } from './world_config.js';

export class Chunk {
    constructor(world, chunkX, chunkZ) {
        this.world = world;
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.blocks = new Uint8Array(worldSettings.chunkSize * worldSettings.chunkHeight * worldSettings.chunkSize);
        this.mesh = new THREE.Group();
        this.isGenerated = false;
        this.isModified = false;

        this.position = new THREE.Vector3(
            chunkX * worldSettings.chunkSize,
            0,
            chunkZ * worldSettings.chunkSize
        );
        this.mesh.position.copy(this.position);
        
        const blockTypeValues = Object.keys(blockTypes);
        this.blockIdMap = {};
        blockTypeValues.forEach((type, index) => {
            this.blockIdMap[type] = index;
        });
        this.blockIdMap.air = 0;
        this.idBlockMap = blockTypeValues;
    }

    getBlockId(x, y, z) {
        if (this.isOutOfBounds(x, y, z)) return 0;
        const index = y * worldSettings.chunkSize * worldSettings.chunkSize + z * worldSettings.chunkSize + x;
        return this.blocks[index];
    }
    
    getBlock(x, y, z) {
        const blockId = this.getBlockId(x, y, z);
        return this.idBlockMap[blockId];
    }

    setBlockId(x, y, z, id) {
        if (this.isOutOfBounds(x, y, z)) return;
        const index = y * worldSettings.chunkSize * worldSettings.chunkSize + z * worldSettings.chunkSize + x;
        this.blocks[index] = id;
        this.isModified = true;
    }

    setBlock(x, y, z, type) {
        const id = this.blockIdMap[type];
        if (id !== undefined) {
            this.setBlockId(x, y, z, id);
        }
    }
    
    isOutOfBounds(x, y, z) {
        return x < 0 || x >= worldSettings.chunkSize ||
               y < 0 || y >= worldSettings.chunkHeight ||
               z < 0 || z >= worldSettings.chunkSize;
    }
    
    generate() {
        const chunkDataKey = `chunk_${this.world.game.worldData.name}_${this.chunkX}_${this.chunkZ}`;
        const savedChunkData = localStorage.getItem(chunkDataKey);

        if (savedChunkData) {
            this.blocks = new Uint8Array(JSON.parse(savedChunkData));
        } else {
            for (let x = 0; x < worldSettings.chunkSize; x++) {
                for (let z = 0; z < worldSettings.chunkSize; z++) {
                    const globalX = this.chunkX * worldSettings.chunkSize + x;
                    const globalZ = this.chunkZ * worldSettings.chunkSize + z;
                    
                    const height = getHeightAt(globalX, globalZ);
                    const terrainTopY = Math.floor(height);

                    for (let y = 0; y < worldSettings.chunkHeight; y++) {
                         let blockType = 'air';
                         if (y < terrainTopY) {
                            if (y > terrainTopY - 1) {
                                blockType = 'grass';
                            } else if (y > terrainTopY - 5) {
                                blockType = 'dirt';
                            } else {
                                blockType = 'stone';
                            }
                         } else if (y <= worldSettings.seaLevel && y > terrainTopY) {
                             blockType = 'water';
                         }
                         
                         if (getCaveNoise(globalX, y, globalZ) < 0.3) {
                            if (y < terrainTopY) {
                                blockType = 'air';
                            }
                         }

                         if (y <= worldSettings.bedrockLevel) {
                            blockType = 'stone';
                         }

                        this.setBlock(x, y, z, blockType);
                    }
                }
            }

            for (let x = 0; x < worldSettings.chunkSize; x++) {
                for (let z = 0; z < worldSettings.chunkSize; z++) {
                    const globalX = this.chunkX * worldSettings.chunkSize + x;
                    const globalZ = this.chunkZ * worldSettings.chunkSize + z;
                    const height = getHeightAt(globalX, globalZ);
                    const y = Math.floor(height);
                    
                    if (this.getBlock(x, y, z) === 'grass' && Math.random() < 0.01) {
                        this.generateTree(x, y + 1, z);
                    }
                }
            }
             this.isModified = false;
        }

        this.buildMesh();
        this.isGenerated = true;
    }
    
    generateTree(x, y, z) {
        const height = 4 + Math.floor(Math.random() * 3);
        for(let i = 0; i < height; i++) {
            this.setBlock(x, y + i, z, 'wood');
        }

        const radius = 2;
        for(let ry = -radius; ry <= radius; ry++) {
            for(let rx = -radius; rx <= radius; rx++) {
                for(let rz = -radius; rz <= radius; rz++) {
                    const d = Math.sqrt(rx*rx + ry*ry + rz*rz);
                    if(d <= radius) {
                        const existingBlock = this.getBlock(x + rx, y + height + ry, z + rz);
                        if(existingBlock === 'air') {
                            this.setBlock(x + rx, y + height + ry, z + rz, 'leaves');
                        }
                    }
                }
            }
        }
    }

    buildMesh() {
        this.clearMesh();
        
        const mergedGeometries = {};
        for(const type in blockMaterials) {
            mergedGeometries[type] = [];
        }

        const visited = new Uint8Array(this.blocks.length).fill(0);

        for (let y = 0; y < worldSettings.chunkHeight; y++) {
            for (let z = 0; z < worldSettings.chunkSize; z++) {
                for (let x = 0; x < worldSettings.chunkSize; x++) {
                    const index = y * worldSettings.chunkSize * worldSettings.chunkSize + z * worldSettings.chunkSize + x;
                    if (visited[index]) continue;
                    
                    const blockId = this.getBlockId(x, y, z);
                    const blockType = this.idBlockMap[blockId];
                    if (blockId === 0) continue;

                    const w = this.getDimension(x, y, z, 0, blockId);
                    const h = this.getDimension(x, y, z, 1, blockId, w);
                    const d = this.getDimension(x, y, z, 2, blockId, w, h);
                    
                    for(let i = 0; i < w; i++) {
                        for(let j = 0; j < h; j++) {
                            for(let k = 0; k < d; k++) {
                                const visitedIndex = (y+j) * worldSettings.chunkSize * worldSettings.chunkSize + (z+k) * worldSettings.chunkSize + (x+i);
                                visited[visitedIndex] = 1;
                            }
                        }
                    }

                    const dx = x + w / 2;
                    const dy = y + h / 2;
                    const dz = z + d / 2;

                    const geometry = new THREE.BoxGeometry(w, h, d);
                    geometry.translate(dx, dy, dz);
                    
                    if (mergedGeometries[blockType]) {
                        mergedGeometries[blockType].push(geometry);
                    }
                }
            }
        }
        
        for (const type in mergedGeometries) {
            if (mergedGeometries[type].length > 0) {
                const material = blockMaterials[type];
                const finalGeometry = mergedGeometries[type].length > 1 
                    ? mergeGeometries(mergedGeometries[type])
                    : mergedGeometries[type][0];
                    
                const mesh = new THREE.Mesh(finalGeometry, material);
                this.mesh.add(mesh);
            }
        }
    }
    
    getDimension(x, y, z, axis, blockId, w = -1, h = -1) {
        let length = 1;
        
        const dx = (axis === 0) ? 1 : 0;
        const dy = (axis === 1) ? 1 : 0;
        const dz = (axis === 2) ? 1 : 0;

        while (true) {
            const nextX = x + dx * length;
            const nextY = y + dy * length;
            const nextZ = z + dz * length;
            
            if (nextX >= worldSettings.chunkSize || nextY >= worldSettings.chunkHeight || nextZ >= worldSettings.chunkSize) break;
            
            let canMerge = true;
            if (axis === 1) {
                for (let i = 0; i < w; i++) {
                    if (this.getBlockId(x + i, nextY, z) !== blockId) canMerge = false;
                }
            } else if (axis === 2) {
                 for (let i = 0; i < w; i++) {
                    for (let j = 0; j < h; j++) {
                        if (this.getBlockId(x + i, y + j, nextZ) !== blockId) canMerge = false;
                    }
                }
            } else {
                 if (this.getBlockId(nextX, y, z) !== blockId) canMerge = false;
            }

            if (!canMerge) break;

            length++;
        }
        
        return length;
    }

    regenerate() {
        this.clearMesh();
        this.buildMesh();
    }
    
    clearMesh() {
        while (this.mesh.children.length > 0) {
            const child = this.mesh.children[0];
            this.mesh.remove(child);
            child.geometry.dispose();
        }
    }

    dispose() {
       this.clearMesh();
       if (this.mesh.parent) {
           this.mesh.parent.remove(this.mesh);
       }
    }
}