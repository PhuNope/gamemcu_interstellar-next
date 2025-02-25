import { _decorator, AudioClip, AudioSource, clamp, Component, director, easing, EventKeyboard, EventTouch, Input, input, lerp, Mat4, Material, MeshRenderer, Node, ParticleSystem, Quat, sys, tween, Vec2, Vec3 } from 'cc';
import { properties } from '../datas/Properties';
import { EventType, HitType } from '../datas/Enum';
import { evalute } from '../utils/Math';
import { PipelineNextSettings } from '../pipeline-next/PipelineNextSettings';
import { killTweenOf } from '../utils/TweenUitls';
import { audioSystem } from '../systems/AudioSystem';
import { initParticleMesh } from '../utils/MeshUtils';
const { ccclass, property } = _decorator;

class ShipTween {
    material: Material;
    sync: number = 0;
    noise: number = 1;

    get progress() {
        return this.material.getProperty("progress", 0) as number;
    }
    set progress(v: number) {
        this.material.setProperty("progress", v, 0);
    }

    sweepLight(v: number) {
        this.material.setProperty("sweepThreshold", v * 2 % 1);
        this.material.setProperty("sweepIntensity", v);
    }

    constructor(ship: Node) {
        const renderer = ship.getComponentInChildren(MeshRenderer);
        renderer.mesh = properties.shipParticleMesh || initParticleMesh(renderer.mesh);
        this.material = renderer.sharedMaterial;
        this.progress = 0;
        this.sweepLight(0);
    }
}

@ccclass('ShipController')
export class ShipController extends Component {
    static __loc = new Vec2();
    static __diff = new Vec2();
    static __dir2 = new Vec2();

    static __offset = new Vec3();
    static __position = new Vec2();
    static __vec2_0 = new Vec2();
    static __vec2_1 = new Vec2();

    private _yaw: number = 0;
    private _roll: number = 0;
    private _pitch: number = 0;
    private _targetSpeed: Vec3 = new Vec3();
    private _protectOffset: Vec2 = new Vec2();//回弹
    private _invincible = false//但受到伤害时需要无敌一小段时间，防止多次扣血
    private _invincibleTime = 0.5
    private _speed: Vec3 = new Vec3();
    private _direction: Vec2 = new Vec2();
    private _intensity: number = 1;
    private _shipTween: ShipTween = null;
    private _hitTween: {} = {};
    private _preloc: Vec2 = new Vec2();

    @property(Material)
    lenflareMaterial: Material = null
    @property(Material)
    shiptrailMaterial01: Material = null
    @property(Material)
    shiptrailMaterial02: Material = null
    @property(ParticleSystem)
    trailParticle01: ParticleSystem = null
    @property(ParticleSystem)
    trailParticle02: ParticleSystem = null

    onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
        input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        director.on(EventType.HIT, this._onHit, this);
        director.on(EventType.GET, this._onGet, this);
    }

    onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
        director.off(EventType.HIT, this._onHit, this);
        director.off(EventType.GET, this._onGet, this);
        audioSystem.stop();
    }

    setTrailIntensity(v: number) {
        this.lenflareMaterial.setProperty('intensity', v)
        this.shiptrailMaterial01.setProperty('intensity', v);
        this.shiptrailMaterial02.setProperty('intensity', v);
    }

    onLoad(): void {
        this._shipTween = new ShipTween(this.node);
        tween(this)
            .to(2, {}, {
                onUpdate: (_, radio) => {
                    this.setTrailIntensity(radio);
                }
            })
            .start();
    }

    onDestroy(): void {
        killTweenOf(this);
        killTweenOf(this._hitTween);
        killTweenOf(this._shipTween);
    }


    private _onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case 65:
            case 37: this._direction.x = -1; break;
            case 87:
            case 38: this._direction.y = 1; break;
            case 40:
            case 83: this._direction.y = -1; break;
            case 68:
            case 39: this._direction.x = 1; break;
        }

        if (this._direction.x * properties.ship.speed.z < 0) {
            audioSystem.play("audios/roll");
        }

        this._intensity = this._direction.lengthSqr() > 0.01 ? 1 : 0;
    }

    private _onKeyUp(e: EventKeyboard) {
        switch (e.keyCode) {
            case 65:
            case 37: if (this._direction.x < 0) this._direction.x = 0; break;
            case 87:
            case 38: if (this._direction.y > 0) this._direction.y = 0; break;
            case 40:
            case 83: if (this._direction.y < 0) this._direction.y = 0; break;
            case 68:
            case 39: if (this._direction.x > 0) this._direction.x = 0; break;
        }

        this._intensity = this._direction.lengthSqr() > 0.01 ? 1 : 0;
    }

    private _touchID: number = -1;
    private _touchDiff: Vec2 = new Vec2();

    private _onTouchStart(e: EventTouch) {
        if (!sys.isMobile) return;
        if (this._touchID === -1) {
            this._touchID = e.touch.getID();
            this._touchDiff.set(0, 0);
            e.touch.getUILocation(this._preloc);
        }
    }

    private _onTouchMove(e: EventTouch) {
        if (!sys.isMobile) return;
        if (this._touchID === e.touch.getID()) {
            const { __loc, __diff } = ShipController;

            e.touch.getUILocation(__loc);

           __diff.set(__loc).subtract(this._preloc);

            if (__diff.x * this._touchDiff.x < 0) {
                this._touchDiff.x *= 0.9;
            }
            if (__diff.y * this._touchDiff.y < 0) {
                this._touchDiff.y *= 0.9;
            }

            this._touchDiff.add(__diff)
            this._preloc.set(__loc);

            let length = this._touchDiff.length();
            this._intensity = Math.min(1, length / 30);
            this._direction.set(this._touchDiff).normalize().multiplyScalar(this._intensity);

            if (this._direction.x * properties.ship.speed.z < 0) {
                audioSystem.play("audios/roll");
            }

        }
    }

    private _onTouchEnd(e: EventTouch) {
        if (!sys.isMobile) return;
        if (this._touchID === e.touch.getID()) {
            this._touchID = -1;
            this._direction.set(0, 0);
            this._intensity = 0;
        }
    }

    update(dt: any): void {
        const { __offset, __vec2_0, __vec2_1, __position } = ShipController;

        const speed = this._speed;
        const ship = properties.ship;

        dt = Math.min(0.033, dt);

        speed.x = clamp(speed.x + dt / 35, 0, 20);//最高速度20,8分钟完成加速
        if (speed.x < 4) speed.x += dt

        //life控制
        properties.user.life = Math.max(0, properties.user.life - speed.x * dt / 2);

        if (properties.user.life === 0) this._endGame();
        else properties.user.score += speed.x * dt * 10

        const xRatio = ship.speedRatio.x
        speed.y = this._direction.y * 10 * xRatio;
        speed.z = this._direction.x * 10 * xRatio;
        this._targetSpeed.lerp(speed, 5 * dt);

        if (sys.isMobile) {
            ship.speed.x = lerp(ship.speed.x, this._targetSpeed.x, 5 * dt)
            ship.speed.y = lerp(ship.speed.y, speed.y, 3 * dt)
            ship.speed.z = lerp(ship.speed.z, speed.z, 3 * dt)
        } else {
            ship.speed.lerp(this._targetSpeed, this._intensity ? 5 * dt : 6 * dt);
        }

        ship.speedRatio.set(ship.speed).multiplyScalar(0.05);
        __offset.set(ship.speed).multiplyScalar(dt)
        ship.far += __offset.x
        ship.position.add(__offset);

        //位置重置处理
        if (ship.position.x > 100) {
            ship.offset += 100
            ship.position.x -= 100
            director.emit(EventType.OFFSET)
            this.trailParticle01.stop()
            this.trailParticle01.play()
            this.trailParticle02.stop()
            this.trailParticle02.play()
        }

        const targetYaw = this._direction.x * -50 * xRatio;
        const targetRoll = this._direction.x * 45;
        const targetPitch = this._direction.y * 50 * xRatio;

        this._yaw = lerp(this._yaw, targetYaw, 4 * dt);
        this._roll = lerp(this._roll, targetRoll, 4 * dt);
        this._pitch = lerp(this._pitch, targetPitch, 4 * dt);

        Quat.fromEuler(ship.rotation, this._roll, this._yaw, this._pitch);

        //回弹机制
        __vec2_0.set(this._protectOffset)
        this._protectOffset.lerp(__vec2_1.set(0, 0), 10 * dt)
        const _pdOffset = __vec2_0.subtract(this._protectOffset)
        ship.position.add3f(0, _pdOffset.x, _pdOffset.y)

        //移动区间钳制
        const p = evalute(ship.far, __position)
        ship.position.z = clamp(ship.position.z, p.y - 3, p.y + 3)
        ship.position.y = clamp(ship.position.y, -4, 1.5)

        this.node.rotation = ship.rotation;
        this.node.position = ship.position;
        // this.node.position = new Vec3(ship.position.x%100,ship.position.y,ship.position.z)

        PipelineNextSettings.Instance.tonemap.damage = lerp(PipelineNextSettings.Instance.tonemap.damage, 0, dt * 2)
    }

    private _onHit(hitType: HitType, dir: Vec3) {
        const { __position, __offset } = ShipController
        const ship = properties.ship;
        //碰撞，回弹并无敌一小段时间
        if (!this._invincible) {
            let damage = 0
            switch (hitType) {
                case HitType.BUILDING:
                    audioSystem.play('audios/hitdamage')
                    this._protectOffset.y = (evalute(ship.far, __position).y - ship.position.z) * 0.8
                    damage = 20
                    break;
                case HitType.CAR:
                    audioSystem.play('audios/hitdamage')
                    if (dir) {
                        __offset.set(0, dir.y, dir.z).normalize()
                        __offset.multiplyScalar(0.5)
                        this._protectOffset.set(__offset.y, __offset.z)
                    }
                    damage = 20
                    break;
                case HitType.LASER:
                    audioSystem.play('audios/beamdamage')
                    damage = 10
                    break;
                case HitType.BRIDGE:
                    audioSystem.play('audios/hitdamage')
                    this._protectOffset.x = 1
                    damage = 20
                    break;
                default:
                    break;
            }
            PipelineNextSettings.Instance.tonemap.damage = 1

            this._invincible = true
            killTweenOf(this._hitTween);
            tween(this._hitTween)
                .delay(this._invincibleTime)
                .call(() => { this._invincible = false })
                .start();
            tween(this._hitTween)
                .call(() => {
                    this.setTrailIntensity(0);
                })
                .to(1, {}, {
                    onUpdate: (obj, radio) => {
                        this.setTrailIntensity(radio);
                    }
                })
                .start();

            if (properties.user.life - damage < 0) {
                properties.user.life = 0
                this._endGame();
            } else {
                properties.user.life -= damage
            }
        }
    }
    private _onGet() {
        audioSystem.play('audios/pickup')
        properties.user.life = clamp(properties.user.life + 4, 0, 100);

        killTweenOf(this._shipTween);
        tween(this._shipTween)
            .to(1.6, {}, {
                onUpdate: (obj, ratio) => {
                    this._shipTween.sweepLight(1 - ratio);
                }
            })
            .start()
    }

    private _isEnd = false
    private _endGame() {
        if (!this._isEnd) {
            this._isEnd = true
            this.enabled = false

            killTweenOf(this._hitTween);
            this.setTrailIntensity(0);

            killTweenOf(this._shipTween);
            tween(this._shipTween)
                .set({ progress: 0 })
                .to(3, { progress: 2 }, { easing: easing.quadInOut })
                .start();
            this.scheduleOnce(() => {
                audioSystem.stopBGM(true);
            }, 2)
            director.emit(EventType.GAMEEND);
        }
    }
}