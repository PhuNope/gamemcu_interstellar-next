import { _decorator, Component, EventMouse, EventTouch, Input, input, Node, Quat, Vec2, Vec3, find, sys, view, Animation, AnimationClip, tween, easing, MeshRenderer, Material, TweenSystem, director, clamp } from 'cc';
import { Perlin } from '../utils/Perlin';
import { randomFloat } from '../utils/Math';
import { properties } from '../datas/Properties';
import { initParticleMesh } from '../utils/MeshUtils';
import { killTweenOf } from '../utils/TweenUitls';
import { EventType } from '../datas/Enum';
const { ccclass, property } = _decorator;

const weights0 = [
    [-2, 0.0, 0.2, 0.0, 0, 4],
    [-4, 0.0, 0.0, 0.0, 0.0, 1],
    [0, -2, 0.0, 0.0, 0.0, -4]
]

enum State {
    NONE,
    RESET,
    START,
    ENTER,
    LEAVE,
}

const leaveInfo = {
    targetEulers: [
        new Vec3(170, -179, 33),
        new Vec3(126, 120, -71),
        new Vec3(3.83, -0.58, -9.6)
    ],
    initEulers: [
        new Vec3(170, -180, 20),
        new Vec3(126, 120, -71),
        new Vec3(3.83, -1.77, 8.3)
    ]
}

class ShipTween {
    private _material: Material;

    sync: number = 0;
    noise: number = 1;

    get progress() {
        return this._material.getProperty("progress", 0) as number;
    }
    set progress(v: number) {
        this._material.setProperty("progress", v, 0);
    }

    constructor(ship: Node) {
        const renderer = ship.getComponentInChildren(MeshRenderer);
        renderer.mesh = properties.shipParticleMesh || initParticleMesh(renderer.mesh);
        this._material = renderer.sharedMaterial;
    }
}

class HandTween {
    private _material: Material;

    constructor(hand: Node) {
        this._material = hand.getComponentInChildren(MeshRenderer).sharedMaterial;
        this.indirectIntensity = 0.3;
    }

    get indirectIntensity() {
        return this._material.getProperty("indirectIntensity", 0) as number;
    }
    set indirectIntensity(v: number) {
        this._material.setProperty("indirectIntensity", v, 0);
    }
}

@ccclass('HandController')
export class HandController extends Component {
    static __loc0 = new Vec2();
    static __delta = new Vec2();
    static __euler = new Vec3();
    static __normal = new Vec3();
    static __position = new Vec3();
    static __rotation = new Quat();
    static __offset = new Vec3();

    private _animation: Animation = null;
    private _armSkeletons: Node[] = [];
    private _targetScales: Vec3[] = [new Vec3(2, 2, 2), new Vec3(), new Vec3(-8, -8, -8)];
    private _targetSkeletons: number[] = [0, 1, 2];
    private _targetEulers: Vec3[] = [new Vec3(), new Vec3(), new Vec3()];
    private _targetOffsets: Vec3[] = [new Vec3(), new Vec3(), new Vec3()];
    private _targetCenters: Vec3[] = [new Vec3(), new Vec3(), new Vec3()];
    private _currEulers: Vec3[] = [new Vec3(), new Vec3(), new Vec3()];
    private _initialEulers: Vec3[] = [new Vec3(), new Vec3(), new Vec3()];
    private _totalDelta: Vec2 = new Vec2();
    private _time: number[] = [];
    private _preLoc0 = new Vec2();
    private _button: number = -1;
    private _state: State = State.NONE;
    private _shipTween: ShipTween;
    private _handTween: HandTween;

    @property(Node)
    ship: Node = null;

    @property(Node)
    target: Node = null;

    onLoad(): void {
        this._initSkeleton();
        this._initTargetEulers();
        this._initSkeltonRotations();
        this._initTimes();
        this._animation = this.getComponent(Animation);
        this._shipTween = new ShipTween(this.ship);
        this._handTween = new HandTween(this.node);
        this._disable();
        director.on(EventType.LEAVE, this._leaveScene, this);
    }

    onDestroy(): void {
        killTweenOf(this._handTween);
        killTweenOf(this._shipTween);
        director.off(EventType.LEAVE, this._leaveScene, this);

    }

    private _enable() {
        input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
    }

