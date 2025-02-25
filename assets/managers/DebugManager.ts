import { _decorator, Component, director, EventTouch,  MeshRenderer, Node } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('DebugManager')
@executeInEditMode
export class DebugManager extends Component {

    @property(Node)
    ship: Node = null;

    @property(Node)
    monkey: Node = null;

    onClickLaunch() {

    }

    onClickState(event: EventTouch, state: string) {

    }
}