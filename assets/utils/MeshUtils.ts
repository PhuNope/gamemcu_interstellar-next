import { gfx, Mesh, primitives, utils } from "cc";
import { randomRange, randomSpread } from "./Math";

export function initParticleMesh(mesh: Mesh, type: number = 0) {
    let indices = mesh.readIndices(0);
    if (indices === null) {
        return;
    }

    const attributes = {
        a_position: "positions",
        a_normal: "normals",
        a_tangent: "tangents",
        a_texCoord: "uvs",
        a_color: "colors",
    }

    const geometry: primitives.IGeometry = {} as any;
    const subMesh = mesh.renderingSubMeshes[0];

    //remove indices
    subMesh.attributes.forEach(attr => {
        const array = geometry[attributes[attr.name]] = [];
        const attribute = mesh.readAttribute(0, attr.name as any);

        let k = 0;
        switch (attr.format) {
            case gfx.Format.RGBA32F:
                indices.forEach(v => {
                    k = v * 4;
                    array.push(attribute[k + 0], attribute[k + 1], attribute[k + 2], attribute[k + 3]);
                });
                break;
            case gfx.Format.RGB32F:
                indices.forEach(v => {
                    k = v * 3;
                    array.push(attribute[k + 0], attribute[k + 1], attribute[k + 2]);
                });
                break;
            case gfx.Format.RG32F:
                indices.forEach(v => {
                    k = v * 2;
                    array.push(attribute[k + 0], attribute[k + 1]);
                });
                break;
        }
    })

    const { positions } = geometry;

    const centroid = [];
    for (let i = 0; i < positions.length; i += 9) {
        let x = (positions[i + 0] + positions[i + 3] + positions[i + 6]) / 3;
        let y = (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3;
        let z = (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3;
        for (let j = 0; j < 3; j++) {
            centroid.push(x, y, z);
        }
    }

    const height = 0.5;
    const controlPoint0 = [];
    const controlPoint1 = [];

    for (let i = 0; i < centroid.length; i += 9) {
        let x0 = centroid[i + 0] + randomSpread(0.5);
        let y0 = centroid[i + 1] + randomRange(0.1, 0.5) * height;
        let z0 = centroid[i + 2] + randomRange(0.1, 0.5);

        let x1 = centroid[i + 0] + randomSpread(0.5);
        let y1 = centroid[i + 1];
        let z1 = centroid[i + 2] - randomRange(0.1, 0.5);

        for (let j = 0; j < 3; j++) {
            controlPoint0.push(x0, y0, z0);
            controlPoint1.push(x1, y1, z1);
        }
    }

    const endPosition = [];

    for (let i = 0; i < centroid.length; i += 9) {
        let x = centroid[i + 0] + randomSpread(1);
        let y = centroid[i + 1] + (type === 0 ? randomRange(1, 1.5) : randomRange(0, 0.5)) * height;
        let z = randomSpread(1.5);

        for (let j = 0; j < 3; j++) {
            endPosition.push(x, y, z);
        }
    }

    geometry.customAttributes = [
        { attr: new gfx.Attribute("a_centroid", gfx.Format.RGB32F), values: centroid },
        { attr: new gfx.Attribute("a_controlPoint0", gfx.Format.RGB32F), values: controlPoint0 },
        { attr: new gfx.Attribute("a_controlPoint1", gfx.Format.RGB32F), values: controlPoint1 },
        { attr: new gfx.Attribute("a_endPosition", gfx.Format.RGB32F), values: endPosition },
    ]

    return utils.MeshUtils.createMesh(geometry as any);
}