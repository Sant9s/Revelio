import { writeFileSync } from "node:fs";

// Rebuild the original, metre-scale avatar: node tools/generate_survivor.mjs
// The character faces Godot's forward direction (-Z).
const palette = {
  jacket: "#77775a", canvas: "#9a8b68", seam: "#57543d", trousers: "#5b584c",
  leather: "#5a4534", boots: "#413833", sole: "#252424", brass: "#92826c",
  pack: "#69684c", flap: "#827858", scarf: "#814c38", skin: "#b48468",
  goggles: "#33302b", lenses: "#46565a",
};
const pieces = [];
const tau = 2 * Math.PI;
const spow = (n, exponent) => Math.sign(n) * Math.pow(Math.abs(n), exponent);
const linear = (n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;

// A loft of rounded cross-sections makes tapered, curved garments.
// Each row is [height, centre X, centre Z, half width, half depth].
function loft(name, material, rings, { exponent = 1, segments = 24, folds = 0, map = (p) => p } = {}) {
  const p = [], t = [];
  rings.forEach(([y, x, z, rx, rz], row) => {
    for (let i = 0; i < segments; i++) {
      const a = i * tau / segments;
      const fold = 1 + folds * (Math.sin(5 * a + row * 0.8) + 0.4 * Math.cos(9 * a - row));
      p.push(map([x + rx * spow(Math.cos(a), exponent) * fold, y, z + rz * spow(Math.sin(a), exponent) * fold]));
      if (row > 0) {
        const lo = (row - 1) * segments + i;
        const hi = row * segments + i;
        const next = (i + 1) % segments - i;
        t.push(lo, hi, lo + next, lo + next, hi, hi + next);
      }
    }
  });
  for (const [row, reverse] of [[0, false], [rings.length - 1, true]]) {
    const [y, x, z] = rings[row];
    const centre = p.push(map([x, y, z])) - 1;
    for (let i = 0; i < segments; i++) {
      const a = row * segments + i;
      const b = row * segments + (i + 1) % segments;
      t.push(centre, reverse ? b : a, reverse ? a : b);
    }
  }
  pieces.push({ name, material, p, t });
}

function rounded(name, material, c, size, exponent = 1, tilt = 0) {
  const rings = Array.from({ length: 13 }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI * i / 12;
    const k = Math.max(0.005, Math.cos(a)) ** exponent;
    return [size[1] * spow(Math.sin(a), exponent), 0, 0, size[0] * k, size[2] * k];
  });
  loft(name, material, rings, { exponent, map: ([x, y, z]) => [
    c[0] + Math.cos(tilt) * x - Math.sin(tilt) * y,
    c[1] + Math.sin(tilt) * x + Math.cos(tilt) * y, c[2] + z,
  ] });
}

for (const side of [-1, 1]) {
  const label = side < 0 ? "Left" : "Right";
  loft(label + "Trouser", "trousers", [
    [0.17, .116, .027, .066, .072], [.25, .115, .022, .069, .078],
    [.34, .108, .027, .075, .077], [.43, .103, .013, .071, .081],
    [.50, .106, -.012, .078, .09], [.59, .106, .001, .085, .093],
    [.70, .106, .015, .088, .105], [.81, .094, .013, .092, .103],
    [.92, .086, .013, .083, .092],
  ].map(([y, x, z, w, d]) => [y, x * side, z, w, d]), { folds: .045 });
  rounded(label + "CargoPocket", "jacket", [.158 * side, .658, .009], [.047, .093, .068], .57, -.12 * side);
  rounded(label + "CargoFlap", "seam", [.173 * side, .72, .006], [.043, .023, .062], .56);
  loft(label + "BootUpper", "boots", [
    [.029, .117 * side, -.050, .070, .119], [.047, .117 * side, -.052, .073, .118],
    [.080, .117 * side, -.052, .070, .109], [.112, .116 * side, -.023, .063, .083],
    [.155, .116 * side, .020, .067, .078], [.215, .116 * side, .026, .073, .083],
    [.240, .116 * side, .025, .074, .085],
  ], { exponent: .74, folds: .022 });
  loft(label + "Tread", "sole", [
    [.006, .117 * side, -.05, .064, .115], [.017, .117 * side, -.05, .074, .123],
    [.035, .117 * side, -.05, .074, .123], [.043, .117 * side, -.05, .069, .117],
  ], { exponent: .66 });
  for (let i = 0; i < 3; i++) {
    rounded(label + "Lace" + i, "canvas", [.116 * side, .105 + i * .016, -.103 + i * .022], [.038, .004, .005]);
  }
  loft(label + "Sleeve", "jacket", [
    [.795, .279, -.016, .044, .044], [.823, .278, -.011, .048, .045],
    [.868, .274, .005, .052, .050], [.95, .267, .022, .059, .057],
    [1.02, .251, .022, .061, .060], [1.085, .233, .015, .063, .065],
    [1.19, .213, .012, .068, .070], [1.30, .185, .009, .074, .075],
    [1.35, .167, .009, .055, .060],
  ].map(([y, x, z, w, d]) => [y, x * side, z, w, d]), { folds: .045 });
  rounded(label + "Cuff", "seam", [.28 * side, .814, -.014], [.049, .025, .047], .62);
  rounded(label + "Glove", "leather", [.281 * side, .759, -.021], [.037, .058, .033], .75);
  rounded(label + "Thumb", "leather", [.25 * side, .766, -.035], [.018, .028, .018], .86);
  rounded(label + "KneePatch", "seam", [.105 * side, .485, -.089], [.053, .067, .022], .64);
}

