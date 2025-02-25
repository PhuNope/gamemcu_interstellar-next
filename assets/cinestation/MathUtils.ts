import { Mat4, Vec2, Vec3, clamp } from "cc";
import { Spherical } from "./Spherical";

const { abs } = Math;

const __EPS = 1.e-4;
const __dist = new Vec3();

export function FInterpTo(
    current: number,
    target: number,
    deltaTime: number,
    speed: number
) {
    if (speed <= 0) {
        return target;
    }
    let dist = target - current;
    if (abs(dist) < __EPS) {
        return target;
    }
    return current + dist * clamp(speed * deltaTime, 0, 1);
}

export function VInterpTo(
    current: Vec3,
    target: Vec3,
    deltaTime: number,
    speed: number,
    out: Vec3 = current
) {
    if (speed <= 0) {
        return out.set(target);
    }
    let dist = __dist.set(target).subtract(current);
    if (dist.length() < __EPS) {
        return out.set(target);
    }
    return out.set(current).add(dist.multiplyScalar(clamp(deltaTime * speed, 0, 1)));
}

export function VInterpConstantTo(
    current: Vec3,
    target: Vec3,
    deltaTime: number,
    speed: number,
    out: Vec3 = current
) {
    let delta = __dist.set(target).subtract(current);
    let deltaM = delta.length();
    let maxStep = speed * deltaTime;
    if (deltaM > maxStep) {
        if (maxStep > 0) {
            return out.set(current).add(delta.multiplyScalar(maxStep / deltaM));
        }
        else {
            return out.set(current);
        }
    }
    return out.set(target);
}

export function setFromSpherical(s: Spherical, out: Vec3 = new Vec3()) {
    return setFromSphericalCoords(s.radius, s.phi, s.theta, out);
}

export function setFromSphericalCoords(radius: number, phi: number, theta: number, out: Vec3) {
    const sinPhiRadius = Math.sin(phi) * radius;

    out.x = sinPhiRadius * Math.sin(theta);
    out.y = Math.cos(phi) * radius;
    out.z = sinPhiRadius * Math.cos(theta);

    return out;
}

export function setFromMatrixColumn(m: Mat4, col: number, out: Vec3 = new Vec3()) {
    switch (col) {
        case 0:
            out.x = m.m00;
            out.y = m.m01;
            out.z = m.m02;
            break;
        case 1:
            out.x = m.m04;
            out.y = m.m05;
            out.z = m.m06;
            break;
        case 2:
            out.x = m.m08;
            out.y = m.m09;
            out.z = m.m10;
            break;
    }
    return out;
}