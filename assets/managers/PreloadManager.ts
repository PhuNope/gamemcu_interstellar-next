import { _decorator, assetManager, Camera, Component, director, game, Label, Material, Mesh, MeshRenderer, Node, tween, view } from 'cc';
import { properties } from '../datas/Properties';
import { settings } from '../datas/Settings';
import { initParticleMesh } from '../utils/MeshUtils';

const { ccclass, property } = _decorator;

@ccclass('PreloadManager')
export class PreloadManager extends Component {

    @property(Camera)
    uiCamera: Camera = null;

    @property(Node)
    screen: Node = null;

    @property(Label)
    text: Label = null;

    @property(Mesh)
    shipMesh: Mesh = null;

    @property(Label)
    version: Label = null;

    private _progress: number = 0;
    private _gameProgress: number = 0;
    private _homeProgress: number = 0;
    private _loaded: number = 0;
    private _completed: boolean = false;
    private _screenMaterial: Material = null;

    start() {
        game.frameRate = 60.1;
        this.version.string = settings.VERSION;

        properties.shipParticleMesh = initParticleMesh(this.shipMesh);

        this._screenMaterial = this.screen.getComponent(MeshRenderer).material;
        this._screenMaterial.setProperty("mainTexture", this.uiCamera.targetTexture);

        assetManager.loadBundle("main", {}, (err, bundle) => {
            bundle.loadScene("home", {}, (finished, total) => this._homeProgress = finished / total, () => this._loaded++);
            bundle.loadScene("game", {}, (finished, total) => this._gameProgress = finished / total, () => this._loaded++);
        });
    }

    update(dt: number): void {
        if (!this._completed) {
            this._progress = Math.max(this._progress, (this._homeProgress + this._gameProgress) / 2);
            this.text.string = `${Math.floor(this._progress * 95)}%`;
            if (this._loaded >= 2) {
                this._completed = true;
                this.text.string = "100%";
                tween(this)
                    .delay(0.2)
                    .call(() => this.text.string = `PRESS START`)
                    .delay(0.2)
                    .call(() => {
                        director.loadScene("home");
                    })
                    .start();
            }
        }
    }
}

