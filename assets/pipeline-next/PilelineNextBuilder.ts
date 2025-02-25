import { director, renderer, rendering, PipelineEventType, gfx, IVec4Like, math, __private, Vec4, pipeline, sys } from "cc";
import { PipelineNextSettings, TonemapType } from "./PipelineNextSettings";
import { DEBUG, EDITOR } from "cc/env";

//fix engine bug
if (sys.platform.endsWith("BROWSER")) {
    pipeline.UBOSkinning.initLayout(Math.floor(pipeline.UBOSkinning.JOINT_UNIFORM_CAPACITY));
}

const { CameraUsage } = renderer.scene;

type RenderCamera = renderer.scene.Camera & { next: PipelineNextSettings }

interface RenderTextureInfo {
    name: string;
    width: number;
    height: number;
}

interface WindowInfo extends RenderTextureInfo {
    id: number;
    depthStencilName: string;
}

interface Settings {
    isHDR: boolean;
    useFloatOutput: boolean;
}

let windowId: number = 0;
let windowMap: Map<__private._cocos_render_scene_core_render_window__RenderWindow, number> = new Map();
export function getWindowId(window: __private._cocos_render_scene_core_render_window__RenderWindow) {
    let id = windowMap.get(window);
    if (id === undefined) {
        id = windowId++;
        windowMap.set(window, id);
    }
    return id;
}

function forwardNeedClearColor(camera: RenderCamera): boolean {
    return !!(camera.clearFlag & (gfx.ClearFlagBit.COLOR | (gfx.ClearFlagBit.STENCIL << 1)));
}

function useForwardPipeline(camera: any) {
    let isEditorView = camera.cameraUsage === CameraUsage.SCENE_VIEW;
    let next = isEditorView ? camera.next = PipelineNextSettings.Instance : camera.next;
    if (next === undefined || (EDITOR && !next.preview)) {
        return false;
    }
    if (next.base.material) {
        return true;
    }
    return false;
}

function addRenderPass(ppl: rendering.BasicPipeline, source: RenderTextureInfo, destination: RenderTextureInfo, layoutName: string) {
    const pass = ppl.addRenderPass(destination.width, destination.height, layoutName);
    pass.addTexture(source.name, "mainTexture");
    pass.addRenderTarget(destination.name, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE);
    return pass;
}

export class PilelineNextBuilder implements rendering.PipelineBuilder {
    private _clearColor: gfx.Color = new gfx.Color();
    private _viewport: gfx.Viewport = new gfx.Viewport();
    private _windows: Map<number, { width: number, height: number }> = new Map();
    private _windowInfo: WindowInfo = { id: 0, width: 1, height: 1, name: "", depthStencilName: "" };
    private _passStates: Map<string, { flags: number }> = new Map();
    private _settings: Settings = { isHDR: true, useFloatOutput: true };

    setup(cameras: RenderCamera[], pipeline: rendering.BasicPipeline): void {
        for (const camera of cameras) {
            if (!camera.scene || !camera.window) {
                continue;
            }

            this._getSettings(camera, pipeline);
            this._getWindowInfo(camera, pipeline);

            director.root.pipelineEvent.emit(PipelineEventType.RENDER_CAMERA_BEGIN, camera);

            if (useForwardPipeline(camera)) {
                this._buildForwardPipeline(camera, pipeline);
            } else {
                this._buildSimplePipeline(camera, pipeline);
            }

            director.root.pipelineEvent.emit(PipelineEventType.RENDER_CAMERA_END, camera);
        }
    }

    private _getSettings(camera: RenderCamera, ppl: rendering.BasicPipeline) {
        let state = this._getPassState("Settings");
        if (state.flags === 0) {
            state.flags |= 1;
            const settings = this._settings;
            settings.isHDR = ppl.pipelineSceneData.isHDR;
            settings.useFloatOutput = ppl.getMacroBool("CC_USE_FLOAT_OUTPUT");
        }
    }

