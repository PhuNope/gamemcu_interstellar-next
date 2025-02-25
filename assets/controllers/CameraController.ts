import { _decorator, Camera, clamp, Component, director, easing, Enum, lerp, tween, Vec3 } from "cc";
import { FreelookVirtualCamera } from "../cinestation/FreelookVirtualCamera";
import { StateManager } from "../datas/StateManager";
import { StateHandler } from "../datas/StateHandler";
import { Spherical } from "../cinestation/Spherical";
import { randomFloat } from "../utils/Math";
import { setFromSpherical } from "../cinestation/MathUtils";
import { properties } from "../datas/Properties";
import { Perlin } from "../utils/Perlin";
import { EventType, HitType } from "../datas/Enum";
import { killTweenOf } from "../utils/TweenUitls";
import { PipelineNextSettings } from "../pipeline-next/PipelineNextSettings";

const { ccclass, property, requireComponent } = _decorator;

type State = "preload" | "playShip" | "gameStart";

@ccclass('CameraController')
@requireComponent(Camera)
export class CameraController extends Component {
    private _camera: Camera = null;
    private _manager: StateManager<State> = new StateManager();
    private _freelookVirtualCamera: FreelookVirtualCamera = null;

    @property
    state: State = "playShip";

    onEnable(): void {
        if (this._freelookVirtualCamera) this._freelookVirtualCamera.enabled = false;
    }

    onDisable(): void {
        if (this._freelookVirtualCamera) this._freelookVirtualCamera.enabled = true;
    }

    onLoad(): void {
        this._camera = this.getComponent(Camera);
        this._freelookVirtualCamera = this.getComponent(FreelookVirtualCamera);
        this._manager.setStateHandler(new Preload({ target: this._camera }));
        this._manager.setStateHandler(new PlayShip({ target: this._camera }));
        this._manager.setStateHandler(new GameStart({ target: this._camera }));
        this._manager.state = this.state;
    }

    onDestroy(): void {
        this._manager.clear();
    }

    lateUpdate(dt: number): void {
        this._manager.update(dt);
    }
}

const initInfo = {
    fov: 45,
    near: 0.1,
    far: 100,
    phi: 1.5,
    theta: 0,
    radius: 1,
    lookAt: new Vec3(0.05, 0.48, 0),
}

const initInfo2 = {
    ...initInfo,
    phi: 1.5,
    theta: -0.3,
    radius: 1.88,
    lookAt: new Vec3(0.05, 0.36, 0),
}

class Preload extends StateHandler<Camera> {
    name: State = "preload";

    protected _lookAt: Vec3 = new Vec3();
    protected _spherical: Spherical = new Spherical(1, Math.PI / 2);

    onEnter(): void {
        this.init(initInfo);
    }

    init(info) {
        const camera = this.target;
        const spherical = this._spherical;

        camera.fov = info.fov
        camera.near = info.near;
        camera.far = info.far;

        spherical.phi = info.phi;
        spherical.theta = info.theta;
        spherical.radius = info.radius;
        this._lookAt.set(info.lookAt);

        camera.node.position = setFromSpherical(this._spherical, camera.node.position).add(this._lookAt);
        camera.node.lookAt(this._lookAt);
    }
}

class PlayShip extends Preload {
    name: State = "playShip";
    progress: number = 0;

    get intensity() {
        return PipelineNextSettings.Instance.base.intensity;
    }
    set intensity(v: number) {
        PipelineNextSettings.Instance.base.intensity = v;
    }

    onEnter(): void {
        if (properties.user.life > 0) {
            this.init(initInfo);
            killTweenOf(this);
            tween(this as any)
                .set({ progress: 0, intensity: 0 })
                .to(3.5, { progress: 1, intensity: 1 }, { easing: easing.quadOut })
                .start();
        }
        else {
            this.progress = 1;
            this.init(initInfo2);
        }
    }

    onUpdate(dt: any): void {
        dt = Math.min(0.033, dt);

        const { lookAtOffset } = properties.hand;

        const targetPhi = lerp(initInfo.phi, 1.5 + lookAtOffset.y * 0.03, this.progress);
        const targetTheta = lerp(initInfo.theta, -0.3 + lookAtOffset.x * 0.03, this.progress);
        const springLength = lerp(initInfo.radius, 1.88, this.progress);
        this._lookAt.y = lerp(initInfo.lookAt.y, 0.36, this.progress);

        const spherical = this._spherical;
        spherical.phi = lerp(spherical.phi, targetPhi, 5 * dt);
        spherical.theta = lerp(spherical.theta, targetTheta, 5 * dt);
        spherical.radius = lerp(spherical.radius, springLength, 5 * dt);

        const camera = this.target;
        camera.node.position = setFromSpherical(spherical, camera.node.position).add(this._lookAt);
        camera.node.lookAt(this._lookAt);
    }
}

