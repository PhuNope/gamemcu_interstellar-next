const { floor } = Math;

// Copyright (C) 2016 Keijiro Takahashi
// https://mrl.cs.nyu.edu/~perlin/noise/
export class Perlin {
    static Noise(x: number): number;
    static Noise(x: number, y: number): number;
    static Noise(x: number, y: number, z: number): number;
    static Noise(x: number, y?: number, z?: number) {
        let fade = Perlin._Fade;
        let grad = Perlin._Grad;
        let lerp = Perlin._Lerp;
        let p = Perlin._Permutation;

        if (y !== undefined && z !== undefined) {
            let xi = floor(x);
            let yi = floor(y);
            let zi = floor(z);
            let X = xi & 0xff;                                   // FIND UNIT CUBE THAT
            let Y = yi & 0xff;                                   // CONTAINS POINT.
            let Z = zi & 0xff;
            x -= xi;                                             // FIND RELATIVE X,Y,Z
            y -= yi;                                             // OF POINT IN CUBE.
            z -= zi;
            let u = fade(x);                                     // COMPUTE FADE CURVES
            let v = fade(y);                                     // FOR EACH OF X,Y,Z.
            let w = fade(z);
            let A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;  // HASH COORDINATES OF
            let B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;  // THE 8 CUBE CORNERS,

            return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z),      // AND ADD
                grad(p[BA], x - 1, y, z)),     // BLENDED
                lerp(u, grad(p[AB], x, y - 1, z),      // RESULTS
                    grad(p[BB], x - 1, y - 1, z))),    // FROM  8
                lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1),      // CORNERS
                    grad(p[BA + 1], x - 1, y, z - 1)),     // OF CUBE
                    lerp(u, grad(p[AB + 1], x, y - 1, z - 1),
                        grad(p[BB + 1], x - 1, y - 1, z - 1))));
        }
        else if (y !== undefined) {
            let xi = floor(x);
            let yi = floor(y);
            let X = xi & 0xff;
            let Y = yi & 0xff;
            x -= xi;
            y -= yi;
            let u = fade(x);
            let v = fade(y);
            let A = (p[X] + Y) & 0xff;
            let B = (p[X + 1] + Y) & 0xff;
            return lerp(v, lerp(u, grad(p[A], x, y),
                grad(p[B], x - 1, y)),
                lerp(u, grad(p[A + 1], x, y - 1),
                    grad(p[B + 1], x - 1, y - 1)));
        }
        else {
            let xi = floor(x);
            let X = xi & 0xff;
            x -= xi;
            let u = fade(x);
            return lerp(u, grad(p[X], x),
                grad(p[X + 1], x - 1));
        }
    }

    static Fbm(octave: number, x: number): number;
    static Fbm(octave: number, x: number, y: number): number;
    static Fbm(octave: number, x: number, y: number, z: number): number;
    static Fbm(octave: number, x: number, y?: number, z?: number) {
        let f = 0;
        let w = 0.5;
        let noise = Perlin.Noise;
        if (y !== undefined && z !== undefined) {
            for (let i = 0; i < octave; i++) {
                f += w * noise(x, y, z);
                x *= 2.0;
                y *= 2.0;
                z *= 2.0;
                w *= 0.5;
            }
        }
        else if (y !== undefined) {
            for (let i = 0; i < octave; i++) {
                f += w * noise(x, y);
                x *= 2.0;
                y *= 2.0;
                w *= 0.5;
            }
        }
        else {
            for (let i = 0; i < octave; i++) {
                f += w * noise(x);
                x *= 2.0;
                w *= 0.5;
            }
        }
        return f;
    }

    private static _Fade(t: number) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private static _Lerp(t: number, a: number, b: number) {
        return a + t * (b - a);
    }

    private static _Grad(hash: number, x: number): number;
    private static _Grad(hash: number, x: number, y: number): number;
    private static _Grad(hash: number, x: number, y: number, z: number): number
    private static _Grad(hash: number, x: number, y?: number, z?: number) {
        if (y !== undefined && z !== undefined) {
            let h = hash & 15;                     // CONVERT LO 4 BITS OF HASH CODE
            let u = h < 8 ? x : y,                 // INTO 12 GRADIENT DIRECTIONS.
                v = h < 4 ? y : (h == 12 || h == 14 ? x : z);
            return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
        }
        else if (y !== undefined) {
            return ((hash & 1) == 0 ? x : -x) + ((hash & 2) == 0 ? y : -y);
        }
        else {
            return (hash & 1) == 0 ? x : -x;
        }
    }

    private static _Permutation = [
        151, 160, 137, 91, 90, 15,
        131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
        190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
        88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
        77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
        102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
        135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
        5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
        223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
        129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
        251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
        49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
        138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
        151
    ]
}
