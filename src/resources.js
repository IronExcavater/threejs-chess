import {GLTFLoader} from 'three/addons';

const modelLoader = new GLTFLoader();

const models = {}; // key: name, value: { scene, animationClips }

function loadModel(name, path) {
    return new Promise((resolve, reject) => {
        modelLoader.load(path,
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
    })
}

export function getModel(name) {
    const { scene, clips } = models[name];
    const sceneClone = scene.clone(true);

    return {
        scene: sceneClone,
        clips: clips,
    };
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
    ]);
});