import { writeFileSync } from "node:fs";

// Rebuild the editable Godot scene: node tools/generate_house.mjs
const assets = [
  ["PackedScene", "explorer", "explorer.tscn"],
  ["PackedScene", "hud", "explorer_hud.tscn"],
  ["Shader", "surfaces", "house_surfaces.gdshader"],
  ["Script", "door", "house_door.gd"],
  ["PackedScene", "npc", "exit_survivor.tscn"],
  ["Script", "dialogue", "house_dialogue.gd"],
];
const resources = [], nodes = [];
const vec = (v) => `Vector3(${v.map((n) => +n.toFixed(4)).join(", ")})`;
const color = (v) => `Color(${[...v, ...(v.length === 3 ? [1] : [])].join(", ")})`;
const sub = (id) => `SubResource("${id}")`;
const ext = (id) => `ExtResource("${id}")`;
const res = (type, id, props) => resources.push(`[sub_resource type="${type}" id="${id}"]\n${props}`);
function node(name, type, parent, props = "", instance = null) {
  const path = parent === "." ? name : `${parent}/${name}`;
  nodes.push(`[node name="${name}"${type ? ` type="${type}"` : ""}${parent !== null ? ` parent="${parent}"` : ""}${instance ? ` instance=${ext(instance)}` : ""}]${props ? "\n" + props : ""}`);
  return path;
}
function pose(p, rot) {
  return `position = ${vec(p)}${rot ? `\nrotation_degrees = ${vec(rot)}` : ""}`;
}
const group = (parent, name, p = [0, 0, 0], yaw = 0) =>
  node(name, "Node3D", parent, pose(p, yaw ? [0, yaw, 0] : null));
const finishes = {
  Hall: [0, [.57,.50,.39], [.39,.28,.19]], GreenPaper: [0, [.40,.46,.38], [.23,.31,.24]],
  RosePaper: [0, [.56,.40,.35], [.39,.24,.23]], BluePaper: [0, [.40,.45,.48], [.23,.31,.37]],
  OchrePaper: [0, [.54,.46,.31], [.34,.29,.17]], Boards: [1, [.39,.28,.20], [.15,.108,.079]],
  OldBoards: [1, [.34,.25,.19], [.13,.101,.081]], KitchenTile: [2, [.58,.55,.45], [.32,.37,.33]],
  WhiteTile: [2, [.61,.59,.49], [.51,.55,.50]], Oak: [3, [.36,.24,.16], [.18,.12,.08]],
  DarkOak: [3, [.24,.16,.11], [.12,.075,.05]], Painted: [3, [.36,.42,.35], [.22,.28,.24]],
  PaleWood: [3, [.54,.42,.29], [.30,.24,.17]], Ceiling: [5, [.59,.56,.48], [.32,.28,.23]],
  Plaster: [5, [.48,.44,.39], [.28,.25,.21]], Brick: [5, [.40,.26,.20], [.25,.14,.09]],
  Rug: [4, [.35,.16,.15], [.67,.47,.28]], RugBlue: [4, [.23,.32,.32], [.49,.51,.36]],
  Upholstery: [4, [.32,.36,.25], [.42,.43,.27]], Blanket: [4, [.31,.23,.28], [.46,.34,.30]],
  Linen: [4, [.64,.59,.47], [.56,.52,.42]], Dirt: [5, [.28,.29,.22], [.19,.19,.14]],
};
for (const [name, [finish, paint, accent]] of Object.entries(finishes)) {
  res("ShaderMaterial", name, `shader = ${ext("surfaces")}\nshader_parameter/finish = ${finish}\nshader_parameter/paint = ${color(paint)}\nshader_parameter/accent = ${color(accent)}`);
}
const solids = {
  Brass:[.52,.39,.22], Iron:[.18,.17,.15], Black:[.09,.085,.077], Ivory:[.71,.65,.51],
  Enamel:[.48,.57,.51], BookRed:[.40,.19,.15], BookGreen:[.30,.37,.26], BookBlue:[.23,.30,.36],
  Paper:[.63,.55,.40], Bottles:[.22,.31,.22], Landscape:[.27,.36,.35], Hills:[.34,.39,.29],
  Sun:[.70,.56,.34], Glass:[.68,.75,.72,.10], Leaf:[.20,.27,.22], Leaf2:[.27,.32,.24],
};
for (const [name, rgb] of Object.entries(solids)) {
  res("StandardMaterial3D", name, `albedo_color = ${color(rgb)}\nroughness = ${name === "Brass" ? 0.58 : 0.91}${name === "Glass" ? "\ntransparency = 1" : ""}`);
}
res("Environment", "HouseSky", `background_mode = 1
background_color = Color(0.52, 0.58, 0.56, 1)
ambient_light_source = 2
ambient_light_color = Color(0.82, 0.86, 0.88, 1)
ambient_light_energy = 0.49
reflected_light_source = 2`);

