import { _decorator, clamp, Component, director, geometry, instantiate, MeshRenderer, Node, Quat, random, renderer, Vec2, Vec3 } from 'cc';
import { evalute, randomBoolean, randomFloat, randomFloats, randomInt } from '../utils/Math';
import { properties } from '../datas/Properties';
import { Car } from '../datas/Car';
import { EventType, HitType } from '../datas/Enum';
const { ccclass, property } = _decorator;

type CarNode = Node & { data: Car };

@ccclass('SceneManager')
export class SceneManager extends Component {
    static __euler = new Vec3();
    static __position = new Vec2();
    static __vec3 = new Vec3();

    @property(Node)
    building: Node = null;

    @property(Node)
    buildingBox: Node = null

    @property(Node)
    bridge: Node = null;

    @property(Node)
    bridgeBox: Node = null;

    @property(Node)
    bottom: Node = null;

    @property(Node)
    enemyCars: Node[] = [];

    private _cars: Node = new Node();
    private _buildings: Node = new Node();
    private _bottoms: Node = new Node();
    private _bridges: Node = new Node();
    private _index: number = 0;
    private _preBuildingBoxNodeIndex = [-1, -1]//[index,左/右]
    private _preBridgeBoxIndex = -1
    private _ray: geometry.Ray = new geometry.Ray();
    private _buildingBoxModel: renderer.scene.Model = null
    private _bridgeBoxModel: renderer.scene.Model = null

    private _buildingCount = 10
    private _bottomCount = 5
    private _bridgeCount = 5

    onLoad(): void {
        const { __position } = SceneManager;
        const { building } = this;

        const parent = building.parent;
        this._cars.parent = parent;
        this._buildings.parent = parent;
        this._bottoms.parent = parent
        this._bridges.parent = parent

        //房子
        for (let i = 0; i < this._buildingCount; i++) {
            const p = evalute(i * 5, __position);

            const k1 = randomInt(0, 3);
            const k2 = k1 === 1 ? 0 : k1 === 3 ? 2 : randomInt(0, 3);

            const b0 = instantiate(building);
            b0.parent = this._buildings;
            b0.setPosition(p.x, randomFloat(-5, 0), p.y - 4);
            b0.setRotationFromEuler(0, k1 * 90, 0);
            this.setArrowRotation(b0, false)

            const b1 = instantiate(building);
            b1.parent = this._buildings;
            b1.setPosition(p.x, randomFloat(-5, 0), p.y + 4);
            b1.setRotationFromEuler(0, k2 * 90, 0);
            this.setArrowRotation(b1, true)
        }

        //底部
        for (let i = 0; i < this._bottomCount; i++) {
            const p = evalute(i * 10, __position);

            const k1 = randomInt(0, 1);

            const b0 = instantiate(this.bottom);
            b0.parent = this._bottoms;
            b0.setPosition(p.x, -4 + randomFloat(-3, 0), p.y);
            const s = randomFloat(0.6, 1.2)
            b0.setScale(s, s, s)
            b0.setRotationFromEuler(0, k1 * 180, 0);
        }

        //桥
        for (let i = 0; i < this._bridgeCount; i++) {
            const p = evalute((i + 2) * 10, __position);

            const b0 = instantiate(this.bridge);
            b0.parent = this._bridges;
            b0.setPosition(p.x, randomInt(-1, 1) * 2.5, p.y);
        }

        //车(要避开桥)
        for (let i = 0; i < 20; i++) {
            // const index = randomInt(0, this.enemyCars.length - 1)
            const index = i >= 15 ? 1 : 0
            const car = this.enemyCars[index];
            const p = evalute(randomFloat(0, 100), __position);

            const data = new Car();
            this.refreshData(data)
            data.range = index === 0 ? 0.2 : 0.5;//不同的车碰撞球大小不同

            const ins = instantiate(car) as CarNode;
            ins.data = data;
            ins.parent = this._cars;
            ins.position.set(p.x, data.offset.x, data.offset.y + p.y);
        }

        building.active = false;
        this.enemyCars.forEach(v => v.active = false);
        director.on(EventType.OFFSET, this._offset)
    }
    
    onDestroy(): void {
        director.off(EventType.OFFSET, this._offset)
    }

    private _offset = () => {
        for (const b of this._buildings.children) {
            b.setPosition(b.position.x - 100, b.position.y, b.position.z)
        }
        this.buildingBox.setPosition(this.buildingBox.position.x - 100, this.buildingBox.position.y, this.buildingBox.position.z)

        for (const b of this._bridges.children) {
            b.setPosition(b.position.x - 100, b.position.y, b.position.z)
        }
        this.bridgeBox.setPosition(this.bridgeBox.position.x - 100, this.bridgeBox.position.y, this.bridgeBox.position.z)

        for (const b of this._bottoms.children) {
            b.setPosition(b.position.x - 100, b.position.y, b.position.z)
        }
        for (const c of this._cars.children) {
            c.setPosition(c.position.x - 100, c.position.y, c.position.z)
        }
    }

    start(): void {
        this._buildingBoxModel = this.buildingBox.children[0].getComponent(MeshRenderer).model
        this._bridgeBoxModel = this.bridgeBox.children[0].getComponent(MeshRenderer).model
    }

    refreshData(data: Car) {
        data.offset.set(randomFloats([[-4, -3.5], [-1.5, -1], [1, 1.5]]), randomFloat(-1, 1));
        data.speed = randomFloat(1, 5);
        data.reverse = randomBoolean()
    }

