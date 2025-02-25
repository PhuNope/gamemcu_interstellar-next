import { Mesh } from "cc";
import { Hand } from "./Hand";
import { Ship } from "./Ship";
import { User } from "./User";

class Properties {
    ship: Ship = new Ship();
    hand: Hand = new Hand();
    user: User = new User();
    shipParticleMesh: Mesh = null;
}

export const properties = new Properties();