loft("FieldJacket", "jacket", [
  [.787, 0, .008, .161, .107], [.812, 0, .008, .171, .113],
  [.862, 0, .008, .171, .116], [.929, 0, .003, .152, .105],
  [1.013, 0, .003, .155, .111], [1.097, 0, .004, .171, .124],
  [1.183, 0, .003, .185, .125], [1.253, 0, .007, .187, .116],
  [1.302, 0, .010, .176, .107], [1.337, 0, .011, .118, .092],
  [1.363, 0, .010, .075, .070],
], { exponent: .88, folds: .033 });
rounded("Zipper", "seam", [0, 1.058, -.116], [.009, .219, .014], .55);
for (const side of [-1, 1]) {
  rounded("ChestPocket", "seam", [.096 * side, 1.15, -.107], [.053, .066, .024], .62, -.13 * side);
  rounded("ChestFlap", "canvas", [.097 * side, 1.187, -.128], [.053, .022, .012], .65, -.13 * side);
  rounded("Harness", "leather", [.122 * side, 1.171, -.096], [.022, .161, .03], .68, -.18 * side);
  rounded("HarnessOverShoulder", "leather", [.122 * side, 1.308, .01], [.023, .024, .102], .65, -.28 * side);
  rounded("HarnessBuckle", "brass", [.137 * side, 1.145, -.13], [.023, .019, .011], .63);
}
rounded("FieldBelt", "leather", [0, .899, .003], [.162, .032, .113], .62);
rounded("Buckle", "brass", [0, .894, -.112], [.038, .022, .014], .52);
rounded("HipPouch", "canvas", [.153, .88, .045], [.053, .085, .061], .66, .13);

loft("Head", "skin", [
  [1.345, 0, .003, .049, .048], [1.392, 0, .001, .052, .05],
  [1.411, 0, -.019, .052, .058], [1.433, 0, -.011, .068, .074],
  [1.470, 0, 0, .077, .084], [1.518, 0, .004, .078, .082],
  [1.556, 0, .009, .068, .070], [1.582, 0, .009, .044, .046],
], { exponent: .90 });
rounded("Scarf", "scarf", [0, 1.383, -.010], [.089, .061, .086], .70);
rounded("ScarfFold", "scarf", [-.022, 1.35, -.074], [.067, .075, .024], .75, -.18);
rounded("NoseBridge", "skin", [0, 1.458, -.081], [.016, .029, .020], .88);
rounded("GoggleStrap", "goggles", [0, 1.500, .006], [.081, .012, .084], .62);
for (const side of [-1, 1]) {
  rounded("GoggleFrame", "goggles", [.041 * side, 1.492, -.079], [.038, .027, .018], .70);
  rounded("GoggleLens", "lenses", [.041 * side, 1.492, -.094], [.028, .020, .009], .73);
}
loft("CanvasCap", "canvas", [
  [1.528, 0, .008, .078, .080], [1.535, 0, .011, .087, .086],
  [1.557, 0, .012, .089, .089], [1.584, 0, .012, .083, .083],
  [1.613, 0, .013, .071, .068], [1.632, 0, .013, .042, .044],
  [1.641, 0, .013, .007, .009],
], { folds: .023 });
rounded("CapVisor", "seam", [0, 1.536, -.076], [.080, .010, .065], .78);

