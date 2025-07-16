export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export class PerlinNoise {
    constructor(seed = Date.now()) {
        this.p = new Array(512);
        this.permutation = [];
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }

        for (let i = 255; i > 0; i--) {
            const r = Math.floor(Math.random() * (i + 1));
            const temp = this.permutation[i];
            this.permutation[i] = this.permutation[r];
            this.permutation[r] = temp;
        }

        for (let i = 0; i < 256; i++) {
            this.p[i] = this.p[i + 256] = this.permutation[i];
        }
    }

    grad3d(i, x, y, z) {
        const h = i & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    noise(x, y, z) {
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        let Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        let u = this.fade(x);
        let v = this.fade(y);
        let w = this.fade(z);

        let A = this.p[X] + Y;
        let AA = this.p[A] + Z;
        let AB = this.p[A + 1] + Z;
        let B = this.p[X + 1] + Y;
        let BA = this.p[B] + Z;
        let BB = this.p[B + 1] + Z;

        return this.lerp(
            this.lerp(
                this.lerp(this.grad3d(this.p[AA], x, y, z), this.grad3d(this.p[BA], x - 1, y, z), u),
                this.lerp(this.grad3d(this.p[AB], x, y - 1, z), this.grad3d(this.p[BB], x - 1, y - 1, z), u),
                v
            ),
            this.lerp(
                this.lerp(this.grad3d(this.p[AA + 1], x, y, z - 1), this.grad3d(this.p[BA + 1], x - 1, y, z - 1), u),
                this.lerp(this.grad3d(this.p[AB + 1], x, y - 1, z - 1), this.grad3d(this.p[BB + 1], x - 1, y - 1, z - 1), u),
                v
            ),
            w
        );
    }
}