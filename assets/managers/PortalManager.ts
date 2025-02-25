import { _decorator, Camera, clamp01, Component, lerp, Mat4, Material, MeshRenderer, Node, Quat, RenderTexture, Vec3, Vec4, view } from 'cc';
import { StateHandler } from '../datas/StateHandler';
import { StateManager } from '../datas/StateManager';
import { PipelineNextSettings, TonemapType } from '../pipeline-next/PipelineNextSettings';
const { ccclass, property } = _decorator;

const __ESP = 1.e-4;
const __dist = new Vec3();
const __localMatrix = new Mat4();
const __worldMatrix = new Mat4();
const __worldToLocalMatrix = new Mat4();
const __worldPosition = new Vec3();
const __worldRotation = new Quat();
const __worldDirection = new Vec3();
const __ndcPosition1 = new Vec4();
const __ndcPosition2 = new Vec4();

function VInterpTo(current: Vec3, target: Vec3, speed: number, dt: number) {
    let dist = __dist.set(target).subtract(current);
    if (dist.length() < __ESP) {
        current.set(target);
        return 1;
    }
    else {
        current.add(dist.multiplyScalar(clamp01(speed * dt)));
        return 0;
    }
}

function VInterpConstantTo(current: Vec3, target: Vec3, speed: number, dt: number) {
    let delta = __dist.set(target).subtract(current);
    let deltaM = delta.length();
    let maxStep = speed * dt;
    if (deltaM > maxStep) {
        if (maxStep > 0) {
            current.add(delta.multiplyScalar(maxStep / deltaM));
        }
        return 0;
    }
    else {
        current.set(target);
        return 1;
    }
}

type State =
    "none" |
    "gameStart" |
    "gameEnd" |
    "initScreen" |
    "flyToScreen" |
    "moveToScreen" |
    "insideScreen" |
    "outsideScreen"

@ccclass('PortalManager')
export class PortalManager extends Component {

    @property(Camera)
    uiCamera: Camera = null;

    @property(Camera)
    outterCamera: Camera = null;

    @property(Node)
    outterPortal: Node = null;

    @property(Node)
    outerShip: Node = null;

    @property(Node)
    outerSpawn: Node = null;

    @property(Camera)
    playerCamera: Camera = null;

    @property(Node)
    playerCameraTrack: Node = null;

    @property(Node)
    playerPortal: Node = null;

    @property(Node)
    playerShip: Node = null;

    @property(Node)
    playerSlot: Node = null;

    @property(Node)
    playerShipTrack: Node = null;

    screenMaterial: Material = null;
    renderTexture: RenderTexture = new RenderTexture();
    mainTexture_ST: Vec4 = new Vec4();
    mananger: StateManager<State> = new StateManager();

    onLoad(): void {
        const { width, height } = view.getVisibleSizeInPixel();

        this.renderTexture.reset({ width, height });
        this.screenMaterial = this.playerPortal.getComponent(MeshRenderer).material;
        this.screenMaterial.setProperty("mainTexture", this.renderTexture);

        this.uiCamera.targetTexture = this.renderTexture;
        this.outterCamera.targetTexture = this.renderTexture;

        this.mananger.setStateHandler(new GameStart({ target: this }));
        this.mananger.setStateHandler(new MoveToScreen({ target: this }));
        this.mananger.setStateHandler(new OutsideScreen({ target: this }));
        this.mananger.setStateHandler(new InsideScreen({ target: this }));

        this.scheduleOnce(this._initScreen, 0.1);
    }

    onDestroy(): void {
        this.mananger.clear();
    }

    update(dt: number): void {
        this.mananger.update(dt);
    }

    private _initScreen() {
        const { outterCamera, outterPortal, screenMaterial } = this;

        const matViewProj = outterCamera.camera.matViewProj;
        __worldPosition.set(0, 0.367057 / 2, -0.518 / 2);
        __worldPosition.transformMat4(outterPortal.worldMatrix);
        __ndcPosition1.set(__worldPosition.x, __worldPosition.y, __worldPosition.z, 1).transformMat4(matViewProj)
        __ndcPosition1.multiplyScalar(0.5 / __ndcPosition1.w).add4f(0.5, 0.5, 0.5, 0.5);

        __worldPosition.set(0, -0.367057 / 2, 0.518 / 2);
        __worldPosition.transformMat4(outterPortal.worldMatrix);
        __ndcPosition2.set(__worldPosition.x, __worldPosition.y, __worldPosition.z, 1).transformMat4(matViewProj);
        __ndcPosition2.multiplyScalar(0.5 / __ndcPosition2.w).add4f(0.5, 0.5, 0.5, 0.5);

        this.mainTexture_ST.set(
            __ndcPosition1.x - __ndcPosition2.x,
            __ndcPosition1.y - __ndcPosition2.y,
            __ndcPosition2.x,
            __ndcPosition2.y
        );

        screenMaterial.setProperty("mainTexture_ST", this.mainTexture_ST);
    }
}