rounded("CanvasPack", "pack", [0, 1.113, .183], [.147, .204, .111], .57, -.055);
rounded("PackFrontPocket", "flap", [.009, 1.048, .273], [.111, .092, .038], .56, -.065);
rounded("PackFlap", "canvas", [0, 1.222, .245], [.143, .062, .071], .59, -.055);
rounded("PackStrap", "leather", [.009, 1.138, .300], [.021, .118, .013], .64, -.055);
rounded("PackBuckle", "brass", [.009, 1.142, .311], [.022, .020, .010], .63, -.055);
rounded("Canteen", "leather", [-.150, 1.038, .176], [.045, .079, .050], .74, -.13);
rounded("CanteenCap", "brass", [-.162, 1.118, .178], [.018, .022, .021], .65);
loft("Bedroll", "seam", [
  [-.145, 0, 0, .025, .025], [-.134, 0, 0, .045, .045], [-.10, 0, 0, .048, .047],
  [0, 0, 0, .046, .047], [.10, 0, 0, .047, .048], [.134, 0, 0, .045, .044],
  [.144, 0, 0, .025, .025],
], { folds: .029, map: ([x, y, z]) => [y, 1.306 - x, .214 + z] });

const gltf = { asset: { version: "2.0", generator: "Revelio survivor mesh" }, scene: 0,
  scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], buffers: [{ byteLength: 0 }],
  bufferViews: [], accessors: [], skins: [] };
const chunks = [];
let offset = 0;
function accessor(data, componentType, type, count, target, bounds = {}) {
  const buffer = Buffer.from(data.buffer);
  const view = gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buffer.length, target }) - 1;
  const padding = Buffer.alloc((4 - buffer.length % 4) % 4);
  chunks.push(buffer, padding);
  offset += buffer.length + padding.length;
  return gltf.accessors.push({ bufferView: view, componentType, type, count, ...bounds }) - 1;
}
for (const [name, hex] of Object.entries(palette)) {
  const rgb = hex.slice(1).match(/../g).map((x) => linear(parseInt(x, 16) / 255));
  gltf.materials.push({ name, pbrMetallicRoughness: { baseColorFactor: [...rgb, 1],
    metallicFactor: name === "brass" ? .44 : 0, roughnessFactor: name === "lenses" ? .35 : .88 } });
}

// Joint positions are in model space, with the bind pose matching the garment mesh.
const joints = [];
const jointIds = new Map();
function joint(name, position, parent = null) {
  const translation = parent === null ? position : position.map((v, i) => v - joints[parent][i]);
  const id = gltf.nodes.push({ name, translation }) - 1;
  joints.push(position);
  jointIds.set(name, id);
  if (parent !== null) (gltf.nodes[parent].children ??= []).push(id);
  else gltf.scenes[0].nodes.push(id);
  return id;
}
const pelvis = joint("Pelvis", [0, .86, .012]);
const spine = joint("Spine", [0, 1.035, .005], pelvis);
joint("HeadJoint", [0, 1.36, .003], spine);
for (const [side, sign] of [["Left", -1], ["Right", 1]]) {
  const thigh = joint(side + "Thigh", [.102 * sign, .891, .014], pelvis);
  const shin = joint(side + "Shin", [.106 * sign, .50, -.012], thigh);
  joint(side + "Foot", [.116 * sign, .195, .022], shin);
  const shoulder = joint(side + "Shoulder", [.183 * sign, 1.30, .010], spine);
  const elbow = joint(side + "Elbow", [.251 * sign, 1.018, .021], shoulder);
  joint(side + "Wrist", [.279 * sign, .814, -.013], elbow);
}
const bindMatrices = joints.flatMap(([x, y, z]) => [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1,
]);
gltf.skins.push({
  skeleton: pelvis,
  joints: joints.map((_, i) => i),
  inverseBindMatrices: accessor(Float32Array.from(bindMatrices), 5126, "MAT4", joints.length),
});