const boxes = new Map(), colliders = new Map(), roundMeshes = new Map();
function hitbox(parent, name, p, size, rot = null) {
  const key = vec(size);
  if (!colliders.has(key)) {
    const id = "Shape_" + (colliders.size + 1);
    res("BoxShape3D", id, "size = " + key);
    colliders.set(key, id);
  }
  node(name, "CollisionShape3D", parent, `${pose(p, rot)}\nshape = ${sub(colliders.get(key))}`);
}
function box(parent, name, p, size, material, { solid = false, rot = null } = {}) {
  const key = `${vec(size)} ${material}`;
  if (!boxes.has(key)) {
    const id = "Box_" + (boxes.size + 1);
    res("BoxMesh", id, `material = ${sub(material)}\nsize = ${vec(size)}`);
    boxes.set(key, id);
  }
  const mesh = `mesh = ${sub(boxes.get(key))}${material === "Glass" ? "\ncast_shadow = 0" : ""}`;
  if (solid) {
    const body = node(name, "StaticBody3D", parent, pose(p, rot));
    node("Mesh", "MeshInstance3D", body, mesh);
    hitbox(body, "Collision", [0,0,0], size);
  } else {
    node(name, "MeshInstance3D", parent, `${pose(p, rot)}\n${mesh}`);
  }
}
function round(parent, name, p, size, material, cylinder = false, rot = null) {
  const key = `${cylinder} ${vec(size)} ${material}`;
  if (!roundMeshes.has(key)) {
    const id = "Round_" + (roundMeshes.size + 1);
    const mesh = cylinder
      ? `top_radius = ${size[0]}\nbottom_radius = ${size[2]}\nheight = ${size[1]}\nradial_segments = 14\nrings = 1`
      : `radius = 0.5\nheight = 1.0\nradial_segments = 16\nrings = 8`;
    res(cylinder ? "CylinderMesh" : "SphereMesh", id, `material = ${sub(material)}\n${mesh}`);
    roundMeshes.set(key,id);
  }
  node(name, "MeshInstance3D", parent, `${pose(p, rot)}${cylinder ? "" : "\nscale = " + vec(size)}\nmesh = ${sub(roundMeshes.get(key))}`);
}
function light(parent, name, p, rgb, energy, range, direction = null) {
  const spot = direction !== null;
  node(name, spot ? "SpotLight3D" : "OmniLight3D", parent, `${pose(p,direction)}
light_color = ${color(rgb)}
light_energy = ${energy}
${spot ? "spot_range" : "omni_range"} = ${range}
${spot ? "spot_angle = 54\nspot_angle_attenuation = 0.82" : "omni_attenuation = 1.2"}`);
}

let seed = 12741;
function rng() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const HOUSE_HALF_WIDTH = 10.6, HOUSE_HALF_LENGTH = 10.8, HALL_HALF_WIDTH = 1.58;
const rooms = [
  { name:"Sala", side:-1, lo:3.55, hi:10.8, door:7.2, window:8.05, wall:"GreenPaper" },
  { name:"Comedor", side:1, lo:3.55, hi:10.8, door:7.2, window:7.45, wall:"RosePaper" },
  { name:"Estudio", side:-1, lo:-3.5, hi:3.55, door:.12, window:0.15, wall:"OchrePaper", closed:true },
  { name:"Cocina", side:1, lo:-3.5, hi:3.55, door:.12, window:0.45, wall:"Plaster", tile:true },
  { name:"Dormitorio", side:-1, lo:-10.8, hi:-3.5, door:-7.05, window:-7.55, wall:"BluePaper", closed:true },
  { name:"Deposito", side:1, lo:-10.8, hi:-3.5, door:-7.05, window:-7.65, wall:"Plaster", boarded:true },
];

