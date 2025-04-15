import * as THREE from 'three';
import {EffectComposer, MapControls, OutlinePass, RenderPass, UnrealBloomPass} from 'three/addons';
import {getEnvironment, preloadResources} from './resources.js';
import {initController} from './controller.js';
import {updateTweens} from './tween.js';

import '/styles/app.css';


await preloadResources();

// Core three.js components
export const scene = new THREE.Scene();

export const camera = new THREE.PerspectiveCamera(
    90, window.innerWidth / window.innerHeight, 0.1, 1000);

export const audioListener = new THREE.AudioListener();
camera.add(audioListener);

const updatables = [];
const clock = new THREE.Clock();
export const renderer = new THREE.WebGLRenderer({
    antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);
renderer.setAnimationLoop(() => update(clock.getDelta()));

export const raycaster = new THREE.Raycaster(undefined, undefined, 0, 40);

// Shader components
export const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

export const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene, camera);
outlinePass.edgeStrength = 3;
outlinePass.edgeThickness = 1;
outlinePass.visibleEdgeColor.set(0xffff00);
composer.addPass(outlinePass);

export const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6, 0.4, 0.85
);
composer.addPass(bloomPass);

// Scene components
scene.background = getEnvironment('sky');

camera.position.set(5, 10, -5);

const controls = new MapControls( camera, renderer.domElement );
controls.listenToKeyEvents( window ); // optional

controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.minDistance = 1;
controls.maxDistance = 10;

controls.maxPolarAngle = Math.PI / 3;

export const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

export const directionLight = new THREE.DirectionalLight(0xffffff, 5);
directionLight.position.set(7, 6, 5);
directionLight.castShadow = true;
directionLight.shadow.bias = -0.001;
directionLight.shadow.mapSize.width = 4096;
directionLight.shadow.mapSize.height = 4096;

directionLight.shadow.camera.near = 1;
directionLight.shadow.camera.far = 30;

directionLight.shadow.camera.left = -10;
directionLight.shadow.camera.right = 10;
directionLight.shadow.camera.top = 10;
directionLight.shadow.camera.bottom = -10;

scene.add(directionLight);


// Helpers
/*const origin = new THREE.Vector3(0, 1, 0);
const zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, 2, 0xff0000);
const xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, 2, 0x0000ff);
scene.add(zArrow);
scene.add(xArrow);*/


// Resize and update app
window.addEventListener('resize', () => windowResize());
windowResize();

function windowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    outlinePass.resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
}

export const mouseScreen = new THREE.Vector2();
window.addEventListener('pointermove', event => {
    mouseScreen.x = event.clientX;
    mouseScreen.y = event.clientY;
});

function update(delta) {
    updateTweens(delta);
    controls.update(delta);

    const boundRadius = 10;
    const xzTarget = new THREE.Vector2(controls.target.x, controls.target.z);

    if (xzTarget.length() > boundRadius) {
        const offset = camera.position.clone().sub(controls.target);

        xzTarget.setLength(boundRadius);
        controls.target.x = xzTarget.x;
        controls.target.z = xzTarget.y;

        camera.position.copy(controls.target).add(offset);
    }

    for (const obj of updatables) obj.update(delta);
    composer.render();
}

export function addUpdatable(obj) {
    if (typeof obj?.update === 'function') {
        updatables.push(obj);
    } else {
        console.warn('GameObject invalid for updatables; no update method:', obj);
    }
}

export function removeUpdatable(obj) {
    const index = updatables.indexOf(obj);
    if (index > -1) {
        updatables.splice(index, 1);
    } else {
        console.warn('GameObject not found in updatables:', obj);
    }
}

await initController();