const smoothstep = (min, max, v) => {
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
  return t * t * (3 - 2 * t);
};
function vertexSkin(name, y) {
  const part = /^(Left|Right)(.*)$/.exec(name);
  if (part) {
    const [, side, label] = part;
    if (label === "Trouser") {
      if (y > .77) return [side + "Thigh", "Pelvis", smoothstep(.77, .92, y)];
      return [side + "Shin", side + "Thigh", smoothstep(.45, .55, y)];
    }
    if (label === "Sleeve") {
      if (y > 1.23) return [side + "Shoulder", "Spine", smoothstep(1.23, 1.35, y) * .72];
      return [side + "Elbow", side + "Shoulder", smoothstep(.96, 1.08, y)];
    }
    if (/^Cargo/.test(label)) return [side + "Thigh"];
    if (label === "KneePatch") return [side + "Shin", side + "Thigh", smoothstep(.43, .54, y)];
    if (/^(Boot|Tread|Lace)/.test(label)) return [side + "Foot"];
    if (/^(Cuff|Glove|Thumb)$/.test(label)) return [side + "Wrist"];
  }
  if (/^(Head|Nose|Goggle|CanvasCap|CapVisor)/.test(name)) return ["HeadJoint"];
  if (/^(FieldBelt|Buckle|HipPouch)$/.test(name)) return ["Pelvis"];
  if (name === "FieldJacket" || name === "Zipper") return ["Pelvis", "Spine", smoothstep(.91, 1.16, y)];
  return ["Spine"];
}

for (const { name, material, p, t } of pieces) {
  const n = p.map(() => [0, 0, 0]);
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = t.slice(i, i + 3);
    const u = p[b].map((v, j) => v - p[a][j]);
    const v = p[c].map((val, j) => val - p[a][j]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const idx of [a, b, c]) normal.forEach((val, j) => n[idx][j] += val);
  }
  const smooth = n.flatMap((v) => {
    const length = Math.hypot(...v) || 1;
    return v.map((c) => c / length);
  });
  const tint = p.flatMap(([x, y, z]) => {
    const shade = .91 + .055 * Math.sin(x * 42 + Math.sin(z * 27)) * Math.sin(y * 29) + .025 * Math.cos(z * 61 + y * 36);
    return [shade, shade, shade, 1];
  });
  const min = [0, 1, 2].map((i) => Math.min(...p.map((v) => v[i])));
  const max = [0, 1, 2].map((i) => Math.max(...p.map((v) => v[i])));
  const jointValues = [], weightValues = [];
  for (const [, y] of p) {
    const [primary, secondary = primary, mix = 0] = vertexSkin(name, y);
    jointValues.push(jointIds.get(primary), jointIds.get(secondary), 0, 0);
    weightValues.push(1 - mix, mix, 0, 0);
  }
  const mesh = gltf.meshes.push({ name, primitives: [{
    attributes: {
      POSITION: accessor(Float32Array.from(p.flat()), 5126, "VEC3", p.length, 34962, { min, max }),
      NORMAL: accessor(Float32Array.from(smooth), 5126, "VEC3", p.length, 34962),
      COLOR_0: accessor(Float32Array.from(tint), 5126, "VEC4", p.length, 34962),
      JOINTS_0: accessor(Uint8Array.from(jointValues), 5121, "VEC4", p.length, 34962),
      WEIGHTS_0: accessor(Float32Array.from(weightValues), 5126, "VEC4", p.length, 34962),
    },
    indices: accessor(Uint16Array.from(t), 5123, "SCALAR", t.length, 34963),
    material: Object.keys(palette).indexOf(material),
  }] }) - 1;
  gltf.scenes[0].nodes.push(gltf.nodes.push({ name, mesh, skin: 0 }) - 1);
}
gltf.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(gltf));
const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(12);
header.write("glTF");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binary.length, 8);
function chunkHeader(length, type) {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(length);
  b.write(type, 4, "ascii");
  return b;
}
writeFileSync(new URL("../demo_3d/survivor_model.glb", import.meta.url), Buffer.concat([
  header, chunkHeader(jsonChunk.length, "JSON"), jsonChunk,
  chunkHeader(binary.length, "BIN\0"), binary,
]));