node("CasaAbandonada", "Node3D", null);
node("WorldEnvironment", "WorldEnvironment", ".", `environment = ${sub("HouseSky")}`);
node("SolExterior", "DirectionalLight3D", ".", `rotation_degrees = Vector3(-33, -48, 0)
light_color = Color(1, 0.88, 0.72, 1)
light_energy = 0.20`);
const architecture = group(".", "Arquitectura");
const hall = group(architecture, "VestibuloYPasillo");
const floor = node("PisoFisico", "StaticBody3D", architecture);
hitbox(floor, "Colision", [0,-.16,0], [21.22,.32,21.62]);
const roof = node("TechoFisico", "StaticBody3D", architecture);
hitbox(roof, "Colision", [0,3.48,0], [21.42,.26,21.82]);
for (const [i, lo, hi] of [[1,3.55,10.8],[2,-3.5,3.55],[3,-10.8,-3.5]]) {
  box(hall, `Piso_${i}`, [0,-.035,(lo+hi)/2], [3.2,.07,hi-lo], "Boards");
  box(hall, `Cielorraso_${i}`, [0,3.48,(lo+hi)/2], [3.2,.26,hi-lo], "Ceiling");
  box(hall, `Alfombra_${i}`, [0,.008,(lo+hi)/2], [1.16,.016,hi-lo-1.15], i===2?"RugBlue":"Rug");
  for (const sign of [-1,1]) {
    box(hall, `BordeAlfombra_${i}_${sign===-1?"O":"E"}`, [sign*.545,.018,(lo+hi)/2],
      [.031,.008,hi-lo-1.15], "Brass");
  }
  const chandelier = group(hall, `Lampara_${i}`, [0,3.03,(lo+hi)/2]);
  round(chandelier,"Cadena",[0,.18,0],[.025,.33,.025],"Iron",true);
  round(chandelier,"Campana",[0,-.06,0],[.13,.19,.29],"Brass",true);
  round(chandelier,"Vidrio",[0,-.18,0],[.20,.13,.20],"Ivory");
}
light(hall, "LuzVestibulo", [0,2.76,8.2], [1,.83,.62], 2.35, 6.4);
light(hall, "LuzGaleria", [.5,2.64,.6], [.80,.83,.74], 1.36, 5.0);
light(hall, "LuzFondo", [-.48,2.73,-7.72], [.65,.78,.80], 1.72, 5.8);

