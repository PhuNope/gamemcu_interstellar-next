import { _decorator, Camera, clamp, EventMouse, EventTouch, Input, input, Quat, sys, toRadian, Vec2, Vec3, view } from 'cc';
import { FInterpTo, setFromMatrixColumn, setFromSpherical, VInterpTo } from './MathUtils';
import { Spherical } from './Spherical';
import { VirtualCamera } from './VirtualCamera';
const { ccclass, property, requireComponent } = _decorator;

const { abs, tan } = Math;
const ESP = 0.001;

@ccclass('FreelookVirtualCamera')
@requireComponent(Camera)
export class FreelookVirtualCamera extends VirtualCamera {
    static __loc0 = new Vec2();
    static __loc1 = new Vec2();
    static __center = new Vec2();
    static __preCenter = new Vec2();
    static __panDelta = new Vec2();
    static __panTarget = new Vec2();
    static __rotateDelta = new Vec2();
    static __offset = new Vec3();
    static __xAxis = new Vec3();
    static __yAxis = new Vec3();
    static __spherical = new Spherical();
    static __forward = new Vec3();

    private _active: boolean = false;
    private _targetTheta: number = 0;
    private _targetPhi: number = 0;
    private _targetSpringLength: number = 4;
    private _tempSmoothing: number = 6;
    private _tempRotateSmoothing: number = 8;

    private _button: number = -1;
    private _touchID: number = -1;
    private _preLoc0: Vec2 = new Vec2();
    private _preLoc1: Vec2 = new Vec2();

    @property(Spherical)
    private _spherical: Spherical = new Spherical(4, Math.PI / 2);

    @property
    private _lookAt: Vec3 = new Vec3();
    private _targetLookAt: Vec3 = new Vec3();
    private _targetFov: number = this.lens.fov;
    private _targetNear: number = this.lens.near;
    private _targetFar: number = this.lens.far;
    private _camera: Camera = null;

    @property
    get lookAt() {
        return this._lookAt;
    }
    set lookAt(v: Vec3) {
        this._lookAt.set(v);
        this._targetLookAt.set(v);
    }

    @property
    get near() {
        return this.lens.near;
    }
    set near(v: number) {
        this.lens.near = this._targetNear = v;
    }

    @property
    get far() {
        return this.lens.far;
    }
    set far(v: number) {
        this.lens.far = this._targetFar = v;
    }

    @property
    get fov() {
        return this.lens.fov;
    }
    set fov(v: number) {
        this.lens.fov = this._targetFov = v;
    }

    @property
    get springLength() {
        return this._spherical.radius;
    }
    set springLength(v: number) {
        this._spherical.radius = this._targetSpringLength = v;
    }

    @property
    get theta() {
        return this._spherical.theta;
    }
    set theta(v: number) {
        this._spherical.theta = this._targetTheta = v;
    }

    @property
    get phi() {
        return this._spherical.phi;
    }
    set phi(v: number) {
        this._spherical.phi = this._targetPhi = v;
    }

    @property({ group: "set", step: 0.01 })
    thetaMin: number = -1000000;

    @property({ group: "set", step: 0.01 })
    thetaMax: number = 1000000;

    @property({ group: "set", step: 0.01 })
    phiMin: number = ESP;

    @property({ group: "set", step: 0.01 })
    phiMax: number = Math.PI - ESP;

    @property({ group: "set", step: 0.01 })
    distanceMin: number = ESP;

    @property({ group: "set", step: 0.01 })
    distanceMax: number = 1000000;

    @property({ group: "set" })
    rotateSmoothing: number = 8;

    @property({ group: "set" })
    rotateSpeed: number = 1;

    @property({ group: "set" })
    panSpeed: number = 1;

    @property({ group: "set" })
    forbidX: boolean = false;

    @property({ group: "set" })
    forbidY: boolean = false;

    @property({ group: "set" })
    forbidPanX: boolean = false;

    @property({ group: "set" })
    forbidPanY: boolean = false;

    @property({ group: "set" })
    forbidZ: boolean = false;

    get active() {
        return this._active;
    }
    set active(v: boolean) {
        if (this._active !== v) {
            this._active = v;
            this._setListeners(v);
        }
    }

    onEnable(): void {
        this.active = true;
        this.reset();
    }

