import { Component, Node } from "cc";
import { StateHandler, StateHandlerInterface } from "./StateHandler";

export class StateManager<S extends string> {

    private _state: S = null;
    private _handlersMap: Map<string, StateHandler<Node | Component>[]> = new Map();

    get state() {
        return this._state;
    }
    set state(v: S) {
        if (this._state === v) {
            return;
        }
        let handlers = this._handlersMap.get(v);
        if (handlers) {
            this._exitState();
            handlers.forEach(handler => {
                if (handler.active) {
                    handler.onEnter && handler.onEnter();
                    this._state = v;
                }
            })
        }
        else {
            console.warn(`state: ${v} not exist !!`);
        }
    }

    private _exitState() {
        if (this._state) {
            this._handlersMap.get(this._state).forEach(curr => {
                if (curr.active) {
                    curr.onExit && curr.onExit()
                }
            });
            this._state = null;
        }
    }

    clear() {
        this._exitState();
        this._handlersMap.clear();
    }

    setStateHandler<T extends Node | Component = Node>(value: StateHandler<T> | StateHandlerInterface<T>) {
        const handler = value instanceof StateHandler ? value : new StateHandler(value);
        const state = handler.name || handler.constructor.name;

        let handlers = this._handlersMap.get(state);
        if (handlers === undefined) {
            handlers = [];
            this._handlersMap.set(state, handlers);
        }

        handlers.push(handler);
    }

    update(dt: number) {
        if (this._state) {
            this._handlersMap.get(this._state).forEach(handler => {
                if (handler.active) {
                    handler.onUpdate && handler.onUpdate(dt);
                }
            })
        }
    }
}