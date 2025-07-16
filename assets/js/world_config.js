import * as THREE from './three.module.js';
import { createNoise2D } from './simplex-noise.js';
import { PerlinNoise } from './utils.js';

export let noiseGen;
let waterNoiseGen, biomeNoiseGen;
let caveNoiseGen;

export function setWorldSeed(seed) {
    noiseGen = createNoise2D(seed);
    waterNoiseGen = createNoise2D(seed + '_water');
    caveNoiseGen = new PerlinNoise(seed + '_caves');
    biomeNoiseGen = createNoise2D(seed + '_biomes');
}

export const blockMaterials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x7CFC00 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x8B4513 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x808080 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xF4A460 }),
    water: new THREE.MeshPhysicalMaterial({
        color: 0x4682B4,
        transparent: true,
        opacity: 0.8,
        ior: 1.33,
        thickness: 0.5,
        roughness: 0.1,
        metalness: 0.0,
        envMapIntensity: 0.9,
        transmission: 1.0,
        clearcoat: 0.1,
        clearcoatRoughness: 0.1,
    }),
    wood: new THREE.MeshStandardMaterial({ color: 0x66402D }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x228B22, transparent: true, opacity: 0.9 }),
};

export const worldSettings = {
    chunkSize: 16,
    renderDistance: 8,
    terrainHeightMultiplier: 60,
    seaLevel: 5,
    bedrockLevel: -64,
    baseHeight: 10 // Новая переменная для поднятия уровня земли
};

export function getHeightAt(x, z) {
    let total = 0;
    let frequency = 0.005;
    let amplitude = 1;
    let maxAmplitude = 0;

    for (let i = 0; i < 6; i++) {
        total += noiseGen(x * frequency, z * frequency) * amplitude;
        maxAmplitude += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }

    let height = (total / maxAmplitude) * worldSettings.terrainHeightMultiplier;
    return height + worldSettings.baseHeight;
}

export function getBiome(x, z) {
    const value = (biomeNoiseGen(x * 0.002, z * 0.002) + 1) / 2;
    if (value > 0.6) return 'plains';
    return 'beach';
}

export function getWaterNoise(x, z) {
    const scale = 0.02;
    return (waterNoiseGen(x * scale, z * scale) + 1) / 2;
}

export function getCaveNoise(x, y, z) {
    const scale = 0.08;
    return (caveNoiseGen.noise(x * scale, y * scale, z * scale) + 1) / 2;
}