import { _decorator, Component, director, instantiate, Material, Node, ParticleSystem, tween, Vec3 } from 'cc';
import { properties } from '../datas/Properties';
import { EventType } from '../datas/Enum';
import { MeshParticle } from '../components/MeshParticle';
const { ccclass, property } = _decorator;

type ParticleCell = {
    particles: ParticleSystem[]
}

@ccclass('ParticleManager')
export class ParticleManager extends Component {
    private _particles: ParticleCell[] = [];
    private _meshParticles: MeshParticle[] = [];

    @property(Node)
    batteryParticle: Node = null;

    @property(Node)
    meshParticle: Node = null;

    onEnable(): void {
        director.on(EventType.GET, this._onGet, this);
    }

    onDisable(): void {
        director.off(EventType.GET, this._onGet, this);
    }

    onLoad(): void {
        for (let i = 0; i < 4; i++) {
            const p = instantiate(this.batteryParticle);
            p.parent = this.batteryParticle.parent;
            this._addParticle(p);
        }
        this._addParticle(this.batteryParticle);
        for (let i = 0; i < 4; i++) {
            const ins = instantiate(this.meshParticle);
            ins.parent = this.meshParticle.parent;
            this._meshParticles.push(ins.getComponent(MeshParticle));
        }
        this._meshParticles.push(this.meshParticle.getComponent(MeshParticle));
    }

    private _addParticle(root: Node) {
        this._particles.push({ particles: root.getComponentsInChildren(ParticleSystem) })
    }

    private _onGet(position: Vec3) {
        for (let p of this._particles) {
            if (!p.particles[0].isPlaying) {
                p.particles.forEach(v => v.play());
                break;
            }
        }
        for (let p of this._meshParticles) {
            if (!p.isPlaying) {
                p.play();
                break;
            }
        }
    }
}