function wallX(parent, name, x, lo, hi, material, yLo=0, yHi=3.35) {
  if (hi-lo < .025) return;
  box(parent, name, [x,(yLo+yHi)/2,(lo+hi)/2], [.24,yHi-yLo,hi-lo], material, {solid:true});
}
function skirting(parent, name, x, lo, hi, both = false) {
  for (const [i,s] of (both ? [-1,1] : [Math.sign(-x)]).entries()) {
    box(parent, name + i, [x+s*.13,.14,(lo+hi)/2], [.06,.27,hi-lo], "DarkOak");
    box(parent, name + "Moldura" + i, [x+s*.13,3.14,(lo+hi)/2], [.075,.15,hi-lo], "Oak");
  }
}
function door(parent, name, side, center, closed) {
  const opening = 1.44;
  const x = side * HALL_HALF_WIDTH;
  for (const s of [-1,1]) {
    box(parent, `Jamba_${s<0?"A":"B"}`, [x,1.17,center+s*opening/2], [.34,2.34,.105], "DarkOak");
  }
  box(parent, "MarcoSuperior", [x,2.36,center], [.35,.16,opening+.18], "DarkOak");
  box(parent, "Umbral", [x,.006,center], [.36,.012,opening], "PaleWood");
  if (!closed) return;
  const hinge = node(name, "AnimatableBody3D", parent,
    `${pose([x,0,center-opening/2+.055])}\nscript = ${ext("door")}\nswing_degrees = ${side*102}.0`);
  box(hinge, "Tablero", [0,1.14,.655], [.078,2.24,1.31], "Oak");
  hitbox(hinge, "Colision", [0,1.14,.655], [.078,2.24,1.31]);
  for (const s of [-1,1]) {
    for (let i=0;i<2;i++) box(hinge, `Panel_${s<0?"O":"E"}_${i}`,
      [s*.047,.58+i*1.1,.655], [.018,.84,1.01], "DarkOak");
    round(hinge, `Picaporte_${s<0?"O":"E"}`, [s*.084,1.03,1.13], [.108,.076,.076], "Brass");
  }
}
function window(parent, room) {
  const x = room.side * HOUSE_HALF_WIDTH, z = room.window;
  const width = 2.48, bottom = .91, top = 2.72;
  wallX(parent,"ExteriorA",x,room.lo,z-width/2,room.wall);
  wallX(parent,"ExteriorB",x,z+width/2,room.hi,room.wall);
  wallX(parent,"AlfeizarMuro",x,z-width/2,z+width/2,room.wall,0,bottom);
  wallX(parent,"DintelVentana",x,z-width/2,z+width/2,room.wall,top,3.35);
  skirting(parent,"RodapieExterior",x,room.lo,room.hi);
  const win = group(parent,"Ventana", [x,0,z]);
  for (const s of [-1,1]) {
    box(win,`Montante_${s<0?"A":"B"}`, [0,(top+bottom)/2,s*width/2], [.36,top-bottom+.16,.11],"DarkOak");
  }
  for (const [i,y] of [bottom,1.82,top].entries()) {
    box(win,`Travesano_${i}`, [0,y,0], [i===0?.52:.31,.09,width+.20],"DarkOak");
  }
  box(win,"Parteluz",[0,(top+bottom)/2,0],[.25,top-bottom,.072],"Oak");
  box(win,"CristalPolvoriento",[0,(top+bottom)/2,0],[.018,top-bottom,width],"Glass");
  // Continuous opaque backing overlaps the opening: no gaps at any angle.
  box(win,"CierreOpaco",[-room.side*.10,(top+bottom)/2,0],[.09,top-bottom+.12,width+.14],"OldBoards");
  const pane = node("LimiteVentana","StaticBody3D",win);
  hitbox(pane,"Colision",[0,(top+bottom)/2,0],[.09,top-bottom,width]);
  const count = room.boarded ? 5 : 2;
  for (let i=0;i<count;i++) {
    const b = [0,(room.boarded?1.14:1.20)+i*(room.boarded?.33:.68),(rng()-.5)*.14];
    b[0] = -room.side * .18;
    box(win,`Tabla_${i}`, b, [.082,.20,2.57+rng()*.14], i%2?"PaleWood":"Oak",
      {rot:[(rng()-.5)*16,0,0]});
    for (const s of [-1,1]) box(win,`Clavo_${i}_${s<0?"A":"B"}`,
      [b[0]-room.side*.049,b[1],s*1.06+b[2]],[.016,.032,.035],"Iron");
  }
  light(parent,"LuzVentana",[x-room.side*.42,2.46,z],room.side<0?[1,.87,.69]:[.78,.87,1],
    0.35, 11.4, [-17,room.side*90,0]);
  light(parent,"Rebote",[room.side*5.75,2.65,(room.lo+room.hi)/2],[.88,.79,.64],1.30,6.5);
}
const roomPaths = new Map();
for (const room of rooms) {
  const { name, side, lo, hi, door: center, wall, tile } = room;
  const r = group(architecture,name);
  roomPaths.set(name,r);
  const mid = (HOUSE_HALF_WIDTH+HALL_HALF_WIDTH)/2*side;
  const width = HOUSE_HALF_WIDTH-HALL_HALF_WIDTH+.06;
  box(r,"Piso",[mid,-.035,(lo+hi)/2],[width,.07,hi-lo],tile?"KitchenTile":"OldBoards");
  box(r,"Cielorraso",[mid,3.48,(lo+hi)/2],[width,.26,hi-lo],"Ceiling");
  const x = side*HALL_HALF_WIDTH;
  wallX(r,"TabiqueA",x,lo,center-.72,wall);
  wallX(r,"TabiqueB",x,center+.72,hi,wall);
  wallX(r,"Dintel",x,center-.72,center+.72,wall,2.33,3.35);
  for (const [i,a,b] of [[1,lo,center-.72],[2,center+.72,hi]]) {
    skirting(r,`RodapieInterior_${i}`,x,a,b,true);
    box(r,`PapelDelPasillo_${i}`,[x-side*.126,1.70,(a+b)/2],[.014,2.91,b-a],"Hall");
  }
  box(r,"PapelSobrePuerta",[x-side*.126,2.79,center],[.014,.83,1.44],"Hall");
  door(r,"Puerta",side,center,room.closed);
  box(r,"ParedTransversal",[mid,1.675,lo],[width,3.35,.24],wall,{solid:true});
  if (hi===HOUSE_HALF_LENGTH) box(r,"ParedFrontal",[mid,1.675,hi],[width,3.35,.24],wall,{solid:true});
  window(r,room);
}
box(hall,"MuroEntrada",[0,1.675,10.8],[3.23,3.35,.25],"Hall",{solid:true});
box(hall,"MuroFondo",[0,1.675,-10.8],[3.23,3.35,.25],"Hall",{solid:true});
for (const [name,z,sign] of [["PortonEntrada",10.64,-1],["PortonFondo",-10.64,1]]) {
  const port = group(hall,name,[0,0,z]);
  box(port,"Marco",[0,1.26,0],[2.02,2.52,.15],"DarkOak");
  for (const side of [-1,1]) {
    const id = side<0?"O":"E";
    box(port,`Hoja_${id}`,[side*.44,1.17,sign*.095],[.86,2.25,.08],"Oak");
    for (let i=0;i<2;i++) box(port,`Panel_${id}_${i}`,[side*.44,.57+i*1.06,sign*.15],[.66,.83,.031],"DarkOak");
    round(port,`Pomo_${id}`,[side*.13,1.03,sign*.20],[.076,.076,.076],"Brass");
  }
  box(port,"TablaClavada",[0,1.62,sign*.19],[1.96,.16,.09],"PaleWood",{rot:[0,0,sign*11]});
}

