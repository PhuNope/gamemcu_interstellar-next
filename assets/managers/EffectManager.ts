import { _decorator, Color, Component, director, Material, Node } from 'cc';
const { ccclass, property } = _decorator;

export const enum EffectType {
    COLLECTED_BATTERY
}


@ccclass('EffectManager')
export class EffectManager extends Component {

    @property(Color)
    shipColor: Color = new Color(1, 1, 1);

    @property(Material)
    shipMaterial: Material = null;

    onLoad(): void {
        director.on(EffectType.COLLECTED_BATTERY, this._onCollectedBattery, this);
    }

    onDestroy(): void {
        director.off(EffectType.COLLECTED_BATTERY, this._onCollectedBattery, this);
    }

    private _onCollectedBattery() {
        this.shipMaterial.setProperty("albedoScale", this.shipColor);
    }
}

