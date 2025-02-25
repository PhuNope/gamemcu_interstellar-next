import { Vec2, Vec3 } from "cc";

export function randomInt(low: number, high: number) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

export function randomFloat(low: number, high: number) {
    return low + Math.random() * (high - low);
}
export function randomFloats(array:number[][]) {
    const r = randomInt(0,array.length-1)
    return array[r][0] + Math.random() * (array[r][1] - array[r][0]);
}

export function randomBoolean(): boolean {
    return Math.random() < 0.5;
}

export function randomSpread(v: number) {
    return v * (0.5 - Math.random());
}

export function randomRange(a: number, b: number) {
    return a + Math.random() * (b - a);
}

export function cubicBezier(t: number, P0: Vec2, P1: Vec2, P2: Vec2, P3: Vec2, out: Vec2 = new Vec2()): Vec2 {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * P0.x // (1-t)^3 * P0
        + 3 * uu * t * P1.x // 3(1-t)^2 * t * P1
        + 3 * u * tt * P2.x // 3(1-t) * t^2 * P2
        + ttt * P3.x; // t^3 * P3

    const y = uuu * P0.y
        + 3 * uu * t * P1.y
        + 3 * u * tt * P2.y
        + ttt * P3.y;

    return out.set(x, y);
}

export function catmullRom(t: number, p0: number, p1: number, p2: number, p3: number) {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}


const cps = []

export function prepare() {
    let y11 = 0;
    for (let i = 0; i < 500; i++) {
        let y0 = i === 0 ? Math.random() : y11;
        let y1 = i === 499 ? cps[0][0].y : Math.random();

        cps.push([
            new Vec2(0, y0),
            new Vec2(0.25, y0),
            new Vec2(0.75, y1),
            new Vec2(1, y1),
        ]);

        y11 = y1;
    }
}

prepare();

let __o: Vec2 = null;
export function evalute(d: number, out: Vec2) {
    if (__o === null) {
        __o = new Vec2();
        evalute(0, __o);
    }
    const unit = 100;

    const n = Math.abs(d) / unit;
    const i = Math.floor(n);
    const t = n - i;

    const points = cps[i % cps.length];
    cubicBezier(t, points[0], points[1], points[2], points[3], out);

    return out.set(d, out.y * 30 - __o.y);
}

const _vec3_0 = new Vec3()
const _vec3_1 = new Vec3()
const _vec3_2 = new Vec3()
const _vec3_3 = new Vec3()
const _vec3_4 = new Vec3()
export function pointToLineDistance(P: Vec3, A: Vec3, B: Vec3) {
    const AB = _vec3_0.set(B).subtract(A)// 线段的向量
    const AP = _vec3_1.set(P).subtract(A)// 点到 A 的向量
    const BP = _vec3_2.set(P).subtract(B)// 点到 B 的向量

    const abSquared = AB.dot(AB); // 线段的平方长度

    if (abSquared == 0) {
        // A 和 B 重合，返回点 P 到 A 的距离
        return AP.length();
    }
    // 计算投影比例 t
    const t = AP.dot(AB) / abSquared;

    if (t < 0) {
        // 投影点在 A 之前
        return AP.length(); // 返回 P 到 A 的距离
    } else if (t > 1) {
        // 投影点在 B 之后
        return BP.length(); // 返回 P 到 B 的距离
    } else {
    // 投影点在线段 AB 上
        const projection = _vec3_3.set(A).add(AB.multiplyScalar(t))// 计算投影点
        return _vec3_4.set(P).subtract(projection).length()
    }
}
