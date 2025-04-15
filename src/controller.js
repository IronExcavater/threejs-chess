import * as THREE from 'three';
import {scene, camera, outlinePass} from './app.js';
import Board from './board.js';

const raycaster = new THREE.Raycaster(undefined, undefined, 0, 40);
let mouseDown = new THREE.Vector2();
let isClick = false;

let board;
let selectedPiece = null;
let highlightTiles = [];
let currentTurn = 'white';
let stopInteraction = false;

export function initController() {
    board = new Board();
    window.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        mouseDown.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouseDown.y = -(event.clientY / window.innerHeight) * 2 + 1;
        isClick = true;
    });

    window.addEventListener('pointermove', (event) => {
        const mouseMove = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            (event.clientY / window.innerHeight) * 2 + 1);

        if (mouseDown.distanceTo(mouseMove) > 2) isClick = false;
    });
    window.addEventListener('pointerup', onPointerUp);

    // Create highlight tiles
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        opacity: 0.5,
        transparent: true,
        depthWrite: true,
    });

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const tile = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                highlightMaterial,
            );

            tile.rotation.x = -Math.PI/2;
            tile.position.set(-3.5 + file, 0.005, -3.5 + rank);
            tile.visible = false;
            scene.add(tile);
            highlightTiles.push(tile);
        }
    }
}

async function onPointerUp() {
    if (!isClick) return;

    raycaster.setFromCamera(mouseDown, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length === 0) {
        deselect();
        return;
    }

    const {file, rank} = worldToTile(intersects[0].point);

    if (!board.inBounds(file, rank)) {
        deselect();
        return;
    }

    const piece = board.getPieceAt(file, rank);
    if (selectedPiece === piece) {
        deselect();
        return;
    }
    if (piece && piece.color === currentTurn) {
        select(piece);
        return;
    }

    if (selectedPiece) {
        const move = board.getMoves(selectedPiece).find(m => m.file === file && m.rank === rank);

        if (!move) {
            deselect();
            return;
        }

        stopInteraction = true;

        const promises = [];
        promises.push(board.movePiece(selectedPiece, move.file, move.rank));
        if (move.capture) promises.push(board.removePiece(move.capture));

        deselect();
        currentTurn = currentTurn === 'white' ? 'black' : 'white';

        await Promise.all(promises);

        const king = board.pieces.find(p => p.type === 'king' && p.color === currentTurn);
        if (board.isCheckmated(king)) {
            await board.removePiece(king);
            reset();
        }

        if (board.isStalemated(king)) {
            const otherKing = board.pieces.find(p => p.type === 'king' && p.color !== currentTurn);
            await Promise.all([
                board.removePiece(king),
                board.removePiece(otherKing),
            ]);
            reset();
        }
        stopInteraction = false;
    }
}

function reset() {
    board.reset();
    currentTurn = 'white';
}

function select(piece) {
    selectedPiece = piece;
    showHighlights(board.getMoves(piece));
    outlinePass.selectedObjects = [piece.object];
}

function deselect() {
    selectedPiece = null;
    clearHighlights();
    outlinePass.selectedObjects = [];
}

function showHighlights(moves) {
    clearHighlights();
    for (const move of moves) {
        const index = move.rank * 8 + move.file;
        const tile = highlightTiles[index];
        if (tile) tile.visible = true;
    }
}

function clearHighlights() {
    for (const tile of highlightTiles) tile.visible = false;
}

function worldToTile(worldPoint) {
    const file = Math.floor(worldPoint.x + 4);
    const rank = Math.floor(worldPoint.z + 4);
    return { file, rank };
}