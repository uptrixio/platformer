import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { PerlinNoise } from './utils.js';

export let noiseGen;
let detailNoiseGen;
let caveNoiseGen;

export function setWorldSeed(seed) {
    noiseGen = createNoise2D(seed);
    detailNoiseGen = createNoise2D(seed + '_details');
    caveNoiseGen = new PerlinNoise(seed + '_caves');
}

export const blockTypes = {
    air: { name: 'Air' },
    grass: { color: 0x559020, name: 'Grass' },
    dirt: { color: 0x8B4513, name: 'Dirt' },
    stone: { color: 0x808080, name: 'Stone' },
    sand: { color: 0xF4A460, name: 'Sand' },
    water: {
        color: 0x4682B4,
        transparent: true,
        opacity: 0.7,
        name: 'Water'
    },
    wood: { color: 0x66402D, name: 'Wood' },
    leaves: { color: 0x228B22, transparent: true, opacity: 0.9, name: 'Leaves' },
    gold_block: { color: 0xFFD700, name: 'Gold Block' },
    diamond_block: { color: 0xB9F2FF, name: 'Diamond Block' },
    lapis_block: { color: 0x000080, name: 'Lapis Block' },
    redstone_block: { color: 0xFF0000, name: 'Redstone Block' },
    coal_ore: { color: 0x36454F, name: 'Coal Ore'},
    iron_ore: { color: 0xA19D94, name: 'Iron Ore'}
};

export const blockMaterials = {};

for (const type in blockTypes) {
    const data = blockTypes[type];
    if (type === 'air') continue;
    if (type === 'water') {
        blockMaterials[type] = new THREE.MeshPhysicalMaterial({
            color: data.color,
            transparent: data.transparent,
            opacity: data.opacity,
            ior: 1.333,
            transmission: 1.0,
            roughness: 0.0,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
    } else {
        blockMaterials[type] = new THREE.MeshLambertMaterial({
            color: data.color,
            transparent: data.transparent || false,
            opacity: data.opacity || 1.0,
            side: data.transparent ? THREE.DoubleSide : THREE.FrontSide
        });
    }
}

export const worldSettings = {
    chunkSize: 16,
    chunkHeight: 128,
    renderDistance: 8,
    seaLevel: 52,
    bedrockLevel: 0,
    baseHeight: 60, 
    terrainHeight: 50
};

export function getHeightAt(x, z) {
    const baseFreq = 0.003;
    const detailFreq = 0.015;
    
    let baseHeight = noiseGen(x * baseFreq, z * baseFreq) * worldSettings.terrainHeight * 0.7;
    let detailHeight = detailNoiseGen(x * detailFreq, z * detailFreq) * worldSettings.terrainHeight * 0.3;

    let height = baseHeight + detailHeight + worldSettings.baseHeight;
    
    return height;
}

export function getBiome(x, z) {
    const value = (noiseGen(x * 0.001, z * 0.001) + 1) / 2;
    if (value > 0.55) return 'plains';
    return 'beach';
}

export function getCaveNoise(x, y, z) {
    const scale = 0.07;
    return (caveNoiseGen.noise(x * scale, y * scale, z * scale) + 1) / 2;
}