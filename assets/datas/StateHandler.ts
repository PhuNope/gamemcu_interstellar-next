import { Component, Node } from "cc";

let stateCount: number = 0;

export interface StateHandlerInterface<T extends Node | Component = Node> {
    target: T;
    name?: string;
    onEnter?(): void;
    onExit?(): void;
    onUpdate?(dt: number): void;
    [k: string]: any;
}

export class StateHandler<T extends Node | Component = Node> {
    id: string = "" + stateCount++;
    name: string = "none";
    active: boolean = true;
    target: T = null;
    onEnter?(): void;
    onExit?(): void;
    onUpdate?(dt: number): void;

    constructor(props?: StateHandlerInterface<T>) {
        Object.assign(this, props);
    }
}