function rug(parent, name, p, size, mat) {
  const r = group(parent,name,p);
  box(r,"Tejido",[0,0,0],[size[0],.015,size[1]],mat);
  for (const side of [-1,1]) {
    box(r,side<0?"OrillaO":"OrillaE",[side*(size[0]*.5-.07),.008,0],[.055,.01,size[1]],"Brass");
  }
}
function table(parent,name,p,width,depth,height,yaw=0) {
  const t = group(parent,name,p,yaw);
  box(t,"Cubierta",[0,height-.045,0],[width,.09,depth],"Oak",{solid:true});
  box(t,"Faldon",[0,height-.13,0],[width*.92,.11,depth*.86],"DarkOak");
  for (const [i,x,z] of [[1,-1,-1],[2,-1,1],[3,1,-1],[4,1,1]]) {
    box(t,`Pata_${i}`,[x*width*.43,(height-.15)/2,z*depth*.39],
      [.085,height-.15,.085],"DarkOak",{solid:true});
  }
  return t;
}
function chair(parent,name,p,yaw=0,fallen=false) {
  const c = group(parent,name,p,yaw);
  if (fallen) {
    // Low collision-free debris does not snag the player.
    box(c,"Asiento",[0,.20,0],[.48,.075,.45],"Oak",{rot:[52,0,10]});
    box(c,"Respaldo",[0,.12,.39],[.46,.08,.42],"DarkOak",{rot:[-10,0,12]});
    return;
  }
  box(c,"Asiento",[0,.47,0],[.48,.085,.45],"Oak",{solid:true});
  for (const [i,x,z] of [[1,-1,-1],[2,-1,1],[3,1,-1],[4,1,1]])
    box(c,`Pata_${i}`,[x*.187,.23,z*.174],[.055,.46,.055],"DarkOak");
  for (const s of [-1,1]) box(c,s<0?"PosteO":"PosteE",[s*.195,.72,.20],[.061,.53,.065],"DarkOak");
  box(c,"Respaldo",[0,.87,.206],[.43,.15,.065],"Oak");
}
function cabinet(parent,name,p,width,depth,height,yaw=0,mat="Oak") {
  const g = group(parent,name,p,yaw);
  box(g,"Cuerpo",[0,height/2,0],[width,height,depth],mat,{solid:true});
  box(g,"Remate",[0,height-.035,0],[width+.055,.08,depth+.048],"DarkOak");
  for (let i=0;i<2;i++) {
    const x = (i-.5)*width*.49;
    box(g,`Puerta_${i}`,[x,height*.5,-depth/2-.018],[width*.44,height*.75,.05],"Oak");
    box(g,`Moldura_${i}`,[x,height*.5,-depth/2-.05],[width*.36,height*.62,.017],mat);
    round(g,`Tirador_${i}`,[x+width*(i===0?.14:-.14),height*.59,-depth/2-.074],[.051,.048,.043],"Brass");
  }
  return g;
}
function portrait(parent,name,p,yaw=0,roll=0) {
  const g = group(parent,name,p,yaw);
  box(g,"Marco",[0,0,0],[.72,.89,.08],"DarkOak",{rot:[0,0,roll]});
  box(g,"Tela",[0,0,-.047],[.61,.77,.02],"Landscape",{rot:[0,0,roll]});
  box(g,"Colinas",[0,-.20,-.061],[.57,.28,.01],"Hills",{rot:[0,0,roll]});
  round(g,"Sol",[.10,.15,-.069],[.14,.14,.025],"Sun");
}
function pages(parent, name, p, count, spread=1) {
  const g = group(parent,name,p);
  for (let i=0;i<count;i++) {
    box(g,`Hoja_${i}`,[(rng()-.5)*spread,.01+rng()*.01,(rng()-.5)*spread],
      [.17+rng()*.11,.006,.22+rng()*.12], i%4?"Paper":"Linen",{rot:[0,rng()*180,0]});
  }
}
function bottle(parent, name, p, mat="Bottles") {
  round(parent,name,p,[.048,.19,.066],mat,true);
  round(parent,name+"Cuello",[p[0],p[1]+.117,p[2]],[.024,.073,.034],mat,true);
}
const sala = roomPaths.get("Sala");
rug(sala,"AlfombraSala",[-6.0,.008,7.28],[4.72,3.65],"Rug");
const sofa = group(sala,"SofaDesgastado",[-8.32,0,8.95],-19);
box(sofa,"Base",[0,.31,0],[2.55,.48,.92],"Oak",{solid:true});
box(sofa,"Respaldo",[0,.76,.36],[2.39,.64,.23],"Upholstery",{solid:true,rot:[-8,0,0]});
for (const [i,x] of [-.70,0,.70].entries()) {
  round(sofa,`Almohadon_${i}`,[x,.55,-.04],[.75,.21,.79],"Upholstery");
  round(sofa,`Cojin_${i}`,[x,.83,.245],[.73,.49,.27],"Upholstery",false,[-6,0,(i-1)*7]);
}
for (const s of [-1,1]) round(sofa,s<0?"BrazoO":"BrazoE",[s*1.19,.58,0],[.34,.46,.91],"Upholstery");
const coffee = table(sala,"MesaBaja",[-6.7,0,7.0],1.65,.72,.52,-12);
pages(coffee,"Periodicos",[0,.52,0],4,.53);
box(coffee,"Libro",[.43,.55,.04],[.20,.06,.28],"BookRed",{rot:[0,16,0]});
const fireplace = group(sala,"Chimenea",[-7.15,0,3.78],180);
box(fireplace,"Hogar",[0,.53,.04],[1.04,1.02,.45],"Black");
for (const s of [-1,1]) box(fireplace,s<0?"PilarO":"PilarE",[s*.71,.59,0],[.39,1.18,.56],"Brick",{solid:true});
box(fireplace,"Dintel",[0,1.12,0],[1.82,.26,.58],"Brick",{solid:true});
box(fireplace,"Repisa",[0,1.32,-.015],[2.05,.12,.71],"Oak");
box(fireplace,"PiedraDelHogar",[0,.056,-.48],[1.98,.11,.68],"Plaster");
portrait(sala,"CuadroChimenea",[-7.15,2.04,3.79],180,-8);
chair(sala,"Butaca",[-4.65,0,8.6],32);
pages(sala,"PapelesSueltos",[-4.03,.001,6.0],5,1.25);

