import * as THREE from 'three';
import { worldSettings, getHeightAt } from './world_config.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;

        this.height = 1.8;
        this.width = 0.6;
        this.depth = 0.6;
        
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        
        this.speed = 5;
        this.jumpStrength = 8;
        this.gravity = -25;
        
        this.onGround = false;
        this.isFlying = false; // Игрок всегда начинает на земле, даже в креативе
        this.isSwimming = false;
        
        this.nickname = localStorage.getItem('nickname') || 'Player';
        this.model = this.createPlayerModel();
        this.updateNickname(this.nickname);
        this.scene.add(this.model);
        this.model.visible = false; 

        this.hands = new THREE.Group();
        this.camera.add(this.hands);
        this.heldItemMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25));
        this.heldItemMesh.position.set(0.3, -0.2, -0.4);
        this.hands.add(this.heldItemMesh);
        this.updateHeldItem(null);
    }
    
    createPlayerModel() {
        const group = new THREE.Group();
        const head = new THREE.Mesh( new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xCC8866 }));
        head.position.y = 0.65;
        
        const torso = new THREE.Mesh( new THREE.BoxGeometry(0.7, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x4488CC }));
        
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: 0xCC8866 }));
        leftArm.position.set(-0.45, 0, 0);
        
        const rightArm = leftArm.clone();
        rightArm.position.x = 0.45;

        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), new THREE.MeshStandardMaterial({ color: 0x334488 }));
        leftLeg.position.set(-0.2, -0.7, 0);

        const rightLeg = leftLeg.clone();
        rightLeg.position.x = 0.2;
        
        group.add(head, torso, leftArm, rightArm, leftLeg, rightLeg);
        return group;
    }
    
    updateHeldItem(blockType) {
        if(blockType && this.game.world.blockMaterials[blockType]) {
            this.heldItemMesh.material = this.game.world.blockMaterials[blockType];
            this.heldItemMesh.visible = true;
        } else {
            this.heldItemMesh.visible = false;
        }
    }


    updateNickname(text) {
        if(this.nicknameLabel) this.model.remove(this.nicknameLabel);
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = 32;
        context.font = `Bold ${fontSize}px Arial`;
        const textMetrics = context.measureText(text);
        canvas.width = textMetrics.width;
        canvas.height = fontSize;
        context.font = `Bold ${fontSize}px Arial`;
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.nicknameLabel = new THREE.Sprite(material);
        this.nicknameLabel.scale.set(canvas.width / 100, canvas.height / 100, 1.0);
        this.nicknameLabel.position.y = 1.2;
        
        this.model.add(this.nicknameLabel);
    }
    
    findSafeSpawn() {
        for (let r = 0; r < 500; r += 5) {
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                const x = Math.round(Math.cos(a) * r);
                const z = Math.round(Math.sin(a) * r);
                const y = Math.floor(getHeightAt(x, z));
                
                if (y > worldSettings.seaLevel) {
                    return new THREE.Vector3(x + 0.5, y + this.height, z + 0.5);
                }
            }
        }
        return new THREE.Vector3(0, worldSettings.chunkHeight, 0);
    }

    spawn() {
        if (!this.game.worldData.generated) {
            const spawnPoint = this.findSafeSpawn();
            this.position.copy(spawnPoint);
        }
        this.velocity.set(0, 0, 0);
        if (this.game.controls) {
            this.game.controls.updateCameraPosition();
        }
    }
    
    update(delta) {
        if (this.isFlying) {
            this.handleFlying(delta);
        } else {
            this.handleWalking(delta);
        }
        
        const subSteps = 5;
        const subDelta = delta / subSteps;
        for (let i = 0; i < subSteps; i++) {
            this.position.add(this.velocity.clone().multiplyScalar(subDelta));
            this.handleCollisions();
        }
        
        this.game.controls.updateCameraPosition();
        
        this.model.position.copy(this.position).sub(new THREE.Vector3(0, this.height/2, 0));
        this.model.rotation.y = this.game.controls.phi + Math.PI;
        this.model.visible = this.game.controls.thirdPersonView;
        this.hands.visible = !this.game.controls.thirdPersonView;
    }
    
    handleWalking(delta) {
        const moveDirection = this.game.controls.getMoveDirection();
        const speed = this.isSwimming ? this.speed * 0.6 : this.speed;
        
        this.velocity.x = moveDirection.x * speed;
        this.velocity.z = moveDirection.z * speed;
        
        if (this.isSwimming) {
            this.velocity.y *= 0.7; 
            this.velocity.y += this.gravity * 0.1 * delta;
            if (this.game.controls.keyboard['Space']) this.velocity.y = 3;
            if (this.game.controls.keyboard['ShiftLeft']) this.velocity.y = -3;
        } else {
            this.velocity.y += this.gravity * delta;
            if (this.onGround) {
                this.velocity.y = Math.max(0, this.velocity.y);
            }
        }
    }
    
    handleFlying(delta) {
        const moveDirection = this.game.controls.getMoveDirection(true);
        const flySpeed = 15;
        this.velocity.copy(moveDirection).multiplyScalar(flySpeed);
    }
    
    jump() {
        if (this.onGround || this.isSwimming) {
            this.velocity.y = this.jumpStrength;
        }
    }
    
    toggleFly() {
        if(this.game.worldData.gameMode !== 'creative') return;
        this.isFlying = !this.isFlying;
        if(this.isFlying) {
            this.velocity.y = 0;
        }
    }

    handleCollisions() {
        const world = this.game.world;
        const pos = this.position;
        const vel = this.velocity;
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            this.position, 
            new THREE.Vector3(this.width, this.height, this.depth)
        );
        
        this.onGround = false;
        
        const minX = Math.floor(playerBox.min.x);
        const maxX = Math.ceil(playerBox.max.x);
        const minY = Math.floor(playerBox.min.y);
        const maxY = Math.ceil(playerBox.max.y);
        const minZ = Math.floor(playerBox.min.z);
        const maxZ = Math.ceil(playerBox.max.z);

        const headY = Math.floor(pos.y + this.height * 0.4);
        const headBlock = world.getBlock(Math.floor(pos.x), headY, Math.floor(pos.z));
        this.isSwimming = headBlock === 'water';
        
        for (let x = minX; x < maxX; x++) {
            for (let y = minY; y < maxY; y++) {
                for (let z = minZ; z < maxZ; z++) {
                    const block = world.getBlock(x, y, z);
                    
                    if (block && block !== 'air' && block !== 'leaves' && block !== 'water') {
                        const blockBox = new THREE.Box3(
                            new THREE.Vector3(x, y, z), 
                            new THREE.Vector3(x + 1, y + 1, z + 1)
                        );
                        
                        if (playerBox.intersectsBox(blockBox)) {
                           const overlap = new THREE.Vector3();
                           const centerPlayer = playerBox.getCenter(new THREE.Vector3());
                           const centerBlock = blockBox.getCenter(new THREE.Vector3());
                           
                           overlap.x = (playerBox.max.x - playerBox.min.x) / 2 + (blockBox.max.x - blockBox.min.x) / 2 - Math.abs(centerPlayer.x - centerBlock.x);
                           overlap.y = (playerBox.max.y - playerBox.min.y) / 2 + (blockBox.max.y - blockBox.min.y) / 2 - Math.abs(centerPlayer.y - centerBlock.y);
                           overlap.z = (playerBox.max.z - playerBox.min.z) / 2 + (blockBox.max.z - blockBox.min.z) / 2 - Math.abs(centerPlayer.z - centerBlock.z);

                            if (overlap.x < overlap.y && overlap.x < overlap.z) {
                                pos.x += centerPlayer.x > centerBlock.x ? overlap.x : -overlap.x;
                                vel.x = 0;
                            } else if (overlap.y < overlap.x && overlap.y < overlap.z) {
                                if (vel.y < 0 && centerPlayer.y > centerBlock.y) this.onGround = true;
                                pos.y += centerPlayer.y > centerBlock.y ? overlap.y : -overlap.y;
                                vel.y = 0;
                            } else {
                                pos.z += centerPlayer.z > centerBlock.z ? overlap.z : -overlap.z;
                                vel.z = 0;
                            }
                        }
                    }
                }
            }
        }
    }
    
    saveState() {
        if (!this.game.controls) return;
        const state = {
            position: this.position.toArray(),
            rotation: [this.game.controls.phi, this.game.controls.theta]
        };
        const hotbarItems = this.game.hotbar.items;
        localStorage.setItem(`playerState_${this.game.worldData.name}`, JSON.stringify(state));
        localStorage.setItem(`hotbarState_${this.game.worldData.name}`, JSON.stringify(hotbarItems));
    }
    
    loadState() {
        const savedStateJSON = localStorage.getItem(`playerState_${this.game.worldData.name}`);
        if (savedStateJSON && this.game.worldData.generated) {
            const savedState = JSON.parse(savedStateJSON);
            this.position.fromArray(savedState.position);
            if (this.game.controls) {
                this.game.controls.phi = savedState.rotation[0];
                this.game.controls.theta = savedState.rotation[1];
                this.game.controls.updateCameraPosition();
            }
        }

        const savedHotbarJSON = localStorage.getItem(`hotbarState_${this.game.worldData.name}`);
        if (savedHotbarJSON && this.game.hotbar) {
            const savedHotbar = JSON.parse(savedHotbarJSON);
            savedHotbar.forEach((item, index) => {
                if (item) this.game.hotbar.setItem(index, item);
            });
        }
    }
}