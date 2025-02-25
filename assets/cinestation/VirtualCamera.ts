import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Lens')
class Lens {
    @property
    fov: number = 45;
    @property
    near: number = 10;
    @property
    far: number = 1000;
}

@ccclass('VirtualCamera')
export class VirtualCamera extends Component {

    @property({ visible: false })
    lens: Lens = new Lens();
}