    private _getWindowInfo(camera: RenderCamera, ppl: rendering.BasicPipeline) {
        const window = camera.window;
        const windowInfo = this._windowInfo;
        const id = windowInfo.id = getWindowId(window);
        const width = windowInfo.width = Math.max(Math.floor(window.width), 1);
        const height = windowInfo.height = Math.max(Math.floor(window.height), 1);
        const colorName = windowInfo.name = `Color${id}`;
        const depthStencilName = windowInfo.depthStencilName = `DepthStencil${id}`;

        let info = this._windows.get(id);
        if (info === undefined) {
            this._windows.set(id, { width, height });
        }
        if (!info || info.width !== width || info.height !== height) {
            ppl.addRenderWindow(colorName, gfx.Format.RGBA8, width, height, window);
            ppl.addDepthStencil(depthStencilName, gfx.Format.DEPTH_STENCIL, width, height);
        }
    }

    private _getPassState<T extends { flags: number }>(name: string): T {
        let state = this._passStates.get(name);
        if (state === undefined) {
            state = { flags: 0 };
            this._passStates.set(name, state);
        }
        return state as any;
    }


    private _getViewport(viewport: math.Rect, width: number, height: number) {
        this._viewport.left = Math.round(viewport.x * width);
        this._viewport.top = Math.round(viewport.y * height);
        // Here we must use camera.viewport.width instead of camera.viewport.z, which
        // is undefined on native platform. The same as camera.viewport.height.
        this._viewport.width = Math.max(Math.round(viewport.width * width), 1);
        this._viewport.height = Math.max(Math.round(viewport.height * height), 1);
        return this._viewport;
    }

    private _getClearColor(clearColor: IVec4Like) {
        return this._clearColor.set(clearColor.x, clearColor.y, clearColor.z, clearColor.w);
    }

    private _buildForwardPipeline(camera: RenderCamera, ppl: rendering.BasicPipeline) {
        const { id, width, height } = this._windowInfo;

        let state = this._getPassState<{
            flags: number;
            source: RenderTextureInfo;
            destination: RenderTextureInfo;
            depthStencil: RenderTextureInfo;
        }>("ForwardPass");

        if (state.flags === 0) {
            state.flags |= 1;

            const source = state.source = { name: `ForwardColor0${id}`, width, height };
            const destination = state.destination = { name: `ForwardColor1${id}`, width, height };
            const depthStencil = state.depthStencil = { name: `ForwardDS${id}`, width, height };

            ppl.addRenderTarget(source.name, gfx.Format.RGBA16F, source.width, source.height);
            ppl.addRenderTarget(destination.name, gfx.Format.RGBA16F, destination.width, destination.height);
            ppl.addDepthStencil(depthStencil.name, gfx.Format.DEPTH_STENCIL, depthStencil.width, depthStencil.height);
        }

        let source = state.source;
        let destination = state.destination;
        let temp = source;

        this._addRenderPass(camera, ppl, source, state.depthStencil);

        let next = camera.next;
        if (next.fxaa.enable && next.fxaa.material) {
            this._addFxaaPass(camera, ppl, source, destination);
            temp = source; source = destination; destination = temp;
        }

        if (next.bloom.enable && next.bloom.material) {
            this._addBloomPass(camera, ppl, source, destination);
            temp = source; source = destination; destination = temp;
        }

        this._addToneMapPass(camera, ppl, source, this._windowInfo);
    }

    private _addToneMapPass(camera: RenderCamera, ppl: rendering.BasicPipeline, source: RenderTextureInfo, destination: RenderTextureInfo) {
        let state = this._getPassState<{
            flags: number;
            tonemapParams: Vec4;
        }>("ToneMapPass");

        if (state.flags === 0) {
            state.flags |= 1;
            state.tonemapParams = new Vec4(0, 0, 0, 0);
        }

        let base = camera.next.base;
        let tonemap = camera.next.tonemap;
        if (tonemap.enable) {
            const pass = addRenderPass(ppl, source, destination, tonemap.type === TonemapType.STANDARD ? "tonemap" : "tonemap-rgb");
            pass.setVec4("cc_debug_view_mode", state.tonemapParams.set(tonemap.intensity, tonemap.damage, 0, 0));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(base.material, tonemap.type === TonemapType.STANDARD ? 1 : 2);
            pass.addQueue(rendering.QueueHint.BLEND).addScene(camera, rendering.SceneFlags.UI);
            if (camera.name === "Main Camera") {
                pass.showStatistics = DEBUG;
            }
        }
        else {
            const pass = addRenderPass(ppl, source, destination, "blit");
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(base.material, 0);
            pass.addQueue(rendering.QueueHint.BLEND).addScene(camera, rendering.SceneFlags.UI);
            if (camera.name === "Main Camera") {
                pass.showStatistics = DEBUG;
            }
        }
    }

