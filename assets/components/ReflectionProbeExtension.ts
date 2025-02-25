import { _decorator, Component, ReflectionProbe, TextureCube } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('ReflectionProbeExtension')
@requireComponent(ReflectionProbe)
export class ReflectionProbeExtension extends Component {
    private _probe: ReflectionProbe = null;

    get probe() {
        if (this._probe === null) {
            this._probe = this.node.getComponent(ReflectionProbe);
        }
        return this._probe;
    }

    @property(TextureCube)
    get cubemap() {
        return this.probe.cubemap;
    }
    set cubemap(v: TextureCube) {
        this.probe.cubemap = v;
    }

}

