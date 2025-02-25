import { Mat4, Quat, Vec3 } from "cc";

export class Ship {
    far: number = 0;//实际长度
    offset: number = 0;//偏移距离
    speed: Vec3 = new Vec3();
    speedRatio: Vec3 = new Vec3();
    position: Vec3 = new Vec3();//实际位置
    rotation: Quat = new Quat();
}