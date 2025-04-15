import * as THREE from 'three';

const tweens = [];

export const Easing = {
    Linear: t => t,
    EaseInCubic: t => t ** 3,
    EaseOutCubic: t => 1 - Math.pow(1 - t, 3),
    EaseInOutCubic: t =>
        t < 0.5
            ? 4 * t ** 3
            : 1 - Math.pow(-2 * t + 2, 3) / 2,
    EaseOutElastic: t =>
        t === 0 ? 0
            : t === 1 ? 1
                : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    EaseOutBounce: t => {
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
}

export class Tween {
    constructor({
                    setter,
                    startValue,
                    endValue,
                    duration,
                    easing = Easing.EaseInOutCubic,
                    onComplete = () => {},
                }) {
        this.setter = setter;
        this.startValue = startValue;
        this.endValue = endValue;
        this.duration = duration;
        this.easing = easing;
        this.onComplete = onComplete;

        this.elapsed = 0;
        tweens.push(this);
    }

    getEndValue() {
        return typeof this.endValue === 'function' ? this.endValue() : this.endValue;
    }

    update(delta) {
        this.elapsed += delta;

        const t = Math.min(this.elapsed / this.duration, 1);
        const easedT = this.easing(t);

        this.setter(lerp(this.startValue, this.getEndValue(), easedT), t);

        if (t >= 1) {
            if (typeof this.onComplete === 'function') this.onComplete();
            return false;
        }
        return true;
    }
}

function lerp(a, b, t) {
    if (a instanceof THREE.Vector3) return a.clone().lerp(b, t);
    if (a instanceof THREE.Quaternion) return a.clone().slerp(b, t);
    if (typeof a === 'number') return a + (b - a) * t;
    throw new Error('Unsupported tween type');
}

export function updateTweens(delta) {
    for (let i = tweens.length - 1; i >= 0; i--) {
        if (!tweens[i].update(delta)) {
            tweens.splice(i, 1);
        }
    }
}