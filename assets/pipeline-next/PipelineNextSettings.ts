import { _decorator, Camera, Component, director, Enum, Material, TextureCube } from 'cc';
const { ccclass, property, executeInEditMode, disallowMultiple, requireComponent } = _decorator;

@ccclass('Base')
class Base {
    @property(Material)
    material: Material = null;

    @property({ slide: true, min: 0, max: 10, step: 0.1 })
    intensity: number = 1;
}

@ccclass('FXAA')
class FXAA {
    @property
    enable: boolean = true;

    @property(Material)
    material: Material = null;
}

@ccclass('Bloom')
class Bloom {
    @property
    enable: boolean = true;

    @property(Material)
    material: Material = null;

    @property({ slide: true, min: 0, max: 10, step: 0.1 })
    intensity: number = 1

    @property({ min: 0 })
    threshold: number = 0.8;
}

export enum TonemapType {
    STANDARD = 0,
    RGB = 1,
}

@ccclass('Tonemap')
class Tonemap {
    @property
    enable: boolean = true;

    @property({ type: Enum(TonemapType) })
    type: TonemapType = TonemapType.STANDARD;

    @property({ min: 0, max: 1, step: 0.01 })
    intensity: number = 1;

    @property({ min: 0, max: 1, step: 0.01 })
    damage: number = 0;
}


@ccclass('PipelineNextSettings')
@executeInEditMode
@disallowMultiple
@requireComponent(Camera)
export class PipelineNextSettings extends Component {
    static Instance: PipelineNextSettings;

    @property
    preview: boolean = true;

    @property(Base)
    base: Base = new Base();

    @property(Tonemap)
    tonemap: Tonemap = new Tonemap();

    @property(FXAA)
    fxaa: FXAA = new FXAA();

    @property(Bloom)
    bloom: Bloom = new Bloom();

    onEnable(): void {
        const camera = this.getComponent(Camera) as any;
        camera.camera.next = PipelineNextSettings.Instance = this;
    }

    onDisable(): void {
        const camera = this.getComponent(Camera) as any
        camera.camera.next = PipelineNextSettings.Instance = undefined;
    }
}