class GameStart extends StateHandler<PortalManager> {
    name: State = "gameStart";

    private _shipTrackIndex: number = 0;
    private _cameraTrackIndex: number = 0;
    private _targetPosition: Vec3 = new Vec3();
    private _targetRotation: Quat = new Quat();
    private _cameraSpeed: number = 0;

    onEnter(): void {
        const { outterPortal, outterCamera, playerPortal } = this.target;

        __worldToLocalMatrix.set(outterPortal.worldMatrix).invert();
        __localMatrix.set(__worldToLocalMatrix).multiply(outterCamera.node.worldMatrix);
        __worldMatrix.set(playerPortal.worldMatrix).multiply(__localMatrix);

        __worldMatrix.getTranslation(this._targetPosition);
        __worldMatrix.getRotation(this._targetRotation);
    }

    onUpdate(dt: number): void {
        const { outerSpawn, outerShip, outterPortal, outterCamera, playerPortal, playerShip, playerCamera, playerCameraTrack, playerShipTrack, screenMaterial } = this.target;

        const shipSpeed = 1;
        const shipTrackPoints = playerShipTrack.children;

        if (this._shipTrackIndex < shipTrackPoints.length) {
            const point = shipTrackPoints[this._shipTrackIndex];
            if (VInterpConstantTo(playerShip.position, point.position, shipSpeed, dt)) {
                this._shipTrackIndex++;
            }
            playerShip.position = playerShip.position;
            playerShip.rotation = playerShip.rotation.lerp(point.rotation, 2 * dt);
        }

        const cameraSpeed = 1;
        const cameraTrackPoints = playerCameraTrack.children;

        if (this._cameraTrackIndex < cameraTrackPoints.length) {
            this._cameraSpeed = lerp(this._cameraSpeed, cameraSpeed, 5 * dt);
            const point = cameraTrackPoints[this._cameraTrackIndex];
            if (VInterpConstantTo(playerCamera.node.position, point.worldPosition, cameraSpeed, dt)) {
                this._cameraTrackIndex++;
            }
            playerCamera.node.position = playerCamera.node.position;
            playerCamera.node.rotation = playerCamera.node.rotation.lerp(point.worldRotation, 2 * dt);
        }

        __worldToLocalMatrix.set(playerPortal.worldMatrix).invert();
        __localMatrix.set(__worldToLocalMatrix).multiply(playerShip.worldMatrix);
        __worldMatrix.set(outerSpawn.worldMatrix).multiply(__localMatrix);

        outerShip.worldPosition = __worldMatrix.getTranslation(__worldPosition);
        outerShip.worldRotation = __worldMatrix.getRotation(__worldRotation);

        // __worldDirection.set(outterPortal.worldPosition).add3f(0, 0, 0.2).subtract(outterCamera.node.worldPosition);
        // let d = __worldDirection.dot(Vec3.FORWARD);
        // if (d < 0) {
        //     outterCamera.enabled = false;
        //     PipelineNextSettings.Instance.tonemap.type = TonemapType.RGB;

        //     playerCamera.node.worldPosition = outterCamera.node.worldPosition;
        //     playerCamera.node.worldRotation = outterCamera.node.worldRotation;

        //     this.target.mananger.state = "insideScreen";
        // }
        // else {
        //     screenMaterial.setProperty("specularIntensity", clamp01(d));
        // }
    }
}

class MoveToScreen extends StateHandler<PortalManager> {
    name: State = "moveToScreen";

    private _portalWeight: number = 0;
    private _targetPosition: Vec3 = new Vec3();
    private _targetRotaiton: Quat = new Quat();
    private _targetPortalWeight: number = 0;

