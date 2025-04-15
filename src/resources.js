import {GLTFLoader, EXRLoader} from 'three/addons';
import * as THREE from "three";

const gltfLoader = new GLTFLoader();
const exrLoader = new EXRLoader();

const models = {}; // key: name, value: { scene, animationClips }
const environments = {}; // key: name, value: texture

function loadModel(name, path) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(path,
            (gltf) => {
                const model = gltf.scene || gltf.scenes[0];

                model.traverse(child => {
                    if (!child.isMesh) return;
                    child.castShadow = true;
                    child.receiveShadow = true;
                });

                models[name] = {
                    scene: model,
                    clips: gltf.animations || [],
                };
                resolve(gltf);
            },
            undefined,
            reject
        );
    });
}

function loadEnvironment(name, path) {
    return new Promise((resolve, reject) => {
        exrLoader.load(path,
            (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                environments[name] = texture;
                resolve(texture);
            },
            undefined,
            reject
        );
    });
}

export function getModel(name) {
    const { scene, clips } = models[name];
    const sceneClone = scene.clone(true);

    return {
        scene: sceneClone,
        clips: clips,
    };
}

export function getEnvironment(name) {
    return environments[name];
}

export const preloadResources = (async () => {
    await Promise.all([
        loadModel('board', 'assets/models/chess-board.glb'),
        loadModel('kingWhite', 'assets/models/king-white.glb'),
        loadModel('kingBlack', 'assets/models/king-black.glb'),
        loadModel('queenWhite', 'assets/models/queen-white.glb'),
        loadModel('queenBlack', 'assets/models/queen-black.glb'),
        loadModel('bishopWhite', 'assets/models/bishop-white.glb'),
        loadModel('bishopBlack', 'assets/models/bishop-black.glb'),
        loadModel('knightWhite', 'assets/models/knight-white.glb'),
        loadModel('knightBlack', 'assets/models/knight-black.glb'),
        loadModel('rookWhite', 'assets/models/rook-white.glb'),
        loadModel('rookBlack', 'assets/models/rook-black.glb'),
        loadModel('pawnWhite', 'assets/models/pawn-white.glb'),
        loadModel('pawnBlack', 'assets/models/pawn-black.glb'),
        loadEnvironment('sky', 'assets/textures/qwantani-4k.exr'),
    ]);
});