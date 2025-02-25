import { _decorator, Component, director, instantiate, Material, Node, Quat, tween, Vec2, Vec3, Vec4, Animation, Color, lerp } from 'cc';
import { properties } from '../datas/Properties';
import { evalute, pointToLineDistance, randomFloat, randomFloats, randomInt } from '../utils/Math';
import { EventType, HitType } from '../datas/Enum';
import { killTweenOf } from '../utils/TweenUitls';
import { audioSystem } from '../systems/AudioSystem';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {
    static __vec3 = new Vec3();
    static __position = new Vec2();
    static __quat = new Quat()

    @property(Node)
    enemy: Node = null;

    @property(Material)
    laserMaterial: Material = null

    @property(Material)
    enemyMaterial: Material = null

    @property(Animation)
    warnning: Animation = null

    private _enemys: Node = new Node();
    private _tmpNode = new Node()

    onLoad(): void {
        const { enemy } = this;
        const { __vec3 } = EnemyManager
        const parent = enemy.parent;
        this._enemys.parent = parent;

        //生成所有的小飞机，最多3个
        for (let i = 0; i < 3; i++) {
            const e = instantiate(enemy)
            e.position = __vec3.set(0, 0, 10000)
            this._enemys.addChild(e)
        }
    }

    onDestroy(): void {
        killTweenOf(this);
        audioSystem.stop();
    }

    start(): void {
        let pingpong = false;
        const col0 = new Vec4(1, 0.2, 0.2, 1)
        const col1 = new Vec4(0x5A, 0xC3, 0xFF, 0xFF).multiplyScalar(1 / 255)
        const col3 = new Color().fromHEX(0xff0000);
        const col4 = new Color().fromHEX(0x0C88FC);
        //每15秒让小飞机攻击玩家
        tween(this)
            .delay(15)
            .call(() => {
                pingpong = !pingpong
                this.laserMaterial.setProperty('mainColor', pingpong ? col0 : col1)
                this.laserMaterial.setProperty('scale', pingpong ? 20 : 10);
                this.enemyMaterial.setProperty("emissiveColor", pingpong ? col3 : col4);
                //根据速度，选出几个开始执行
                // const n = Math.min(Math.max(Math.floor(properties.ship.speedRatio.x * 4.5), 1), 3)
                const s = properties.user.score
                // const n = s < 5000 ? 1 : s < 10000 ? 2 : 3;
                const n = s < 5000 ? randomInt(1, 2) : randomInt(2, 3)
                for (let i = 0; i < n; i++) {
                    this.runAction(this._enemys.children[i], i == 0)
                }

            })
            .union()
            .repeat(Infinity)
            .start()
    }

    runAction(node: Node, first: Boolean) {
        const { __vec3, __position, __quat } = EnemyManager
        // const shipPos = properties.ship.position
        //找到随机xy偏移
        const ZOffset = randomFloat(-1, 1)
        // const YOffset = shipPos.y < -2.5 ? randomFloat(-4, -3.5) : shipPos.y < 0 ? randomFloat(-1.5, -1) : randomFloat(1, 1.5)
        const YOffset = randomFloat(-0.5, 0.5)
        node.position = __vec3.set(properties.ship.position.x - 5, 0, 0)//设置位置在玩家后方
        const originalQuat = new Quat()
        Quat.rotateY(originalQuat, originalQuat, -Math.PI / 2)
        const light = node.getChildByName("lightline")
        const offsetTime = Math.random()
        const ship = properties.ship
        tween(this)
            .delay(0.2 + offsetTime)
            .call(() => {
                if (first) {
                    this.warnning.play()
                    audioSystem.play("audios/warning");
                }
            })
            .start()
        tween(this)
            .delay(0.3 + offsetTime)
            .call(() => {
                node.rotation = originalQuat; light.scale = __vec3.set(1, 1, 0)
            })
            .to(1.5, {}, {
                onUpdate: (obj, ratio) => {//从玩家后方移动到前面
                    const x = 6 * ratio - 1
                    const p = evalute(ship.position.x + x + ship.offset, __position);
                    const z = ZOffset + p.y
                    const y = lerp(node.position.y, ship.position.y + YOffset, 0.1)
                    node.position = __vec3.set(ship.position.x + x, y, z)
                }
            })
            .call(() => {
                audioSystem.play("audios/enemy", 1, false, false);
            })
            .to(1.55, {}, {
                onUpdate: (obj, ratio) => {//转向玩家
                    const p = evalute(ship.position.x + 5 + ship.offset, __position);
                    const z = ZOffset + p.y
                    const y = lerp(node.position.y, ship.position.y + YOffset, 0.1)
                    node.position = __vec3.set(ship.position.x + 5, y, z)
                    this._tmpNode.position = __vec3
                    this._tmpNode.lookAt(ship.position)
                    const dir = this._tmpNode.rotation
                    __quat.set(node.rotation)
                    __quat.slerp(dir, ratio)
                    node.rotation = __quat
                }
            })
            .to(0.2, {}, {
                onUpdate: (obj, ratio) => {//发射激光
                    const p = evalute(ship.position.x + 5 + ship.offset, __position);
                    const z = ZOffset + p.y
                    node.position = __vec3.set(ship.position.x + 5,
                        node.position.y, z)
                    const lightLen = 20 * ratio
                    light.scale = __vec3.set(1, 1, lightLen)
                    this.hitCheck(node, lightLen)
                }
            })
            .to(3.5, {}, {
                onUpdate: (obj, ratio) => {//渐渐跑到玩家后面,//朝着玩家行进的地方进行扫射
                    const x = 5 - 6 * ratio
                    const p = evalute(ship.position.x + x + ship.offset, __position);
                    const z = ZOffset + p.y
                    node.position = __vec3.set(ship.position.x + x,
                        node.position.y, z)

                    this._tmpNode.position = __vec3
                    this._tmpNode.lookAt(ship.position)
                    const dir = this._tmpNode.rotation
                    __quat.set(node.rotation)
                    __quat.slerp(dir, 0.03)
                    node.rotation = __quat
                    this.hitCheck(node, 20)
                }
            })
            .call(() => {
                node.position = __vec3.set(-100, 0, 0)
            })
            .start()
    }

    hitCheck(node: Node, len: number) {
        const A = node.position
        const B = node.forward.multiplyScalar(len).add(node.position)
        const distance = pointToLineDistance(properties.ship.position, A, B)
        if (distance < 0.1) {
            director.emit(EventType.HIT, HitType.LASER)
        }
    }
}

