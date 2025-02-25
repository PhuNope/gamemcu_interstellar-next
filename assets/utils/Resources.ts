import { Asset, resources, error, director, Director, Scene, Node } from "cc";

type Nullable<T> = T | null;

export class Resources {
    public static Load<T extends Asset>(paths: string | string[], type: new (...args: any[]) => T, node?: Node, fail?: Function) {
        return new Promise<Nullable<T>>((resolve, reject) => {
            resources.load(paths as any, type, (err, asset) => {
                if (err) {
                    error(`Resources.Load error: ${err}`)
                    if (!node || node.isValid) {
                        resolve(null);
                    }
                    else {
                        fail && fail();
                    }
                }
                else {
                    if (!node || node.isValid) {
                        resolve(asset);
                    }
                    else {
                        fail && fail();
                    }
                }
            })
        })
    }

    public static LoadScene(sceneName: string, onProgress?: Director.OnLoadSceneProgress) {
        return new Promise<Scene>((resolve, reject) => {
            director.preloadScene(sceneName, onProgress, (err, asset) => {
                if (err) {
                    error(`Resources.Load error: ${err}`)
                    resolve(null)
                }
                else {
                    director.loadScene(sceneName, (err, scene) => {
                        resolve(scene);
                    });
                }
            });
        })
    }
}