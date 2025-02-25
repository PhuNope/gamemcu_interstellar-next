import { _decorator, Component, easing, lerp, Material, Mesh, MeshRenderer, Node, tween } from 'cc';
import { initParticleMesh } from '../utils/MeshUtils';
import { killTweenOf } from '../utils/TweenUitls';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('MeshParticle')
@executeInEditMode
export class MeshParticle extends Component {
    static __particleMesh: Mesh = null;
    private _material: Material = null;
    private _isPlaying: boolean = false;

    get isPlaying() {
        return this._isPlaying;
    }

    onLoad(): void {
        const renderer = this.getComponentInChildren(MeshRenderer);
        if (MeshParticle.__particleMesh === null) {
            MeshParticle.__particleMesh = initParticleMesh(renderer.mesh, 1);
        }
        renderer.mesh = MeshParticle.__particleMesh;
        this._material = renderer.material;
    }

    onDestroy(): void {
        killTweenOf(this);
    }

    play() {
        killTweenOf(this)
        tween(this)
            .call(() => this._isPlaying = true)
            .delay(0.5)
            .to(0.8, {}, {
                onUpdate: (_, ratio) => {
                    this._material.setProperty("progress", lerp(1.4, 2, ratio));
                }
            })
            .call(() => this._isPlaying = false)
            .start();
    }
}