const dining = roomPaths.get("Comedor");
rug(dining,"AlfombraComedor",[6.05,.008,7.19],[4.92,3.53],"RugBlue");
const diningTable=table(dining,"MesaComedor",[6.22,0,7.18],3.20,1.24,.89,8);
for (const [i,x,z,yaw] of [[1,-1,1.0,0],[2,1,1.05,3],[3,-1,-.92,180],[4,1,-.94,180],[5,-2,0,90],[6,2,0,-90]]) {
  chair(diningTable,`Silla_${i}`,[x,0,z],yaw,i===5);
}
for (const [i,x] of [-.95,0,1.05].entries()) {
  round(diningTable,`Plato_${i}`,[x,.91,.25],[.15,.027,.11],"Ivory",true);
  box(diningTable,`Cubierto_${i}`,[x+.20,.90,.21],[.022,.013,.20],"Iron",{rot:[0,13*i,0]});
}
bottle(diningTable,"Botella",[-.43,.99,-.16]);
cabinet(dining,"Aparador",[6.20,0,10.18],2.78,.64,1.22,180);
portrait(dining,"CuadroInclinado",[6.12,2.17,10.65],0,8);

const study = roomPaths.get("Estudio");
rug(study,"AlfombraEstudio",[-6.57,.008,.34],[3.8,3.05],"Rug");
const desk=table(study,"Escritorio",[-7.25,0,.26],1.90,.91,.82,-13);
chair(desk,"SillaEscritorio",[0,0,.78],-10);
pages(desk,"Documentos",[-.26,.82,-.12],8,.63);
round(desk,"LamparaPie",[.65,.99,.16],[.034,.30,.066],"Brass",true);
round(desk,"LamparaPantalla",[.65,1.19,.16],[.08,.17,.18],"Painted",true);
for (let s=0;s<2;s++) {
  const shelf=group(study,`Biblioteca_${s}`,[-8.87+s*1.71,0,-3.04],180);
  box(shelf,"Respaldo",[0,1.15,.18],[1.48,2.3,.17],"DarkOak",{solid:true});
  for (const d of [-1,1]) box(shelf,d<0?"LateralO":"LateralE",[d*.72,1.15,0],[.11,2.3,.43],"Oak");
  for (let level=0;level<4;level++) {
    const y=.14+level*.55;
    box(shelf,`Balda_${level}`,[0,y,-.02],[1.44,.08,.44],"Oak");
    for (let i=0;i<9;i++) if (rng()>.25) {
      const h=.20+rng()*.22, x=-.57+i*.145;
      box(shelf,`Libro_${level}_${i}`,[x,y+.043+h/2,-.048],[.095,h,.26],
        ["BookBlue","BookGreen","BookRed","Paper"][Math.floor(rng()*4)],{rot:[0,0,(rng()-.5)*16]});
    }
  }
}
pages(study,"LibrosTirados",[-6.55,.005,-1.75],9,1.9);
portrait(study,"Retrato",[-4.37,1.90,-3.34],180,-4);

