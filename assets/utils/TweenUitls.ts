import { TweenSystem } from "cc";

export function killTweenOf(target: Object) {
    TweenSystem.instance.ActionManager.removeAllActionsFromTarget(target as any);
}