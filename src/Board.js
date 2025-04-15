import * as THREE from 'three';
import {scene} from './app.js';
import {getModel} from './resources.js';
import Piece from './Piece.js';
import {Easing, Tween} from './tween.js';


export default class Board extends THREE.Object3D {
    constructor() {
        super();
        this.pieces = [];
        this.moves = [];

        this.raycaster = new THREE.Raycaster(undefined, undefined, 0, 0);
        this.object = getModel('board').scene;
        this.object.scale.set(16.8, 16.8, 16.8);
        this.add(this.object);
        scene.add(this);
    }

    reset() {
        const removeTweens = this.pieces.map(p => this.removePiece(p));
        return Promise.all(removeTweens).then(() => {
            this.pieces = [];
            return this.spawnPieces();
        });
    }

    spawnPieces() {
        const pieceOrder = ['rook', 'knight', 'bishop', 'king', 'queen', 'bishop', 'knight', 'rook'];
        const spawnTweens = [];

        for (let file = 0; file < 8; file++) {
            // Pawn ranks
            spawnTweens.push(this.addPiece('pawn', 'white', file, 1));
            spawnTweens.push(this.addPiece('pawn', 'black', file, 6));

            // Back ranks
            spawnTweens.push(this.addPiece(pieceOrder[file], 'white', file, 0));
            spawnTweens.push(this.addPiece(pieceOrder[file], 'black', file, 7));
        }

        return Promise.all(spawnTweens);
    }

    getPieceAt(file, rank) {
        return this.pieces.find(p => p.file === file && p.rank === rank);
    }

