import * as THREE from 'three';
import {camera, raycaster} from './app.js';

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function screenToWorld(clientX, clientY, objects) {
    // normalised device coordinates
    const ndc = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(objects, true);
}

export function worldToScreen(worldPos) {
    // normalised device coordinates
    const ndc = worldPos.clone().project(camera);

    const screenX = (ndc.x + 1) / 2 * window.innerWidth;
    const screenY = (1 - ndc.y) / 2 * window.innerHeight;

    return { x: screenX, y: screenY };
}