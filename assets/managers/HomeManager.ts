import { _decorator, Node, BoxCollider, Camera, Color, Component, EventMouse, geometry, Input, input, Material, MeshRenderer, RenderTexture, Sprite, Vec2, Vec3, Vec4, view, tween, director, Label, Animation, lerp, sys, EventTouch, pipeline } from 'cc';
import { PipelineNextSettings } from '../pipeline-next/PipelineNextSettings';
import { EventType } from '../datas/Enum';
import { properties } from '../datas/Properties';
import { killTweenOf } from '../utils/TweenUitls';
import { audioSystem } from '../systems/AudioSystem';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('HomeManager')
// @executeInEditMode
export class HomeManager extends Component {
    static __loc0 = new Vec2();
    static __ray = new geometry.Ray();
    static __COLOR_HIDE = new Color().fromHEX(0xA8F5FF00);
    static __COLOR_NORMAL = new Color().fromHEX(0xA8F5FFFF);
    static __COLOR_HOVER = new Color().fromHEX(0x70D7FFFF);
    static __SCAL0 = new Vec3(1.2, 1.2, 1.2);
    static __SCAL1 = new Vec3(1, 1, 1);

    @property(Camera)
    camera: Camera = null;

    @property(BoxCollider)
    startCollider: BoxCollider = null;

    @property(Camera)
    uiCamera: Camera = null;

    @property(Node)
    screen: Node = null;

    @property(Animation)
    screenAnimation: Animation = null;

    @property(Node)
    group: Node = null;

    private _button: number = -1;
    private _pressed: boolean = false;
    private _screenMaterial: Material = null;
    private _startButton: Sprite = null;
    private _startLabel: Label = null;
    private _scoreLabel: Label = null;

    onLoad(): void {
        this._startButton = this.group.getChildByName("button").getComponent(Sprite);
        this._startLabel = this.group.getChildByPath("button/label").getComponent(Label);
        this._scoreLabel = this.group.getChildByPath("score/score").getComponent(Label);
        this._screenMaterial = this.screen.getComponent(MeshRenderer).material;
        this._screenMaterial.setProperty("mainTexture", this.uiCamera.targetTexture);
        audioSystem.stop();
    }

    onDestroy(): void {
        killTweenOf(this);
    }

    private _enalble() {
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

    start() {
        if (properties.user.life <= 0) {
            this._startButton.color = HomeManager.__COLOR_HIDE;
            this._scoreLabel.string = Math.floor(properties.user.score).toLocaleString();

            tween(PipelineNextSettings.Instance.tonemap)
                .set({ intensity: 0 })
                .to(1, { intensity: 1 })
                .start();

            tween(this)
                .delay(3.5)
                .call(() => this.group.getComponent(Animation).play())
                .delay(0.5)
                .call(() => audioSystem.play("audios/score"))
                .start();

            this.screenAnimation.play();
        }
        else {
            this._startLabel.string = `PRESS START`;
            this._startButton.color = HomeManager.__COLOR_NORMAL;

            tween(this)
                .delay(0.5)
                .call(() => this.screenAnimation.play())
                .start();
        }

        audioSystem.play("audios/particle")
        audioSystem.playBGM("audios/roombgm");

        tween(this)
            .delay(4)
            .call(() => this._enalble())
            .start();
    }

    update(dt: number): void {
        if (this._startButton) {
            const node = this._startLabel.node;
            const scale = this._pressed ? HomeManager.__SCAL0 : HomeManager.__SCAL1;
            node.scale = node.scale.lerp(scale, 10 * dt);
        }
    }

    private _onMouseDown(e: EventMouse) {
        this._button = e.getButton();
        this._onPointerDown(e.getLocation(HomeManager.__loc0))
    }

    private _onMouseUp(e: EventMouse) {
        this._button = -1;
        this._onPointerUp(e.getLocation(HomeManager.__loc0));
    }

    private _onMouseMove(e: EventMouse) {
        this._onPointerMove(e.getLocation(HomeManager.__loc0));
    }

    private _onTouchStart(e: EventTouch) {
        if (!sys.isMobile) return;
        this._button = 0;
        this._onPointerDown(e.touch.getLocation(HomeManager.__loc0));
    }

    private _onTouchEnd(e: EventTouch) {
        if (!sys.isMobile) return;
        this._button = -1;
        this._onPointerUp(e.touch.getLocation(HomeManager.__loc0));
    }

    private _onTouchMove(e: EventTouch) {
        if (!sys.isMobile) return;
        this._onPointerMove(e.touch.getLocation(HomeManager.__loc0));
    }

    private _onPointerDown(pos: Vec2) {
        if (this._button === 0) {
            this._pressed = this._getRayResult(pos) > 0;
        }
    }

    private _onPointerUp(pos: Vec2) {
        if (this._pressed) {
            this._pressed = false;
            audioSystem.play("audios/click")
            audioSystem.play("audios/particle")
            director.emit(EventType.LEAVE);
            this._disable();
            tween(PipelineNextSettings.Instance.tonemap)
                .delay(1.5)
                .to(1, { intensity: 0 })
                .call(() => {
                    director.loadScene("game");
                })
                .start();
        }
    }

    private _onPointerMove(pos: Vec2) {
        if (this._button === -1) {
            this._startButton.color = this._getRayResult(pos) > 0 ? HomeManager.__COLOR_HOVER : HomeManager.__COLOR_NORMAL;
        }
    }

    private _getRayResult(pos: Vec2) {
        const ray = this.camera.screenPointToRay(pos.x, pos.y, HomeManager.__ray);
        return geometry.intersect.rayAABB(ray, this.startCollider.worldBounds as any);
    }
}