    getMoves(piece, skipChecks = false) {
        let moves = [];
        const { file, rank, color, type } = piece;

        const lastMove = this.getMove(0);
        const direction = color === 'white' ? 1 : -1;

        switch (type) {
            case 'pawn':
                // Forward
                const forward = this.getPieceAt(file, rank + direction);
                if (this.inBounds(file, rank + direction) && !forward) {
                    moves.push({ file, rank: rank + direction });

                    // Double forward
                    const startRank = color === 'white' ? 1 : 6;
                    if (!forward && rank === startRank) {
                        const doubleForward = this.getPieceAt(file, rank + direction * 2);
                        if (!doubleForward) moves.push({ file, rank: rank + direction * 2 });
                    }
                }

                // Diagonal capture
                for (const df of [-1, 1]) {
                    const diagonal = this.getPieceAt(file + df, rank + direction);
                    if (diagonal && diagonal.color !== color) moves.push({ file: file + df, rank: rank + direction, capture: diagonal });
                }

                // En passant
                if (lastMove && lastMove.piece.type === 'pawn') {
                    const { from, to } = lastMove;

                    if (Math.abs(to.rank - from.rank) === 2 && to.rank === rank) {
                        for (const df of [-1, 1]) {
                            if (to.file === file + df) moves.push({ file: to.file, rank: rank + direction, capture: lastMove.piece });
                        }
                    }
                }
                break;
            case 'rook':
                // Straight directions
                for (const [df, dr] of [[1,0],[0,1],[-1,0],[0,-1]]) {
                    for (let i = 1; i < 8; i++) {
                        const f = file + df * i, r = rank + dr * i;
                        if (!this.inBounds(f, r)) break;

                        const target = this.getPieceAt(f, r);
                        if (!target) moves.push({ file: f, rank: r });
                        else {
                            if (target.color !== color) moves.push({ file: f, rank: r, capture: target });
                            break;
                        }
                    }
                }
                break;
            case 'bishop':
                // Diagonal directions
                for (const [df, dr] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
                    for (let i = 1; i < 8; i++) {
                        const f = file + df * i, r = rank + dr * i;
                        if (!this.inBounds(f, r)) break;

                        const target = this.getPieceAt(f, r);
                        if (!target) moves.push({ file: f, rank: r });
                        else {
                            if (target.color !== color) moves.push({ file: f, rank: r, capture: target });
                            break;
                        }
                    }
                }
                break;
            case 'knight':
                // L-shape directions
                for (const [df, dr] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]) {
                    const f = file + df, r = rank + dr;
                    if (!this.inBounds(f, r)) continue;

                    const target = this.getPieceAt(f, r);
                    if (!target) moves.push({ file: f, rank: r });
                    else if (target.color !== color) moves.push({ file: f, rank: r, capture: target });
                }
                break;
            case 'queen':
                // Diagonal and straight directions
                for (const [df, dr] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]) {
                    for (let i = 1; i < 8; i++) {
                        const f = file + df * i, r = rank + dr * i;
                        if (!this.inBounds(f, r)) break;

                        const target = this.getPieceAt(f, r);
                        if (!target) moves.push({ file: f, rank: r });
                        else {
                            if (target.color !== color) moves.push({ file: f, rank: r, capture: target });
                            break;
                        }
                    }
                }
                break;
            case 'king':
                // Adjacent directions
                for (const [df, dr] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]) {
                    const f = file + df, r = rank + dr;
                    if (!this.inBounds(f, r)) continue;

                    const target = this.getPieceAt(f, r);

                    if (!skipChecks) {
                        if (target) this.pieces = this.pieces.filter(p => p !== target);
                        const origPos = piece.getPosition();
                        piece.setPosition(f, r);

                        const inCheck = this.isChecked(piece).length > 0;

                        piece.setPosition(origPos.file, origPos.rank);
                        if (target) this.pieces.push(target);

                        if (inCheck) continue;
                    }

                    if (!target) moves.push({ file: f, rank: r });
                    else if (target.color !== color) moves.push({ file: f, rank: r, capture: target });
                }
                break;
        }

        if (!skipChecks && type !== 'king') {
            const king = this.pieces.find(p => p.type === 'king' && p.color === color);

            // Remove moves that cannot block or capture all attackers with one move
            moves = moves.filter(move => {
                const origPos = piece.getPosition();

                if (move.capture) this.pieces = this.pieces.filter(p => p !== move.capture);
                piece.setPosition(move.file, move.rank);

                const isChecked = this.isChecked(king).length > 0;

                if (move.capture) this.pieces.push(move.capture);
                piece.setPosition(origPos.file, origPos.rank);

                return !isChecked;
            });
        }

        return moves;
    }

    addPiece(type, color, file, rank) {
        return new Promise(resolve => {
            const piece = new Piece(type, color, file, rank);
            this.pieces.push(piece);

            new Tween({
                setter: scale => piece.object.scale.copy(scale),
                startValue: new THREE.Vector3(),
                endValue: new THREE.Vector3(17, 17, 17),
                duration: 0.5,
                easing: Easing.EaseOutCubic,
                onComplete: resolve,
            });
        });
    }

    removePiece(piece) {
        return new Promise(resolve => {
            this.pieces = this.pieces.filter(p => p !== piece);

            new Tween({
                setter: scale => piece.object.scale.copy(scale),
                startValue: piece.object.scale.clone(),
                endValue: new THREE.Vector3(),
                duration: 0.5,
                easing: Easing.EaseInCubic,
                onComplete: () => {
                    scene.remove(piece);
                    resolve();
                },
            });
        });
    }

    capturePiece(piece) {
        return new Promise(resolve => {
            this.pieces = this.pieces.filter(p => p !== piece);

            const start = piece.quaternion.clone();
            const tiltAxis = new THREE.Vector3(1, 0, Math.random() - 0.5);
            const end = start.clone().multiply(
                new THREE.Quaternion().setFromAxisAngle(tiltAxis, -Math.PI / 2)
            );

            // Fall piece
            new Tween({
                setter: (quat, t) => {
                    piece.quaternion.copy(quat);
                    piece.position.y = Math.min(0.2, 0.2 * t * 2);
                },
                startValue: start,
                endValue: end,
                duration: 1.2,
                easing: Easing.EaseOutBounce,
                onComplete: () => {
                    // Sink piece
                    new Tween({
                        setter: (i, _) => {
                            piece.position.y = 0.2 + (-0.4 - 0.2) * i;
                        },
                        startValue: 0,
                        endValue: 1,
                        duration: 0.4,
                        easing: Easing.EaseInCubic,
                        onComplete: () => {
                            scene.remove(piece);
                            resolve();
                        }
                    });
                },
            });
        });
    }

    movePiece(piece, file, rank) {
        return new Promise(resolve => {
            this.moves.push({
                piece: piece,
                from: { file: piece.file, rank: piece.rank },
                to: { file, rank },
            });

            piece.setPosition(file, rank);

            const start = piece.position.clone();
            const end = new THREE.Vector3(-3.5 + file, 0, -3.5 + rank);

            const direction = end.clone().sub(start);
            this.raycaster.far = direction.length();

            const tangent = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
            const leftStart = start.clone().add(tangent.clone().multiplyScalar(-0.3));
            const rightStart = start.clone().add(tangent.clone().multiplyScalar(0.3));

            this.raycaster.set(leftStart, direction.normalize());
            const leftHits = this.raycaster.intersectObjects(this.pieces.filter(p => p !== piece), true);
            this.raycaster.set(rightStart, direction.normalize());
            const rightHits = this.raycaster.intersectObjects(this.pieces.filter(p => p !== piece), true);

            const arcNeeded = leftHits.length > 0 || rightHits.length > 0;

            new Tween({
                setter: (pos, t) => {
                    const height = Math.sin(t * Math.PI);
                    if (arcNeeded) pos.y += height;
                    piece.position.copy(pos);
                },
                startValue: start,
                endValue: end,
                duration: 1,
                easing: Easing.EaseInOutCubic,
                onComplete: resolve,
            });
        });
    }

    promotePiece(piece, newType) {
        return new Promise(resolve => {
            const prevObject = piece.object.clone();
            piece.add(prevObject);
            piece.remove(piece.object);

            piece.type = newType;
            piece.initModel();

            new Tween({
                setter: scale => prevObject.scale.copy(scale),
                startValue: piece.object.scale.clone(),
                endValue: new THREE.Vector3(),
                duration: 0.5,
                easing: Easing.EaseInCubic,
            });

            new Tween({
                setter: scale => piece.object.scale.copy(scale),
                startValue: new THREE.Vector3(),
                endValue: new THREE.Vector3(17, 17, 17),
                duration: 0.5,
                easing: Easing.EaseOutCubic,
                onComplete: () => {
                    piece.remove(prevObject);
                    resolve();
                },
            });
        });
    }

    getMove(indexFromEnd) {
        const index = this.moves.length - 1 - indexFromEnd;
        return 0 <= index && index < this.moves.length ? this.moves[index] : null;
    }

    inBounds(file, rank) {
        return 0 <= file && file <= 7 && 0 <= rank && rank <= 7;
    }

    isChecked(king) {
        const attackers = [];

        for (const piece of this.pieces) {
            if (piece.color === king.color) continue;
            const pieceMoves = this.getMoves(piece, true);
            if (pieceMoves.some(move => move.file === king.file && move.rank === king.rank)) attackers.push(piece);
        }
        return attackers;
    }

    isCheckmated(king) {
        const attackers = this.isChecked(king);
        if (attackers.length === 0) return false;

        // If king has escape, not checkmate
        if (this.getMoves(king).length > 0) return false;

        // If any ally can block or capture all attackers, not checkmate
        const allies = this.pieces.filter(p => p.color === king.color && p !== king);
        return !allies.some(p => this.getMoves(p).length > 0);
    }

    isStalemated(king) {
        if (this.isChecked(king).length > 0) return false;

        const pieces = this.pieces.filter(p => p.color === king.color);
        return pieces.every(p => this.getMoves(p).length === 0);
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