const kitchen=roomPaths.get("Cocina");
box(kitchen,"AzulejoPared",[6.17,1.22,-3.366],[6.78,1.33,.03],"WhiteTile");
for (let i=0;i<3;i++) {
  const counter=cabinet(kitchen,`Mesada_${i}`,[4.15+i*1.56,0,-2.97],1.49,.76,.90,180,"Painted");
  box(counter,"Encimera",[0,.91,0],[1.54,.08,.81],"Plaster");
  if(i===1) {
    box(counter,"Pila",[0,.962,0],[.69,.028,.51],"Iron");
    round(counter,"Canilla",[.15,1.10,.23],[.024,.25,.031],"Brass",true);
    round(counter,"Pico",[.15,1.21,.15],[.018,.20,.022],"Brass",true,[90,0,0]);
  }
}
const range = group(kitchen,"CocinaHierro",[8.98,0,-2.89],180);
box(range,"Cuerpo",[0,.48,0],[1.04,.96,.83],"Iron",{solid:true});
box(range,"Horno",[0,.43,-.43],[.81,.55,.08],"Black");
box(range,"Tirador",[0,.63,-.49],[.60,.055,.062],"Brass");
for (const [i,x,z] of [[1,-.25,-.18],[2,.25,-.18],[3,-.25,.18],[4,.25,.18]])
  round(range,`Hornalla_${i}`,[x,.985,z],[.13,.042,.13],"Black",true);
const prep=table(kitchen,"MesaPreparacion",[6.53,0,.82],1.63,.85,.87,4);
bottle(prep,"Botella",[.27,.98,.21]);
round(prep,"Olla",[-.32,.995,-.09],[.19,.23,.16],"Enamel",true);
round(prep,"Tapa",[-.32,1.12,-.09],[.20,.045,.19],"Iron",true);
chair(prep,"SillaVolcada",[.12,0,.85],40,true);
cabinet(kitchen,"Alacena",[9.84,0,2.42],1.72,.60,1.75,90,"Painted");