class GameStart extends StateHandler<Camera> {
    static __offset = new Vec3();

    name: State = "gameStart";

    //镜头抖动
    enableShake: boolean = true;
    positionFrequency: number = 0.2;
    positionAmplitude: number = 0.1;
    positionScale: Vec3 = new Vec3(1, 1, 1);
    positionFractalLevel: number = 5;

    private _time: number[] = [];
    private _fbmNorm: number = 1 / 0.75;
    private _hitShakeOffset = 0

    private _position: Vec3 = new Vec3();
    private _lookAt: Vec3 = new Vec3(0.031, -0.036, -0.02);
    private _localOffset: Vec3 = new Vec3(0, -0.5, 0);
    private _lookAtOffset: Vec3 = new Vec3();
    private _spherical: Spherical = new Spherical(1, Math.PI / 2);
    private _offsetsmoothing: number = 2;

    rehash() {
        for (let i = 0; i < 6; i++) {
            this._time[i] = randomFloat(-10000, 0);
        }
    }

    onEnter(): void {
        this.rehash();
        this.target.near = 0.01;
        this.target.far = 120;
        this.target.fov = 73;
        director.on(EventType.HIT, this._onHit, this);
    }
    onExit(): void {
        director.off(EventType.HIT, this._onHit, this);
        killTweenOf(this);
    }

    private _onHit(hitType: HitType) {
        if (properties.user.life > 0) {
            switch (hitType) {
                case HitType.BUILDING:
                    this._hitShakeOffset = Math.max(1, this._hitShakeOffset)
                    break;
                case HitType.CAR:
                    this._hitShakeOffset = Math.max(1, this._hitShakeOffset)
                    break;
                case HitType.LASER:
                    this._hitShakeOffset = Math.max(0.5, this._hitShakeOffset)
                    break;
                case HitType.BRIDGE:
                    this._hitShakeOffset = Math.max(1, this._hitShakeOffset)
                    break;
                default:
                    break;
            }
        }

    }


    onUpdate(dt: any): void {
        dt = Math.min(0.033, dt);
        
        const { __offset } = GameStart;
        const ship = properties.ship;

        this._spherical.phi = 1.3 + ship.speedRatio.y * 1.5;
        this._spherical.theta = -1.57 + ship.speedRatio.z * 1.5;
        this._spherical.radius = 0.5;

        __offset.set(
            ship.speedRatio.x,
            clamp(ship.speedRatio.y, -0.2, 0.2) * 1.5,
            clamp(-ship.speedRatio.z * 0.3, -0.075, 0.075) * 1.5
        )

        this._localOffset.lerp(__offset, this._offsetsmoothing * dt);
        this._lookAtOffset.set(0, 0.1 + this._localOffset.y, -this._localOffset.z * 4)
        this._lookAt.set(ship.position).add(this._lookAtOffset);

        const camera = this.target;
        camera.node.position = setFromSpherical(this._spherical, this._position).add(this._lookAt);
        camera.node.lookAt(this._lookAt);

        //受到撞击，镜头会增加晃动
        this._hitShakeOffset = lerp(this._hitShakeOffset, 0, dt * 1.5)
        this.positionFrequency = ship.speedRatio.x + this._hitShakeOffset
        this.positionAmplitude = 0.02 + this._hitShakeOffset

        if (this.enableShake) {
            for (let i = 0; i < 3; i++) {
                this._time[i] += this.positionFrequency * dt;
            }
            let n = __offset.set(
                Perlin.Fbm(this.positionFractalLevel, this._time[0]),
                Perlin.Fbm(this.positionFractalLevel, this._time[1]),
                Perlin.Fbm(this.positionFractalLevel, this._time[2]),
            );
            n = n.multiply(this.positionScale);
            n.multiplyScalar(this.positionAmplitude * this._fbmNorm);
            camera.node.position = camera.node.position.add(n);
        }
    }
}