    onEnter(): void {
        const { screenMaterial, outterPortal, outterCamera, outerShip, playerPortal, playerShip } = this.target;

        __worldToLocalMatrix.set(outterPortal.worldMatrix).invert();
        __localMatrix.set(__worldToLocalMatrix).multiply(outterCamera.node.worldMatrix);
        __worldMatrix.set(playerPortal.worldMatrix).multiply(__localMatrix);

        this._targetPosition.set(__worldMatrix.getTranslation(__worldPosition));
        this._targetRotaiton.set(__worldMatrix.getRotation(__worldRotation));
        // this._targetPortalWeight = 1;

        __worldDirection.set(outterPortal.worldPosition).add3f(0, 0, 0.2).subtract(outterCamera.node.worldPosition);
        screenMaterial.setProperty("specularIntensity", clamp01(__worldDirection.dot(Vec3.FORWARD)));

        __localMatrix.set(__worldToLocalMatrix).multiply(outerShip.worldMatrix);
        __worldMatrix.set(playerShip.worldMatrix).multiply(__localMatrix);
    }

    onUpdate(dt: number): void {
        const { screenMaterial, playerCamera, outterCamera } = this.target;

        this._portalWeight = lerp(this._portalWeight, this._targetPortalWeight, 10 * dt);
        screenMaterial.setProperty("portalWeight", this._portalWeight);

        playerCamera.fov = lerp(playerCamera.fov, outterCamera.fov, 10 * dt);
        playerCamera.node.position = playerCamera.node.position.lerp(this._targetPosition, 10 * dt);
        playerCamera.node.rotation = playerCamera.node.rotation.slerp(this._targetRotaiton, 10 * dt);
    }
}

class OutsideScreen extends StateHandler<PortalManager> {
    name: State = "outsideScreen";

    onUpdate(dt: any): void {
        const { playerPortal, playerCamera, playerShip, outterCamera, outterPortal, outerShip, screenMaterial } = this.target;

        __worldToLocalMatrix.set(playerPortal.worldMatrix).invert();
        __localMatrix.set(__worldToLocalMatrix).multiply(playerCamera.node.worldMatrix);
        __worldMatrix.set(outterPortal.worldMatrix).multiply(__localMatrix);

        outterCamera.node.setWorldPosition(__worldMatrix.getTranslation(__worldPosition));
        outterCamera.node.setWorldRotation(__worldMatrix.getRotation(__worldRotation));

        __localMatrix.set(__worldToLocalMatrix).multiply(playerShip.worldMatrix);
        __worldMatrix.set(outterPortal.worldMatrix).multiply(__localMatrix);

        outerShip.setWorldPosition(__worldMatrix.getTranslation(__worldPosition));
        outerShip.setWorldRotation(__worldMatrix.getRotation(__worldRotation));

        __worldDirection.set(outterPortal.worldPosition).add3f(0, 0, 0.2).subtract(outterCamera.node.worldPosition);
        let d = __worldDirection.dot(Vec3.FORWARD);
        if (d < 0) {
            outterCamera.enabled = false;
            PipelineNextSettings.Instance.tonemap.type = TonemapType.RGB;

            playerCamera.node.worldPosition = outterCamera.node.worldPosition;
            playerCamera.node.worldRotation = outterCamera.node.worldRotation;

            this.target.mananger.state = "insideScreen";
        }
        else {
            screenMaterial.setProperty("specularIntensity", clamp01(d));
        }
    }
}

class InsideScreen extends StateHandler<PortalManager> {
    name: State = "insideScreen";

    onUpdate(dt: any): void {
        const { outterPortal, outterCamera, playerCamera, playerPortal } = this.target;

        __worldDirection.set(outterPortal.worldPosition).add3f(0, 0, 0.2).subtract(playerCamera.node.worldPosition);
        let d = __worldDirection.dot(Vec3.FORWARD);
        if (d > 0) {
            outterCamera.enabled = true;
            PipelineNextSettings.Instance.tonemap.type = TonemapType.STANDARD;

            __worldToLocalMatrix.set(outterPortal.worldMatrix).invert();
            __localMatrix.set(__worldToLocalMatrix).multiply(playerCamera.node.worldMatrix);
            __worldMatrix.set(playerPortal.worldMatrix).multiply(__localMatrix);

            playerCamera.node.worldPosition = __worldMatrix.getTranslation(__worldPosition);
            playerCamera.node.worldRotation = __worldMatrix.getRotation(__worldRotation);

            this.target.mananger.state = "outsideScreen";
        }
    }

}