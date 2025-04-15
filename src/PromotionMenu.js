import * as THREE from 'three';
import {TextGeometry} from 'three/addons';
import {addUpdatable, camera, mouseScreen, outlinePass, scene} from './app.js';
import {getFont, getMaterial} from './resources.js';
import {capitalize, screenToWorld} from './utils.js';
import {Easing, Tween} from "./tween.js";

export default class PromotionMenu {
    constructor() {
        this.group = new THREE.Group();
        const options = ['queen', 'rook', 'bishop', 'knight'];

        const font = getFont('inter');
        const size = 0.3;
        const spacing = 0.1;
        const depth = 0.1;

        this.texts = [];

        options.forEach((type, i) => {
            const geometry = new TextGeometry(capitalize(type), {
                font: font,
                size: size,
                depth: depth,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.015,
            });

            geometry.computeBoundingBox();
            const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
            geometry.translate(-width / 2, 0, 0);

            const text = new THREE.Mesh(geometry, getMaterial('Wood'));
            text.userData.promoteTo = type;
            text.position.set(0, i * size + i * spacing, 0);
            text.raycast = (raycaster, intersects) => {
                text.children.forEach(child => {
                    const childIntersects = [];
                    child.raycast(raycaster, childIntersects);

                    for (const intersect of childIntersects) {
                        intersect.object = text;
                        intersects.push(intersect);
                    }
                });
            };

            const box = new THREE.Mesh(
                new THREE.BoxGeometry(width, size + spacing, depth),
                new THREE.MeshBasicMaterial({ visible: false }),
            );
            box.position.set(0, (size + spacing) / 2, 0);
            text.add(box);

            this.group.add(text);
            this.texts.push(text);
        });

        this.group.visible = false;
        scene.add(this.group);

        addUpdatable(this);
    }

    update(delta) {
        const targetPos = camera.position.clone();
        targetPos.y = this.group.position.y;
        this.group.lookAt(targetPos);

        if (!this.group.visible) return;

        const intersects = screenToWorld(mouseScreen.x, mouseScreen.y, this.group.children);
        const hovered = intersects[0]?.object;

        outlinePass.selectedObjects = outlinePass.selectedObjects.filter(object => !this.group.children.includes(object));
        if (hovered) outlinePass.selectedObjects.push(hovered);
    }

    setMaterial(color) {
        const textMaterial = getMaterial(color === 'white' ? 'Wood' : 'WoodDark').clone();
        textMaterial.transparent = true;
        this.texts.forEach(text => text.material = textMaterial);
    }

    show(board, piece) {
        return new Promise(async resolve => {
            this.group.visible = true;

            this.group.position.copy(piece.position).add(new THREE.Vector3(0, 1, 0));
            this.setMaterial(piece.color);

            const fadeIns = [];
            this.group.traverse(child => {
                if (child.isMesh && child.material?.transparent) {
                    child.material.opacity = 0;

                    fadeIns.push(new Promise(resolve => {
                        new Tween({
                            setter: v => child.material.opacity = v,
                            startValue: 0,
                            endValue: 1,
                            duration: 1,
                            easing: Easing.EaseInOutCubic,
                            onComplete: resolve,
                        });
                    }));
                }
            });
            await Promise.all(fadeIns);


            const onPointerUp = async event => {
                if (event.button !== 0) return;

                const intersects = screenToWorld(event.clientX, event.clientY, this.group.children, true);
                if (intersects.length === 0) return;

                const selected = intersects[0].object;
                const newType = selected.userData.promoteTo;

                const fadeOuts = [];
                this.group.traverse(child => {
                    if (child.isMesh && child.material?.transparent) {
                        child.material.opacity = 0;

                        fadeOuts.push(new Promise(resolve => {
                            new Tween({
                                setter: v => child.material.opacity = v,
                                startValue: 1,
                                endValue: 0,
                                duration: 0.2,
                                easing: Easing.EaseInOutCubic,
                                onComplete: resolve,
                            });
                        }));
                    }
                });
                await Promise.all(fadeOuts);
                this.group.visible = false;

                await board.promotePiece(piece, newType);
                window.removeEventListener('pointerup', onPointerUp);
                resolve();
            }

            window.addEventListener('pointerup', onPointerUp);
        });
    }
}