import * as THREE from './three.module.js';
import { blockMaterials, getHeightAt, getCaveNoise, worldSettings, getBiome, noiseGen } from './world_config.js';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

export class Chunk {
    constructor(world, chunkX, chunkZ) {
        this.world = world;
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.blocks = new Map();
        this.mesh = null;
        this.isGenerated = false;

        this.position = new THREE.Vector3(
            chunkX * worldSettings.chunkSize,
            0,
            chunkZ * worldSettings.chunkSize
        );
    }

    setBlock(x, y, z, type) {
        const key = `${x}_${y}_${z}`;
        this.blocks.set(key, type);
    }

    getBlock(x, y, z) {
        const key = `${x}_${y}_${z}`;
        return this.blocks.get(key);
    }

    isSolidBlock(x, y, z) {
        const type = this.getBlock(x, y, z);
        return type && type !== 'water' && type !== 'air' && type !== 'leaves';
    }

    generateGeometry() {
        const blockTypeBuffers = {};
        for (const type in blockMaterials) {
            blockTypeBuffers[type] = { positions: [], normals: [], uvs: [], indices: [] };
        }

        const instancedMeshes = {};
        for (const type in blockMaterials) {
            if (type !== 'water') {
                instancedMeshes[type] = new THREE.InstancedMesh(boxGeometry, blockMaterials[type], worldSettings.chunkSize * worldSettings.chunkSize * (worldSettings.terrainHeightMultiplier + Math.abs(worldSettings.bedrockLevel)));
                instancedMeshes[type].count = 0;
            }
        }
        
        const dummy = new THREE.Object3D();

        for (let x = 0; x < worldSettings.chunkSize; x++) {
            for (let z = 0; z < worldSettings.chunkSize; z++) {
                const globalX = this.position.x + x;
                const globalZ = this.position.z + z;
                
                const height = getHeightAt(globalX, globalZ);
                const terrainTopY = Math.floor(height);
                const biome = getBiome(globalX, globalZ);

                for (let y = 128; y >= worldSettings.bedrockLevel; y--) {
                    const globalY = y;
                    let blockType = 'air';

                    if (y <= terrainTopY) {
                         if (y === terrainTopY && y >= worldSettings.seaLevel) {
                            blockType = biome === 'beach' ? 'sand' : 'grass';
                        } else if (y < terrainTopY && y > terrainTopY - 4) {
                            blockType = biome === 'beach' ? 'sand' : 'dirt';
                        } else {
                            blockType = 'stone';
                        }
                    } else if (y <= worldSettings.seaLevel) {
                        blockType = 'water';
                    }

                    const caveValue = getCaveNoise(globalX, globalY, globalZ);
                    if (caveValue < 0.3) {
                        blockType = 'air';
                    }

                    if (y <= worldSettings.bedrockLevel) {
                         blockType = 'stone';
                    }
                    
                    if (blockType !== 'air') {
                        this.setBlock(x, y, z, blockType);
                        this.world.setBlock(globalX, globalY, globalZ, blockType);

                        if (blockType === 'grass' && y > worldSettings.seaLevel) {
                            const treeSeed = (noiseGen(globalX * 0.1, globalZ * 0.1) + 1) / 2;
                            if (treeSeed > 0.96) {
                                const treeHeight = Math.floor(treeSeed * 4) + 4;
                                for (let h = 1; h < treeHeight; h++) {
                                    this.world.setBlock(globalX, globalY + h, globalZ, 'wood');
                                }
                                const radius = 2;
                                for (let ly = globalY + treeHeight - 2; ly < globalY + treeHeight + 1; ly++) {
                                    for (let lx = -radius; lx <= radius; lx++) {
                                        for (let lz = -radius; lz <= radius; lz++) {
                                            const dist = lx * lx + lz * lz;
                                            if (dist <= radius * radius) {
                                                if(this.world.getBlock(globalX + lx, ly, globalZ + lz) === undefined) {
                                                    this.world.setBlock(globalX + lx, ly, globalZ + lz, 'leaves');
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        for (let x = 0; x < worldSettings.chunkSize; x++) {
            for (let z = 0; z < worldSettings.chunkSize; z++) {
                for (let y = worldSettings.bedrockLevel; y < 128; y++) {
                    const type = this.getBlock(x, y, z);
                    if (type && type !== 'air') {
                        const globalX = this.position.x + x;
                        const globalY = y;
                        const globalZ = this.position.z + z;
                        
                        const isNeighborSolid = (dx, dy, dz) => {
                             const neighborType = this.world.getBlock(globalX + dx, globalY + dy, globalZ + dz);
                             if (!neighborType || neighborType === 'air') return false;
                             if (neighborType === 'water' && type !== 'water') return false;
                             if (neighborType === 'leaves' && type !== 'leaves') return false;
                             return true;
                        };

                        if (!isNeighborSolid(0, 1, 0) || !isNeighborSolid(0, -1, 0) || !isNeighborSolid(1, 0, 0) || !isNeighborSolid(-1, 0, 0) || !isNeighborSolid(0, 0, 1) || !isNeighborSolid(0, 0, -1)) {
                             if (type !== 'water') {
                                 dummy.position.set(x, y, z);
                                 dummy.updateMatrix();
                                 const mesh = instancedMeshes[type];
                                 if (mesh) {
                                     mesh.setMatrixAt(mesh.count, dummy.matrix);
                                     mesh.count++;
                                 }
                             } else {
                                this.addFace(x, y, z, 'front', type, blockTypeBuffers[type]);
                                this.addFace(x, y, z, 'back', type, blockTypeBuffers[type]);
                                this.addFace(x, y, z, 'top', type, blockTypeBuffers[type]);
                                this.addFace(x, y, z, 'bottom', type, blockTypeBuffers[type]);
                                this.addFace(x, y, z, 'left', type, blockTypeBuffers[type]);
                                this.addFace(x, y, z, 'right', type, blockTypeBuffers[type]);
                             }
                        }
                    }
                }
            }
        }

        const chunkGroup = new THREE.Group();
        for (const type in instancedMeshes) {
            if (instancedMeshes[type].count > 0) {
                instancedMeshes[type].instanceMatrix.needsUpdate = true;
                chunkGroup.add(instancedMeshes[type]);
            }
        }
        
        for (const type in blockTypeBuffers) {
            if (type === 'water') {
                 const buffer = blockTypeBuffers[type];
                 if (buffer.positions.length > 0) {
                     const geometry = new THREE.BufferGeometry();
                     geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffer.positions, 3));
                     geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buffer.normals, 3));
                     geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer.indices), 1));
                     const mesh = new THREE.Mesh(geometry, blockMaterials[type]);
                     chunkGroup.add(mesh);
                 }
            }
        }
        
        this.mesh = chunkGroup;
        this.mesh.position.copy(this.position);
        this.isGenerated = true;
    }

    addFace(x, y, z, face, type, buffer) {
        const positionOffset = buffer.positions.length / 3;
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        switch (face) {
            case 'front':
                vertices.push(x-0.5,y-0.5,z+0.5, x+0.5,y-0.5,z+0.5, x-0.5,y+0.5,z+0.5, x+0.5,y+0.5,z+0.5);
                normals.push(0,0,1, 0,0,1, 0,0,1, 0,0,1);
                uvs.push(0,0, 1,0, 0,1, 1,1);
                indices.push(0,1,2, 1,3,2);
                break;
            case 'back':
                vertices.push(x+0.5,y-0.5,z-0.5, x-0.5,y-0.5,z-0.5, x+0.5,y+0.5,z-0.5, x-0.5,y+0.5,z-0.5);
                normals.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1);
                uvs.push(0,0, 1,0, 0,1, 1,1);
                indices.push(0,1,2, 1,3,2);
                break;
            case 'top':
                vertices.push(x-0.5,y+0.5,z+0.5, x+0.5,y+0.5,z+0.5, x-0.5,y+0.5,z-0.5, x+0.5,y+0.5,z-0.5);
                normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);
                uvs.push(0,0, 1,0, 0,1, 1,1);
                indices.push(0,1,2, 1,3,2);
                break;
            case 'bottom':
                vertices.push(x-0.5,y-0.5,z-0.5, x+0.5,y-0.5,z-0.5, x-0.5,y-0.5,z+0.5, x+0.5,y-0.5,z+0.5);
                normals.push(0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0);
                uvs.push(0,0, 1,0, 0,1, 1,1);
                indices.push(0,1,2, 1,3,2);
                break;
            case 'right':
                vertices.push(x+0.5,y-0.5,z+0.5, x+0.5,y-0.5,z-0.5, x+0.5,y+0.5,z+0.5, x+0.5,y+0.5,z-0.5);
                normals.push(1,0,0, 1,0,0, 1,0,0, 1,0,0);
                uvs.push(0,0, 1,0, 0,1, 1,1);
                indices.push(0,1,2, 1,3,2);
                break;
            case 'left':
                vertices.push(x-0.5,y-0.5,z-0.5, x-0.5,y-0.5,z+0.5, x-0.5,y+0.5,z-0.5, x-0.5,y+0.5,z+0.5);
                normals.push(-1,0,0, -1,0,0, -1,0,0, -1,0,0);
                uvs.push(0,0, 1,0, 0,1, 1,1);
                indices.push(0,1,2, 1,3,2);
                break;
        }

        buffer.positions.push(...vertices);
        buffer.normals.push(...normals);
        buffer.uvs.push(...uvs);
        for(let i = 0; i < indices.length; i++) {
            buffer.indices.push(indices[i] + positionOffset);
        }
    }

    dispose() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            this.mesh.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if(object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.mesh = null;
        }
        this.blocks.clear();
        this.isGenerated = false;
    }
}