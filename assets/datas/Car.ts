import { Vec2, Vec3 } from "cc";

export class Car {
    speed: number = 0;
    offset:Vec2 = new Vec2();//yz方向上的偏移量
    reverse:boolean = false;//是否反方向
    range: number//碰撞球大小
}