    private _addFxaaPass(camera: RenderCamera, ppl: rendering.BasicPipeline, source: RenderTextureInfo, destination: RenderTextureInfo) {
        let state = this._getPassState<{
            flags: number;
            texelSize: Vec4;
        }>("FXAAPass");

        if (state.flags === 0) {
            state.flags |= 1;
            const { width, height } = this._windowInfo;
            state.texelSize = new Vec4(1 / width, 1 / height, 0, 0);
        }

        const fxaa = camera.next.fxaa;
        const pass = addRenderPass(ppl, source, destination, "fxaa");
        pass.setVec4("cc_debug_view_mode", state.texelSize);
        pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fxaa.material, 0);
    }

    private _addBloomPass(camera: RenderCamera, ppl: rendering.BasicPipeline, source: RenderTextureInfo, destination: RenderTextureInfo) {
        let state = this._getPassState<{
            flags: number;
            bloomParams: Vec4;
            prefilterColor: RenderTextureInfo;
            downsampleColors: RenderTextureInfo[];
            upsampleColors: RenderTextureInfo[];
        }>("BloomPass");

        if (state.flags === 0) {
            state.flags |= 1;
            state.bloomParams = new Vec4();

            const { id, width, height } = this._windowInfo;
            const format = this._settings.useFloatOutput ? gfx.Format.RGBA16F : gfx.Format.RGBA8;

            let shadingScale = 0.5;
            const prefilterColor = state.prefilterColor = { name: `prefilterColor${id}`, width: Math.floor(width * shadingScale), height: Math.floor(height * shadingScale) };
            ppl.addRenderTarget(prefilterColor.name, format, prefilterColor.width, prefilterColor.height);

            const iterations = 8;
            const downsampleColors = state.downsampleColors = [];
            for (let i = 0; i < iterations; i++) {
                shadingScale *= 0.5;
                const sample = downsampleColors[i] = { name: `downsampleColor${id}${i}`, width: Math.floor(width * shadingScale), height: Math.floor(height * shadingScale) };
                ppl.addRenderTarget(sample.name, format, sample.width, sample.height);
            }

            const upsampleColors = state.upsampleColors = [];
            for (let i = 0, n = iterations - 1; i < n; i++) {
                shadingScale *= 2;
                const sample = upsampleColors[i] = { name: `upsampleColor${id}${i}`, width: Math.floor(width * shadingScale), height: Math.floor(height * shadingScale) };
                ppl.addRenderTarget(sample.name, format, sample.width, sample.height);
            }
        }

        const bloom = camera.next.bloom;

        const prefilter = addRenderPass(ppl, source, state.prefilterColor, "bloom-prefilter");
        prefilter.setVec4("cc_debug_view_mode", state.bloomParams.set(0, 0, bloom.threshold, 0));
        prefilter.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(bloom.material, 0);

        const downsampleColors = state.downsampleColors;
        for (let i = 0; i < downsampleColors.length; i++) {
            const downsampleSource = i === 0 ? state.prefilterColor : downsampleColors[i - 1];
            const downsample = addRenderPass(ppl, downsampleSource, downsampleColors[i], "bloom-downsample");
            downsample.setVec4("cc_debug_view_mode", state.bloomParams.set(1 / downsampleSource.width, 1 / downsampleSource.height, 0, 0));
            downsample.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(bloom.material, 1);
        }

        const lastIndex = downsampleColors.length - 1;
        const upsampleColors = state.upsampleColors;
        for (let i = 0; i < upsampleColors.length; i++) {
            const upsampleSource = i === 0 ? downsampleColors[lastIndex] : upsampleColors[i - 1];
            const upsample = addRenderPass(ppl, upsampleSource, upsampleColors[i], "bloom-upsample");
            upsample.addTexture(downsampleColors[lastIndex - 1 - i].name, "downsampleTexture");
            upsample.setVec4("cc_debug_view_mode", state.bloomParams.set(1 / upsampleSource.width, 1 / upsampleSource.height, 0, 0));
            upsample.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(bloom.material, 2);
        }

        const combine = addRenderPass(ppl, source, destination, "bloom-combine");
        combine.addTexture(upsampleColors[upsampleColors.length - 1].name, "bloomTexture");
        combine.setVec4("cc_debug_view_mode", state.bloomParams.set(0, 0, bloom.threshold, bloom.intensity));
        combine.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(bloom.material, 3);

    }

    private _addRenderPass(camera: RenderCamera, ppl: rendering.BasicPipeline, source: RenderTextureInfo, depthStencil: RenderTextureInfo) {
        const { id } = this._windowInfo;

        let state = this._getPassState<{
            flags: number;
            shadowMap: RenderTextureInfo;
            intensiy: Vec4;
        }>("RenderPass");

        if (state.flags === 0) {
            state.flags |= 1;
            const shadows = ppl.pipelineSceneData.shadows;
            state.shadowMap = { name: `shadowMap${id}`, width: shadows.size.x, height: shadows.size.y };
            state.intensiy = new Vec4();
        }

        // const pass = ppl.addMultisampleRenderPass(source.width, source.height, 8, 0, 'default');
        const pass = ppl.addRenderPass(source.width, source.height, "default");

        // bind output render target
        if (forwardNeedClearColor(camera)) {
            pass.addRenderTarget(source.name, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this._getClearColor(camera.clearColor));
        } else {
            pass.addRenderTarget(source.name, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }

        // bind depth stencil buffer
        if (camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL) {
            pass.addDepthStencil(
                depthStencil.name,
                gfx.LoadOp.CLEAR,
                gfx.StoreOp.DISCARD,
                camera.clearDepth,
                camera.clearStencil,
                camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(depthStencil.name, gfx.LoadOp.LOAD, gfx.StoreOp.DISCARD);
        }

        let base = camera.next.base;
        pass.setViewport(this._getViewport(camera.viewport, source.width, source.height));
        pass.setVec4("cc_debug_view_mode", state.intensiy.set(base.intensity, 0, 0, 0));
        pass.addQueue(rendering.QueueHint.OPAQUE).addScene(camera, rendering.SceneFlags.OPAQUE);
        pass.addQueue(rendering.QueueHint.BLEND).addScene(camera, rendering.SceneFlags.BLEND);
    }


    private _buildSimplePipeline(camera: RenderCamera, ppl: rendering.BasicPipeline) {
        const { width, height, name, depthStencilName } = this._windowInfo;

        const pass = ppl.addRenderPass(width, height, "default");

        // bind output render target
        if (forwardNeedClearColor(camera)) {
            pass.addRenderTarget(name, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this._getClearColor(camera.clearColor));
        } else {
            pass.addRenderTarget(name, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }

        // bind depth stencil buffer
        if (camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL) {
            pass.addDepthStencil(
                depthStencilName,
                gfx.LoadOp.CLEAR,
                gfx.StoreOp.DISCARD,
                camera.clearDepth,
                camera.clearStencil,
                camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(depthStencilName, gfx.LoadOp.LOAD, gfx.StoreOp.DISCARD);
        }

        pass.setViewport(this._getViewport(camera.viewport, width, height));
        pass.addQueue(rendering.QueueHint.OPAQUE).addScene(camera, rendering.SceneFlags.OPAQUE);

        const flags = rendering.SceneFlags.BLEND | rendering.SceneFlags.UI;
        pass.addQueue(rendering.QueueHint.BLEND).addScene(camera, flags);
    }

}

rendering.setCustomPipeline("next", new PilelineNextBuilder());