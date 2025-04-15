import * as THREE from 'three';
import {scene} from './app.js';
import {getModel} from './resources.js';
import {capitalize} from './utils.js';

export default class Piece extends THREE.Object3D {
    constructor(type, color, file, rank) {
        super();
        this.type = type;   // 'pawn', 'king', etc.
        this.color = color; // 'white' or 'black'
        this.setPosition(file, rank);

        this.initModel();

        if (color === 'black') this.rotation.y = Math.PI;
        this.setWorldPosition();
        scene.add(this);
    }

    initModel() {
        this.object = getModel(`${this.type}${capitalize(this.color)}`).scene;
        this.object.scale.set(17, 17, 17);
        this.add(this.object);
    }

    getPosition() {
        return { file: this.file, rank: this.rank };
    }

    setPosition(file, rank) {
        this.file = file;
        this.rank = rank;
    }

    setWorldPosition() {
        const worldX = -3.5 + this.file;
        const worldZ = -3.5 + this.rank;
        this.position.set(worldX, 0, worldZ);
    }

    raycast(raycaster, intersects) {
        this.traverse(child => {
            if (!child.isMesh) return;

            const childIntersects = [];
            child.raycast(raycaster, childIntersects);

            for (const intersect of childIntersects) {
                intersect.object = this;
                intersects.push(intersect);
            }
        });
    }
}