    onDisable(): void {
        this.active = false;
    }

    reset() {
        this._button = -1;
        this._targetPhi = this.phi;
        this._targetTheta = this.theta;
        this._targetSpringLength = this.springLength;
        this._targetFov = this.lens.fov;
        this._targetNear = this.lens.near;
        this._targetFar = this.lens.far;
        this._targetLookAt.set(this.lookAt);
    }

    onLoad(): void {
        this._camera = this.getComponent(Camera);
    }

    private _setListeners(v: boolean) {
        if (v) {
            input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
            input.on(Input.EventType.MOUSE_UP, this._onMouseUp, this);
            input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
            input.on(Input.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
            input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
            input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        }
        else {
            input.off(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
            input.off(Input.EventType.MOUSE_UP, this._onMouseUp, this);
            input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
            input.off(Input.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
            input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
            input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        }
    }

    private _onTouchStart(e: EventTouch) {
        if (!sys.isMobile) return;

        let touches = e.getAllTouches();
        if (touches.length > 1) {
            touches[0].getLocation(this._preLoc0);
            touches[1].getLocation(this._preLoc1);
        }
        else if (touches.length > 0) {
            this._touchID = touches[0].getID();
            touches[0].getLocation(this._preLoc0);
        }
    }

    private _onTouchMove(e: EventTouch) {
        if (!sys.isMobile) return;

        const { __loc0, __loc1, __panDelta, __rotateDelta, __preCenter, __center } = FreelookVirtualCamera;

        let touches = e.getAllTouches();
        if (touches.length > 1) {
            touches[0].getLocation(__loc0);
            touches[1].getLocation(__loc1);

            if (this.lookAt) {
                this._targetSpringLength *= this._calculateDistanceScale(Vec2.distance(this._preLoc0, this._preLoc1) / Vec2.distance(__loc0, __loc1));
            }

            __preCenter.set(this._preLoc0).add(this._preLoc1).multiplyScalar(0.5);
            __center.set(__loc0).add(__loc1).multiplyScalar(0.5);

            this._calculatePanDelta(__panDelta, __preCenter, __center);
            this._calculateTargetLookAt(__panDelta);
            this._calculateTargetSpringArm();

            this._preLoc0.set(__loc0);
            this._preLoc1.set(__loc1);
        }
        else if (touches.length > 0) {
            if (this._touchID === touches[0].getID()) {
                touches[0].getLocation(__loc0);

                this._calculateRotatelDelta(__rotateDelta, this._preLoc0, __loc0);
                this._calculateTargetSpringArm(__rotateDelta);

                this._preLoc0.set(__loc0);
            }

        }
    }

    private _onMouseDown(e: EventMouse) {
        this._button = e.getButton();
        e.getLocation(this._preLoc0);
    }

    private _onMouseUp(e: EventMouse) {
        this._button = -1;
    }

    private _onMouseMove(e: EventMouse) {
        const { __loc0, __panDelta, __rotateDelta } = FreelookVirtualCamera;
        e.getLocation(__loc0)

        switch (this._button) {
            case 0:
                this._calculateRotatelDelta(__rotateDelta, this._preLoc0, __loc0);
                this._calculateTargetSpringArm(__rotateDelta);
                break;
            case 1:
            case 2:
                this._calculatePanDelta(__panDelta, this._preLoc0, __loc0)
                this._calculateTargetLookAt(__panDelta);
                break;
        }

        this._preLoc0.set(__loc0);
    }

    private _onMouseWheel(e: EventMouse) {
        if (e.getScrollY() > 0) {
            this._targetSpringLength *= this._calculateDistanceScale(1 / 0.85);
        }
        else if (e.getScrollY() < 0) {
            this._targetSpringLength *= this._calculateDistanceScale(0.85);
        }
        this._calculateTargetSpringArm();
    }

    private _calculateDistanceScale(scale: number) {
        this._tempRotateSmoothing = this.rotateSmoothing;

        if (this.forbidZ) {
            scale = 1;
        }
        return scale;
    }

    private _calculatePanDelta(out: Vec2, loc0: Vec2, loc1: Vec2) {
        this._tempRotateSmoothing = this.rotateSmoothing;

        Vec2.copy(out, loc1).subtract(loc0).multiplyScalar(this.panSpeed / view.getVisibleSizeInPixel().height);
        if (this.forbidPanX) {
            out.x = 0;
        }
        if (this.forbidPanY) {
            out.y = 0;
        }

        return out;
    }

    private _calculateTargetLookAt(panDelta: Vec2) {
        const { __xAxis, __yAxis, __offset } = FreelookVirtualCamera;
        setFromMatrixColumn(this.node.worldMatrix, 0, __xAxis);
        setFromMatrixColumn(this.node.worldMatrix, 1, __yAxis);

        Vec3.copy(__offset, this.node.position).subtract(this.lookAt);
        const length = __offset.length() * 2 * tan(toRadian(this.lens.fov * 0.5));

        this._targetLookAt
            .subtract(__xAxis.multiplyScalar(panDelta.x * length))
            .subtract(__yAxis.multiplyScalar(panDelta.y * length));
    }

    private _calculateRotatelDelta(out: Vec2, loc0: Vec2, loc1: Vec2) {
        this._tempRotateSmoothing = this.rotateSmoothing;

        Vec2.copy(out, loc1).subtract(loc0).multiplyScalar(this.rotateSpeed * 2 * Math.PI / view.getVisibleSizeInPixel().height);

        if (this.forbidX) {
            out.x = 0;
        }
        if (this.forbidY) {
            out.y = 0;
        }

        return out;
    }

    private _calculateTargetSpringArm(rotateDelta?: Vec2, radius?: number) {
        if (rotateDelta) {
            this._targetTheta -= rotateDelta.x;
            this._targetPhi += rotateDelta.y;
        }
        if (radius) {
            this._targetSpringLength = radius;
        }
        this._targetTheta = clamp(this._targetTheta, this.thetaMin, this.thetaMax);
        this._targetPhi = clamp(this._targetPhi, this.phiMin, this.phiMax);
        this._targetSpringLength = clamp(this._targetSpringLength, this.distanceMin, this.distanceMax);
    }

    gotoPOI({
        phi = this._targetPhi,
        theta = this._targetTheta,
        springLength = this._targetSpringLength,
        lookAt = this._targetLookAt
    }: {
        phi?: number;
        theta?: number;
        springLength?: number;
        lookAt?: Vec3;
    }) {
        this._targetPhi = phi;
        this._targetTheta = theta;
        this._targetSpringLength = springLength;
        this._targetLookAt.set(lookAt);
    }

    gotoTransform({
        position,
        rotation,
        damping = true,
    }: {
        position: Vec3;
        rotation: Quat;
        damping?: boolean;
    }) {
        const { __forward, __spherical, __offset } = FreelookVirtualCamera;
        const forward = Vec3.transformQuat(__forward, Vec3.FORWARD, rotation);
        const lookAt = forward.multiplyScalar(this.springLength).add(position);

        __offset.set(position).subtract(lookAt);
        __spherical.setFromVector3(__offset)

        if (damping) {
            this._targetPhi = __spherical.phi;
            this._targetTheta = __spherical.theta;
            this._targetLookAt.set(lookAt);
        }
        else {
            this.phi = __spherical.phi;
            this.theta = __spherical.theta;
            this.lookAt = lookAt;
        }
    }

    update(dt: number): void {
        const smoothing = this._tempSmoothing;
        const rotateSmoothing = this._tempRotateSmoothing;

        this._spherical.theta = FInterpTo(this._spherical.theta, this._targetTheta, dt, rotateSmoothing);
        this._spherical.phi = FInterpTo(this._spherical.phi, this._targetPhi, dt, rotateSmoothing);
        this._spherical.radius = FInterpTo(this._spherical.radius, this._targetSpringLength, dt, smoothing);

        VInterpTo(this._lookAt, this._targetLookAt, dt, smoothing);

        this.lens.fov = FInterpTo(this.lens.fov, this._targetFov, dt, smoothing);
        this.lens.near = FInterpTo(this.lens.near, this._targetNear, dt, smoothing);
        this.lens.far = FInterpTo(this.lens.far, this._targetFar, dt, smoothing);

        this._camera.fov = this.lens.fov;
        this._camera.near = this.lens.near;
        this._camera.far = this.lens.far;

        this.node.position = setFromSpherical(this._spherical, this.node.position).add(this._lookAt);
        this.node.lookAt(this._lookAt);
    }
}