    setArrowRotation(buildingNode: Node, reverse: Boolean) {
        if (reverse) {
            buildingNode.getChildByName('arrow').setRotationFromEuler(0, 0, 180)
            buildingNode.getChildByName('arrow-001').setRotationFromEuler(-145.818, 92.176, 1.069)
        } else {
            buildingNode.getChildByName('arrow').setRotationFromEuler(0, 0, 0)
            buildingNode.getChildByName('arrow-001').setRotationFromEuler(-34.175, -87.098, 0)
        }
    }

    update(dt: number): void {
        dt = Math.min(0.033, dt);
        
        const { __position, __vec3 } = SceneManager;

        const ship = properties.ship;
        //房子
        let index = ship.far > 0 ? Math.floor(ship.far / 5) : 0;
        if (index !== this._index) {

            const children = this._buildings.children;
            const count = index - this._index;

            for (let i = this._index; i < this._index + count; i++) {
                const p = evalute((i + this._buildingCount) * 5, __position);

                const k1 = randomInt(0, 3);
                const k2 = k1 === 1 ? 0 : k1 === 3 ? 2 : randomInt(0, 3);

                const k = i % this._buildingCount;
                const b0 = children[k * 2];
                b0.setPosition(p.x - ship.offset, randomFloat(-5, 0), p.y - 4);
                b0.setRotationFromEuler(0, k1 * 90, 0);
                this.setArrowRotation(b0, false)

                const b1 = children[k * 2 + 1];
                b1.setPosition(p.x - ship.offset, randomFloat(-5, 0), p.y + 4);
                b1.setRotationFromEuler(0, k2 * 90, 0);
                this.setArrowRotation(b1, true)
            }

            this._index = index;
        }
        //房子碰撞检测，注意改变位置和检测碰撞不能在同一帧，飞船左右位置变化也要更新位置
        const boxIndex = (ship.far) % 5 > 2 ? index + 1 : index
        const p = evalute(ship.far, __position)
        const buildingNodeIndex = [boxIndex, ship.position.z > p.y ? 0 : 1]
        if (buildingNodeIndex[0] !== this._preBuildingBoxNodeIndex[0] || buildingNodeIndex[1] !== this._preBuildingBoxNodeIndex[1]) {
            const children = this._buildings.children;
            const node = children[buildingNodeIndex[1] === 1 ? boxIndex % this._buildingCount * 2 : boxIndex % this._buildingCount * 2 + 1]
            this.buildingBox.setPosition(node.position)
            this.buildingBox.setRotation(node.rotation)
            this._preBuildingBoxNodeIndex = buildingNodeIndex
        } else {
            geometry.Ray.fromPoints(this._ray, ship.position, __vec3.set(this.buildingBox.position.x,
                clamp(ship.position.y, this.buildingBox.position.y - 4, this.buildingBox.position.y + 6), this.buildingBox.position.z))//这里y轴对齐是为了让检测结果更准确
            const distanceToBuildingBox = geometry.intersect.rayModel(this._ray, this._buildingBoxModel)
            if (!distanceToBuildingBox) {
                director.emit(EventType.HIT, HitType.BUILDING)
            }
        }
        //底部
        for (const child of this._bottoms.children) {
            if (child.position.x < ship.position.x - 5) {
                const p = evalute(child.position.x + this._bottomCount * 10 + ship.offset, __position);
                child.setPosition(p.x - ship.offset, -4 + randomFloat(-3, 0), p.y);
            }
        }

        //桥
        for (const child of this._bridges.children) {
            if (child.position.x < ship.position.x - 5) {
                const p = evalute(child.position.x + this._bridgeCount * 10 + ship.offset, __position);
                child.setPosition(p.x - ship.offset, randomInt(-1, 1) * 2.5, p.y);
            }
        }

        //桥碰撞检测
        index = Math.floor((ship.far - 20) / 10) % this._bridgeCount;
        if (index >= 0) {
            // const p = evalute(ship.far, __position)
            if (index !== this._preBridgeBoxIndex) {
                const node = this._bridges.children[index];
                this.bridgeBox.setPosition(node.position)
                this._preBridgeBoxIndex = index
            } else {
                geometry.Ray.fromPoints(this._ray, ship.position, __vec3.set(this.bridgeBox.children[0].getWorldPosition()))
                const distanceTobridgeBox = geometry.intersect.rayModel(this._ray, this._bridgeBoxModel)
                if (!distanceTobridgeBox) {
                    director.emit(EventType.HIT, HitType.BRIDGE)
                }
            }
        }

        //车
        for (const node of this._cars.children as CarNode[]) {
            const data = node.data;
            const x = data.reverse ? node.position.x - data.speed * dt : node.position.x + data.speed * dt;
            const p = evalute(x + ship.offset, __position);

            if (x < ship.position.x - 5 || x > ship.position.x + 100) {
                const d = randomFloat(ship.position.x + 50, ship.position.x + 100);
                const p = evalute(d + ship.offset, __position);
                this.refreshData(data)
                __vec3.set(d, data.offset.x, data.offset.y + p.y)
                node.lookAt(__vec3)
                node.setPosition(__vec3)
            } else {
                __vec3.set(x, data.offset.x, data.offset.y + p.y)
                node.lookAt(__vec3)
                node.setPosition(__vec3)
            }
            //检测碰撞
            if (Vec3.distance(node.position, properties.ship.position) < data.range) {
                director.emit(EventType.HIT, HitType.CAR, new Vec3(properties.ship.position).subtract(node.position))
            }
        }
    }
}

