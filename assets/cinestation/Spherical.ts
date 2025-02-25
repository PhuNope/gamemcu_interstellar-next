import { Vec3, clamp, _decorator } from "cc";
const { ccclass, property } = _decorator;

@ccclass('Spherical')
export class Spherical {
    @property
    radius: number = 1;
    @property
    phi: number = 0;
    @property
    theta: number = 0;

    constructor(radius: number = 1, phi: number = 0, theta: number = 0) {
        this.radius = radius;
        this.phi = phi;
        this.theta;
    }

    setFromVector3(v: Vec3) {
        return this.setFromCartesianCoords(v.x, v.y, v.z);
    }

    setFromCartesianCoords(x: number, y: number, z: number) {
        this.radius = Math.sqrt(x * x + y * y + z * z);

        if (this.radius === 0) {
            this.theta = 0;
            this.phi = 0;
        } else {
            this.theta = Math.atan2(x, z);
            this.phi = Math.acos(clamp(y / this.radius, - 1, 1));
        }

        return this;
    }
}