const bedroom=roomPaths.get("Dormitorio");
rug(bedroom,"AlfombraDormitorio",[-6.37,.008,-7.70],[4.2,3.65],"RugBlue");
const bed=group(bedroom,"CamaDeshecha",[-7.82,0,-8.33],0);
box(bed,"Bastidor",[0,.26,0],[2.02,.40,2.55],"Oak",{solid:true});
box(bed,"Cabecera",[0,.79,1.19],[2.10,1.19,.15],"DarkOak",{solid:true});
round(bed,"Colchon",[0,.54,-.03],[2.03,.34,2.55],"Linen");
box(bed,"Cubrecama",[0,.681,-.46],[1.92,.09,1.48],"Blanket",{rot:[0,3,-1]});
round(bed,"Pliegue",[.59,.72,-.53],[.64,.16,1.55],"Blanket",false,[0,12,-8]);
for (const s of [-1,1]) round(bed,s<0?"AlmohadaO":"AlmohadaE",[s*.46,.71,.68],[.77,.22,.59],"Linen",false,[0,s*8,0]);
cabinet(bedroom,"MesaDeLuz",[-6.38,0,-7.57],.65,.57,.67,-6);
cabinet(bedroom,"Ropero",[-8.1,0,-10.22],2.5,.70,2.48,180,"DarkOak");
portrait(bedroom,"CuadroDormitorio",[-4.52,2.04,-10.65],180,12);

const storage=roomPaths.get("Deposito");
for (let i=0;i<8;i++) {
  const x=4.32+(i%4)*1.34, z=i<4?-9.52:-5.18;
  const c=group(storage,`Cajon_${i}`,[x,0,z],(rng()-.5)*30);
  const h=.46+rng()*.32;
  box(c,"Caja",[0,h/2,0],[.91,h,.72],"PaleWood",{solid:true});
  box(c,"Tapa",[0,h+.01,0],[.94,.052,.77],"Oak");
  for (const s of [-1,1]) box(c,s<0?"RefuerzoO":"RefuerzoE",[s*.34,h*.5,-.38],[.09,h,.061],"Oak");
}
cabinet(storage,"Armario", [9.73,0,-7.65],2.56,.61,2.12,90,"Painted");
round(storage,"Barril",[8.35,.47,-9.65],[.35,.95,.37],"Oak",true);
for (let i=0;i<3;i++) round(storage,`Aro_${i}`,[8.35,.15+i*.32,-9.65],[.381,.05,.381],"Iron",true);
pages(storage,"Restos",[6.74,.004,-7.41],12,2.1);

// Things seen through the windows have no gameplay collision.
const exterior=group(".","Jardin");
box(exterior,"Tierra",[0,-.24,0],[80,.29,76],"Dirt");
for (let i=0;i<19;i++) {
  const side=i<9?-1:1;
  const p=[side*(14+rng()*11),0,(rng()-.5)*33];
  const tree=group(exterior,`Arbol_${i}`,p,(rng()-.5)*120);
  const height=2.8+rng()*2.9;
  round(tree,"Tronco",[0,height*.49,0],[.085,height,.19],"DarkOak",true,[0,0,(rng()-.5)*9]);
  for (let j=0;j<3;j++) {
    const x=(rng()-.5)*2.2, z=(rng()-.5)*1.8;
    round(tree,`Rama_${j}`,[x*.35,height*.72,z*.35],[.041,1.75,.079],"Oak",true,[x*26,0,z*26]);
    if(i%4!==0) round(tree,`Copa_${j}`,[x,height*.78+rng()*.68,z],[1.65,1.90,1.52],j%2?"Leaf":"Leaf2");
  }
}

node("Player",null,".",pose([0,.06,9.0],[0,5,0]),"explorer");
node("ExitSurvivor",null,".",pose([-.85,.02,9.65]),"npc");
node("Dialogue","CanvasLayer",".",`layer = 10\nscript = ${ext("dialogue")}`);
node("HUD",null,".","","hud");
node("Area","Label","HUD",`offset_left = 24.0
offset_top = 18.0
offset_right = 540.0
offset_bottom = 50.0
mouse_filter = 2
theme_override_colors/font_color = Color(0.94, 0.85, 0.70, 1)
theme_override_colors/font_outline_color = Color(0.06, 0.05, 0.04, 1)
theme_override_constants/outline_size = 5
theme_override_font_sizes/font_size = 22
text = "REVELIO  /  LA CASA ABANDONADA"`);

writeFileSync(new URL("../demo_3d/casa_abandonada.tscn", import.meta.url), [
  "[gd_scene format=3]",
  assets.map(([type, id, file]) => `[ext_resource type="${type}" path="res://demo_3d/${file}" id="${id}"]`).join("\n"),
  ...resources, ...nodes, "",
].join("\n\n"));