    private _disable() {
        input.off(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
    }

    start(): void {
        this._initAnimation();
        this._enterScene();
    }

    private _initAnimation() {
        this._animation.play("leave");
        const state = this._animation.getState("leave");
        state.setTime(state.duration);
    }

    private _enterScene() {
        killTweenOf(this._handTween);
        killTweenOf(this._shipTween);

        tween(this._shipTween)
            .set({ sync: 0, noise: 1 })
            .to(3, { noise: 0 })
            .to(2, { sync: 1, noise: 1 })
            .start()

        tween(this._shipTween)
            .set({ progress: 2 })
            .to(4, { progress: 0 }, { easing: easing.quadInOut })
            .start();

        tween(this._shipTween)
            .delay(1.2)
            .call(() => {
                this._state = State.START;
            })
            .delay(1)
            .call(() => {
                this._state = State.ENTER;
                this._animation.play("enter");

                killTweenOf(this._handTween)
                tween(this._handTween)
                    .delay(2)
                    .call(() => this._enable())
                    .start();
                tween(this._handTween)
                    .delay(1)
                    .to(0.5, { indirectIntensity: 1 })
                    .start();
            })
            .start();
    }

    private _leaveScene() {
        this._state = State.LEAVE;
        this._animation.play("leave");
        this._shipTween.sync = 0;

        this._disable();

        killTweenOf(this._shipTween);
        killTweenOf(this._handTween)

        tween(this._shipTween)
            .set({ progress: 0 })
            .to(3, { progress: 2 }, { easing: easing.quadInOut })
            .start();

        tween(this._handTween)
            .to(0.5, { indirectIntensity: 0.3 })
            .start();
    }

    private _initSkeleton() {
        const hand = find("hand.003", this.node);
        const skeletalNames = [
            "upper_arm.R",
            "upper_arm.R/forearm.R",
            "upper_arm.R/forearm.R/hand.R",
            "upper_arm.R/forearm.R/hand.R/palm.01.R/f_index.01.R",
            "upper_arm.R/forearm.R/hand.R/palm.01.R/f_index.01.R/f_index.02.R",
            "upper_arm.R/forearm.R/hand.R/palm.01.R/thumb.01.R",
            "upper_arm.R/forearm.R/hand.R/palm.02.R/f_middle.01.R",
            "upper_arm.R/forearm.R/hand.R/palm.02.R/f_middle.01.R/f_middle.02.R",
            "upper_arm.R/forearm.R/hand.R/palm.03.R/f_ring.01.R",
            "upper_arm.R/forearm.R/hand.R/palm.03.R/f_ring.01.R/f_ring.02.R",
            "upper_arm.R/forearm.R/hand.R/palm.04.R/f_pinky.01.R",
            "upper_arm.R/forearm.R/hand.R/palm.04.R/f_pinky.01.R/f_pinky.02.R"
        ]
        skeletalNames.forEach((v, i) => {
            this._armSkeletons[i] = find(v, hand);
        })
    }

    private _initTargetEulers() {
        this._targetSkeletons.forEach((v, i) => {
            const euler = this._armSkeletons[v].eulerAngles;
            this._currEulers[i].set(euler)
            this._targetEulers[i].set(euler);
            this._initialEulers[i].set(euler);
        })
    }

    private _initSkeltonRotations() {
        const { __euler, __rotation } = HandController;
        this._targetSkeletons.forEach((v, i) => {
            __euler.set(leaveInfo.initEulers[i]);
            this._targetEulers[i].set(__euler);
            this._armSkeletons[v].rotation = Quat.fromEuler(__rotation, __euler.x, __euler.y, __euler.z);
        })
    }

    private _initTimes() {
        for (let i = 0; i < 3; i++) {
            this._time[i] = randomFloat(-10000, 0);
        }
        properties.hand.lookAtOffset.set(0, 0, 0);
    }

    update(dt: any): void {
        const { __position, __rotation, __euler, __normal, __offset } = HandController;

        const hand = properties.hand;
        const currEulers = this._currEulers;
        const targetScales = this._targetScales;
        const targetEulers = this._targetEulers;
        const initialEulers = this._initialEulers;
        const targetOffsets = this._targetOffsets;
        const targetCenters = this._targetCenters;
        const targetSkeletons = this._targetSkeletons;
        const armSkeletons = this._armSkeletons;

        const frequency = 0.2;
        const fractalLevel = 3;

        dt = Math.min(0.033, dt);
        
        for (let i = 0; i < 3; i++) {
            this._time[i] += frequency * dt;
        }

        const n = __normal.set(
            Perlin.Fbm(fractalLevel, this._time[0]),
            Perlin.Fbm(fractalLevel, this._time[1]),
            Perlin.Fbm(fractalLevel, this._time[2]),
        )

        n.multiply3f(1, 1, 2).multiplyScalar(this._shipTween.noise);

        targetSkeletons.forEach((v, i) => {
            const skeleton = armSkeletons[v];
            const targetOffset = targetOffsets[i];
            const targetCenter = targetCenters[i];
            const targetEuler = targetEulers[i];

            switch (this._state) {
                case State.RESET:
                    targetEuler.lerp(initialEulers[i], 3 * dt);
                    targetCenter.lerp(Vec3.ZERO, 5 * dt);
                    hand.lookAtOffset.lerp(Vec3.ZERO, 2 * dt);
                    break;
                case State.START:
                    targetEuler.lerp(leaveInfo.targetEulers[i], 1.5 * dt);
                    break;
                case State.ENTER:
                    targetEuler.lerp(initialEulers[i], 1.5 * dt);
                    targetCenter.lerp(Vec3.ZERO, 2.5 * dt);
                    hand.lookAtOffset.lerp(Vec3.ZERO, 1 * dt);
                    break;
                case State.LEAVE:
                    targetEuler.lerp(leaveInfo.targetEulers[i], 1.5 * dt);
                    targetCenter.lerp(Vec3.ZERO, 2.5 * dt);
                    hand.lookAtOffset.lerp(Vec3.ZERO, 1 * dt);
                    break;
            }

            targetOffset.lerp(targetCenter, 10 * dt);

            __offset.set(n).multiply(targetScales[i]);
            __euler.set(targetEuler).add(targetOffset).add(__offset);

            const euler = currEulers[i].lerp(__euler, 20 * dt);
            Quat.fromEuler(__rotation, euler.x, euler.y, euler.z);
            skeleton.rotation = skeleton.rotation.slerp(__rotation, 10 * dt);
        })

        if (this._state === State.RESET) {
            this._totalDelta.lerp(Vec2.ZERO, 3 * dt);
        }

        if (this.ship && this.target) {
            this.ship.worldPosition = __position.set(this.ship.worldPosition).lerp(this.target.worldPosition, this._shipTween.sync);
            this.ship.worldRotation = __rotation.set(this.ship.worldRotation).slerp(this.target.worldRotation, this._shipTween.sync);
        }

    }

    private _onMouseDown(e: EventMouse) {
        this._button = e.getButton();
        e.getUILocation(this._preLoc0);
        this._state = State.NONE;
    }

    private _onMouseUp(e: EventMouse) {
        this._button = -1;
        this._state = State.RESET;
    }

    private _onMouseMove(e: EventMouse) {
        const { __loc0 } = HandController;
        e.getUILocation(__loc0);
        this._setTargets(__loc0, this._preLoc0);
        this._preLoc0.set(__loc0);
    }

    private _onTouchStart(e: EventTouch) {
        if (!sys.isMobile) return;
        this._button = 0;
        this._state = State.NONE;
        e.getAllTouches()[0].getUILocation(this._preLoc0);
    }

    private _onTouchEnd(e: EventTouch) {
        if (!sys.isMobile) return;
        this._button = -1;
        this._state = State.RESET;
    }

    private _onTouchMove(e: EventTouch) {
        if (!sys.isMobile) return;
        const { __loc0 } = HandController;
        e.getAllTouches()[0].getUILocation(__loc0);
        this._setTargets(__loc0, this._preLoc0);
        this._preLoc0.set(__loc0);
    }

    private _setTargets(loc0: Vec2, loc1: Vec2) {
        if (this._button === 0) {
            this._setTargetDelta(this._calcDelta(loc0, loc1));
        }
    }

    private _calcDelta(loc0: Vec2, loc1: Vec2, out: Vec2 = HandController.__delta) {
        const size = view.getVisibleSize();
        out.set(loc0).subtract(loc1).multiplyScalar(15 / size.height);
        return out;
    }

    private _setTargetDelta(delta: Vec2, weights: number[][] = weights0) {
        let { x, y } = this._totalDelta;

        let x1 = this._totalDelta.x = clamp(x + delta.x, -10, 3);
        let y1 = this._totalDelta.y = clamp(y + delta.y, -3, 1.5);
        let dx = x1 - x;
        let dy = y1 - y;

        this._targetEulers.forEach((v, i) => {
            const w = weights[i];
            v.x += dx * w[0];
            v.y += dx * w[1];
            v.z += dx * w[2];
        });
        this._targetCenters.forEach((v, i) => {
            const w = weights[i];
            v.x += dy * w[3];
            v.y += dy * w[4];
            v.z += dy * w[5];
        });
        properties.hand.lookAtOffset.add3f(-dx, dy, 0);
    }

}