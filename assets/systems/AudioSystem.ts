import { AudioClip, AudioSource, director, Node, System, lerp, clamp01 } from "cc";
import { Resources } from "../utils/Resources";

class AudioFade {
    private _source: AudioSource = new Node().addComponent(AudioSource);
    private _time: number = 0;
    private _duration: number = 0;
    private _callback: Function = null;
    private _volumeStart: number = 0;
    private _volumeEnd: number = 0;

    public get source() {
        return this._source;
    }

    public play(clip: AudioClip, volume: number, loop: boolean, oneshot: boolean = true) {
        if (oneshot && !loop) {
            this._source.playOneShot(clip, volume);
        }
        else {
            this._source.clip = clip;
            this._source.volume = volume;
            this._source.loop = loop;
            this._source.play();
        }
        this._time = this._duration = 0;
    }

    public resume() {
        this._source.play();
    }

    public pause() {
        this._source.pause();
    }

    public stop() {
        this._source.stop();
    }

    public fade(volume: number, duration: number = 1, callback?: Function) {
        this._time = 0;
        this._duration = Math.max(0.01, duration);
        this._callback = callback;
        this._volumeStart = this._source.volume;
        this._volumeEnd = volume;
    }

    public update(dt: number) {
        if (this._time < this._duration) {
            this._time += dt;
            this._source.volume = lerp(this._volumeStart, this._volumeEnd, clamp01(this._time / this._duration));
            if (Math.abs(this._source.volume - this._volumeEnd) <= 0.01) {
                if (this._volumeEnd === 0) {
                    this._source.stop();
                }
                this._time = this._duration;
                this._callback && this._callback();
            }
        }
    }
}

class AudioSystem extends System {
    private _frame: number = 0;
    private _vol: number = 1;
    private _bgm: AudioFade = null;
    private _sfx: AudioFade = new AudioFade();
    private _bgm0: AudioFade = new AudioFade();
    private _bgm1: AudioFade = new AudioFade();
    private _mute: boolean = false;

    public get mute() {
        return this._mute;
    }

    public set mute(v: boolean) {
        if (this._mute !== v) {
            this._mute = v;
            this._vol = v ? 0 : 1;
            if (this._bgm) {
                if (v) this._bgm.pause();
                else this._bgm.resume();
            }
        }
    }

    public async play(url: string | AudioClip, volume: number = 1, loop: boolean = false, oneshot: boolean = true) {
        let vol = this._vol * volume;
        if (vol === 0 || !url) return;

        try {
            let clip = (url instanceof AudioClip ? url : await Resources.Load(url, AudioClip)) as AudioClip & { __frame?: number };
            if (clip && (!clip.__frame || (clip.__frame < this._frame - 5))) {
                clip.__frame = this._frame;
                this._sfx.play(clip, vol, loop, oneshot);
            }
        }
        catch (err) {
            console.error(err);
        }
    }

    public stop() {
        this._sfx.stop();
    }

    public async playBGM(url: string | AudioClip, volume: number = 1, fadeOut: boolean = true) {
        let vol = this._vol * volume;
        if (vol === 0 || !url) return;

        try {
            let clip = url instanceof AudioClip ? url : await Resources.Load(url, AudioClip);
            if (fadeOut) {
                if (this._bgm) {
                    this._bgm.fade(0);
                }
                this._bgm = this._bgm === this._bgm0 ? this._bgm1 : this._bgm0;
                this._bgm.play(clip, 0, true);
                this._bgm.fade(vol);
            }
            else {
                this._bgm0.play(clip, vol, true);
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    public stopBGM(fadeOut: boolean = true) {
        if (!this._bgm) return;

        if (fadeOut) {
            this._bgm.fade(0);
        }
        else {
            this._bgm.stop();
        }

    }

    public update(dt: number) {
        this._frame++;
        this._bgm0.update(dt);
        this._bgm1.update(dt);
    }
}

export const audioSystem = new AudioSystem();
director.registerSystem("AudioSystem", audioSystem, 200);