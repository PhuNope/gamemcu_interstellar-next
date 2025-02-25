import { _decorator, Color, Component, director, find, Label, lerp, Node, ProgressBar, Sprite, tween, UITransform } from 'cc';
import { PipelineNextSettings } from '../pipeline-next/PipelineNextSettings';
import { properties } from '../datas/Properties';
import { prepare } from '../utils/Math';
import { audioSystem } from '../systems/AudioSystem';
import { killTweenOf } from '../utils/TweenUitls';
import { EventType } from '../datas/Enum';
const { ccclass, property } = _decorator;

function clampWidth(w: number) {
    return w < 24 ? 0 : w;
}

@ccclass('GameManager')
export class GameManager extends Component {
    static __COLOR_HIDE = new Color().fromHEX(0xFFFFFF00);
    static __COLOR_NORMAL = new Color().fromHEX(0xFFFFFFFF);

    @property(Node)
    group: Node = null;

    private _score: Label = null;
    private _life: ProgressBar = null;
    private _bar: UITransform = null;
    private _preBar: UITransform = null;
    private _groupSprite: Sprite = null;

    onLoad(): void {
        this._groupSprite = this.group.getComponent(Sprite);
        this._score = this.group.getChildByName("Score").getComponent(Label);
        this._life = this.group.getChildByName("Life").getComponent(ProgressBar);
        this._bar = find("Bar", this._life.node).getComponent(UITransform);
        this._preBar = find("preBar", this._life.node).getComponent(UITransform);
        this._preBar.width = this._bar.width;
    }

    onEnable(): void {
        director.on(EventType.GAMEEND, this._gameEnd, this);
    }

    onDisable(): void {
        killTweenOf(this);
        director.off(EventType.GAMEEND, this._gameEnd, this);
    }

    start(): void {
        prepare();

        properties.ship.far = 0
        properties.ship.offset = 0
        properties.ship.position.set(0, 0, 0);
        properties.ship.speedRatio.set(0, 0, 0);
        properties.user.life = 100;
        properties.user.score = 0;

        audioSystem.play("audios/start", 2);
        audioSystem.playBGM("audios/bgm01");

        this._gameStart();

        tween(this)
            .delay(33.63)
            .call(() => {
                audioSystem.playBGM("audios/bgmtransition");
            })
            .delay(11.21)
            .call(() => {
                audioSystem.playBGM("audios/bgm02", 1);
            })
            .start();

    }

    private _gameStart() {
        tween(PipelineNextSettings.Instance.tonemap)
            .set({ intensity: 0 })
            .to(0.5, { intensity: 1 })
            .start();

        let color = GameManager.__COLOR_HIDE.clone();
        tween(this)
            .call(() => this._groupSprite.color = color)
            .delay(0.5)
            .to(1, {}, {
                onUpdate: (_, radio) => {
                    this._groupSprite.color = color.lerp(GameManager.__COLOR_NORMAL, radio);
                }
            })
            .start();
    }

    private _gameEnd() {
        tween(PipelineNextSettings.Instance.tonemap)
            .delay(2)
            .to(0.5, { intensity: 0 })
            .call(() => {
                director.loadScene("home");
            })
            .start();

        let color = GameManager.__COLOR_NORMAL.clone();
        tween(this)
            .call(() => this._groupSprite.color = color)
            .delay(0.5)
            .to(1, {}, {
                onUpdate: (_, radio) => {
                    this._groupSprite.color = color.lerp(GameManager.__COLOR_HIDE, radio);
                }
            })
            .start();
    }

    update(dt: number): void {
        if (this._score && this._life) {
            this._score.string = Math.floor(properties.user.score).toLocaleString();
            this._life.progress = properties.user.life / 100
            this._bar.width = clampWidth(this._bar.width);
            this._preBar.width = clampWidth(lerp(this._preBar.width, this._bar.width, dt));
        }
    }

}