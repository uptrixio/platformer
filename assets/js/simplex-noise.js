function random(seed) {
    let x;
    if (typeof seed === 'string') {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        x = hash;
    } else if (typeof seed === 'number') {
        x = seed;
    } else {
        x = 123456789;
    }
    return function() {
        x = ((x * 9301 + 49297) % 233280);
        return x / 233280;
    };
}

function createNoise2D(seed = Math.random()) {
    const generator = random(seed);

    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const gradients2D = new Float32Array([
        1, 1, -1, 1, 1, -1, -1, -1,
        1, 0, -1, 0, 0, 1, 0, -1
    ]);

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        p[i] = i;
    }

    for (let i = 255; i > 0; i--) {
        const j = Math.floor(generator() * (i + 1));
        const temp = p[i];
        p[i] = p[j];
        p[j] = temp;
    }

    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        permMod12[i] = perm[i] % 12;
    }

    return function(x, y) {
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);

        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        const ii = i & 255;
        const jj = j & 255;

        let n0, n1, n2;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0.0;
        } else {
            t0 *= t0;
            const gi0 = permMod12[ii + perm[jj]] * 2;
            n0 = t0 * t0 * (gradients2D[gi0] * x0 + gradients2D[gi0 + 1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0.0;
        } else {
            t1 *= t1;
            const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 2;
            n1 = t1 * t1 * (gradients2D[gi1] * x1 + gradients2D[gi1 + 1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0.0;
        } else {
            t2 *= t2;
            const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 2;
            n2 = t2 * t2 * (gradients2D[gi2] * x2 + gradients2D[gi2 + 1] * y2);
        }

        return 70.0 * (n0 + n1 + n2);
    };
}

export { createNoise2D };