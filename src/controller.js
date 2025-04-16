import * as THREE from 'three';
import {scene, outlinePass} from './app.js';
import {screenToWorld} from './utils.js';
import Board from './board.js';
import PromotionMenu from './PromotionMenu.js';

let board;
let promotionMenu;
let highlightTiles = [];
let currentTurn = 'white';

let selectedPiece = null;
let stopInteraction = false;

export async function initController() {
    board = new Board();
    promotionMenu = new PromotionMenu();

    window.addEventListener('pointerdown', onPointerDown);

    window.addEventListener('keydown', async event => {
        if (event.code === 'KeyP') await promotionMenu.show(board, selectedPiece);
        if (event.code === 'KeyD') await board.removePiece(selectedPiece);
        if (event.code === 'KeyT') currentTurn = currentTurn === 'white' ? 'black' : 'white';
        if (event.code === 'KeyR') await reset();
    });

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

            tile.rotation.x = -Math.PI / 2;
            tile.position.set(-3.5 + file, 0.005, -3.5 + rank);
            tile.visible = false;
            scene.add(tile);
            highlightTiles.push(tile);
        }
    }

    await board.spawnPieces();
}

async function onPointerDown(event) {
    if (event.button !== 0 || stopInteraction) return;

    const objects = [board, ...board.pieces];
    const intersects = screenToWorld(event.clientX, event.clientY, objects);
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
        if (move.capture) promises.push(board.capturePiece(move.capture));

        const selectPiece = selectedPiece;
        deselect();
        currentTurn = currentTurn === 'white' ? 'black' : 'white';

        await Promise.all(promises);

        // Check for promotion
        if (selectPiece.type === 'pawn' &&
            (selectPiece.rank === 0 && selectPiece.color === 'black' ||
                selectPiece.rank === 7) && selectPiece.color === 'white')
        {
            await promotionMenu.show(board, selectPiece);
        }


        // Check for checkmate
        const king = board.pieces.find(p => p.type === 'king' && p.color === currentTurn);
        if (board.isCheckmated(king)) {
            await board.capturePiece(king);
            await reset();
        }

        // Check for stalemate
        if (board.isStalemated(king)) {
            const otherKing = board.pieces.find(p => p.type === 'king' && p.color !== currentTurn);
            await Promise.all([
                board.capturePiece(king),
                board.capturePiece(otherKing),
            ]);
            await reset();
        }

        stopInteraction = false;
    }
}

async function reset() {
    await board.reset();
    currentTurn = 'white';
}

function select(piece) {
    selectedPiece = piece;
    showHighlights(board.getMoves(piece));
    outlinePass.selectedObjects = [piece.object];
}

function deselect() {
    outlinePass.selectedObjects = outlinePass.selectedObjects.filter(object => object !== selectedPiece);
    selectedPiece = null;
    clearHighlights();
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