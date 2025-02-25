import { _decorator, Component, director, instantiate, Node, Quat, Vec2, Vec3 } from 'cc';
import { evalute, randomFloat, randomFloats, randomInt } from '../utils/Math';
import { properties } from '../datas/Properties';
import { EventType } from '../datas/Enum';
const { ccclass, property } = _decorator;
const { cos, sin } = Math
type Battery = {
    mainNode: Node
    inNode: Node
    boxNode: Node
}

@ccclass('PropsManager')
export class PropsManager extends Component {
    static __position = new Vec2();
    static __vec3 = new Vec3();

    @property(Node)
    battery: Node = null;

    private _batterys: Node = new Node();
    private _group: Battery[][] = []
    private _groupInterval = 37
    private _cellInterval = 2
    private _cellNumber = 8
    private _rotation = new Vec3()

    onLoad(): void {
        const { __position } = PropsManager;

        const parent = this.battery.parent;
        this._batterys.parent = parent;

        for (let i = 0; i < 2; i++) {
            const y = randomFloats([[-4, -3.5], [-1.5, -1], [1, 1.5]]);
            const r = randomFloat(4, 8)
            const g = []

            for (let j = this._cellNumber - 1; j >= 0; j--) {
                const ins = instantiate(this.battery);
                const p = evalute(30 + i * this._groupInterval + this._cellInterval * j, __position);
                ins.parent = this._batterys;
                ins.setPosition(p.x, y, p.y + (cos(p.x / r) - 0.5) / 2);
                g.push({
                    mainNode: ins,
                    inNode: ins.getChildByPath('box/in'),
                    boxNode: ins.getChildByPath('box'),
                })
            }
            g.reverse()
            this._group.push(g)
        }
        director.on(EventType.OFFSET, this._offset)
    }

    onDestroy(): void {
        director.off(EventType.OFFSET, this._offset)
    }

    private _offset = () => {
        for(const list of this._group){
            for(const b of list){
                b.mainNode.setPosition(b.mainNode.position.x-100,b.mainNode.position.y,b.mainNode.position.z)
            }
        }
    }

    update(dt: number): void {
        dt = Math.min(0.033, dt);
        
        const { __position, __vec3 } = PropsManager;
        const ship = properties.ship;
        this._rotation.y += dt * 200
        for (const g of this._group) {
            if (g[this._cellNumber - 1].mainNode.position.x < ship.position.x - 1) {
                const y = randomFloats([[-4, -3.5], [-1.5, -1], [1, 1.5]]);
                const orgPosX = g[0].mainNode.position.x+ship.offset
                const r = randomFloat(4, 8)
                for (let i = 0; i < this._cellNumber; i++) {
                    const p = evalute(
                        orgPosX + this._groupInterval * 2 + i * this._cellInterval,
                        __position);
                    const child = g[i].mainNode
                    child.active = true
                    child.setPosition(p.x-ship.offset, y, p.y + (cos(p.x / r) / 2 - 0.5));
                }
            }

            for (let i = 0; i < this._cellNumber; i++) {
                const mainNode = g[i].mainNode
                const inNode = g[i].inNode
                const boxNode = g[i].boxNode
                inNode.setRotationFromEuler(this._rotation)
                boxNode.setPosition(__vec3.set(0, cos(this._rotation.y * 0.02 + i) * 0.02, 0))
                if (mainNode.active) {
                    if (Vec3.distance(mainNode.position, ship.position) < 0.5) {
                        mainNode.active = false;
                        director.emit(EventType.GET, ship.position);
                    }
                }
            }
        }

        // if (this._batterys.children[0].position.x < ship.position.x - 1) {
        //     const p = evalute(properties.ship.position.x + 50, __position);
        //     const y = randomFloat(-4, 4);
        //     for (let i = 0; i < 3; i++) {
        //         const child = this._batterys.children[i]
        //         child.active = true
        //         child.setPosition(p.x, y, p.y + i - 1);
        //     }
        // }

        // for (let child of this._batterys.children) {
        //     if (child.active) {
        //         if (Vec3.distance(child.position, ship.position) < 0.5) {
        //             child.active = false;
        //             director.emit(EventType.GET)
        //         }
        //     }
        // }

    }
}
