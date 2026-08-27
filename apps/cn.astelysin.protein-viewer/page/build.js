// Geometry builders for the render modes. Runs inside the sandbox where
// the host has injected THREE (runtimeModules: ["three"]) as a global.
'use strict';

var THREE = globalThis.THREE;

var VDW = {
  H: 1.20, C: 1.70, N: 1.55, O: 1.52, F: 1.47, P: 1.80, S: 1.80,
  Cl: 1.75, Br: 1.85, I: 1.98, Na: 2.27, Mg: 1.73, Fe: 1.86, Zn: 1.39,
  Ca: 2.31, K: 2.75, Mn: 1.86, Cu: 1.40, Se: 1.90, B: 1.92, default: 1.70
};

function vdwRadius(el) {
  return VDW[el] !== undefined ? VDW[el] : VDW.default;
}

var atomGeom = null;
var bondGeom = null;
var identityQuat = null;
var quat = null;
var matrix = null;
var pos = null;
var sca = null;
var up = null;
var dir = null;
var mid = null;

function ensureThree() {
  if (!THREE && typeof globalThis !== 'undefined') THREE = globalThis.THREE;
  if (!THREE) throw new Error('THREE_MISSING');
  if (identityQuat) return;
  identityQuat = new THREE.Quaternion();
  quat = new THREE.Quaternion();
  matrix = new THREE.Matrix4();
  pos = new THREE.Vector3();
  sca = new THREE.Vector3();
  up = new THREE.Vector3(0, 1, 0);
  dir = new THREE.Vector3();
  mid = new THREE.Vector3();
}

function getAtomGeom() {
  ensureThree();
  if (!atomGeom) atomGeom = new THREE.IcosahedronGeometry(1, 1);
  return atomGeom;
}

function getBondGeom() {
  ensureThree();
  if (!bondGeom) bondGeom = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  return bondGeom;
}

function setAtomMatrix(mesh, index, x, y, z, scale) {
  pos.set(x, y, z);
  sca.set(scale, scale, scale);
  matrix.compose(pos, identityQuat, sca);
  mesh.setMatrixAt(index, matrix);
}

function setBondMatrix(mesh, index, x1, y1, z1, x2, y2, z2, radius) {
  dir.set(x2 - x1, y2 - y1, z2 - z1);
  var length = dir.length();
  if (length < 1e-6) length = 1e-6;
  dir.divideScalar(length);
  mid.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  quat.setFromUnitVectors(up, dir);
  sca.set(radius, length, radius);
  matrix.compose(mid, quat, sca);
  mesh.setMatrixAt(index, matrix);
}

// colorFor(atom, index) -> 0xRRGGBB
function makeSpacefill(atoms, colorFor) {
  var mesh = new THREE.InstancedMesh(getAtomGeom(), new THREE.MeshStandardMaterial({ vertexColors: true }), atoms.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (var i = 0; i < atoms.length; i++) {
    var a = atoms[i];
    setAtomMatrix(mesh, i, a.x, a.y, a.z, vdwRadius(a.el) * 0.92);
    mesh.setColorAt(i, new THREE.Color(colorFor(a, i)));
  }
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

// colorFor(atom, index) -> 0xRRGGBB
function makeBallStick(atoms, bonds, colorFor, atomRadiusFactor) {
  var factor = atomRadiusFactor === undefined ? 0.34 : atomRadiusFactor;
  var atomMesh = new THREE.InstancedMesh(getAtomGeom(), new THREE.MeshStandardMaterial({ vertexColors: true }), atoms.length);
  atomMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (var i = 0; i < atoms.length; i++) {
    var a = atoms[i];
    setAtomMatrix(atomMesh, i, a.x, a.y, a.z, vdwRadius(a.el) * factor);
    atomMesh.setColorAt(i, new THREE.Color(colorFor(a, i)));
  }
  atomMesh.instanceColor.needsUpdate = true;

  var bondMesh = new THREE.InstancedMesh(getBondGeom(), new THREE.MeshStandardMaterial({ roughness: 0.45, vertexColors: true }), bonds.length);
  for (var b = 0; b < bonds.length; b++) {
    var p = atoms[bonds[b][0]], q = atoms[bonds[b][1]];
    setBondMatrix(bondMesh, b, p.x, p.y, p.z, q.x, q.y, q.z, 0.16);
    bondMesh.setColorAt(b, new THREE.Color(colorFor(p, bonds[b][0])));
  }
  if (bonds.length) bondMesh.instanceColor.needsUpdate = true;

  var group = new THREE.Group();
  group.add(atomMesh);
  group.add(bondMesh);
  group.userData.meshes = [atomMesh, bondMesh];
  return group;
}

// Trace the alpha-carbon backbone as a tube per chain.
// colorFor(atom, index) -> 0xRRGGBB
function makeBackbone(atoms, colorFor) {
  var groups = {};
  var order = [];
  for (var i = 0; i < atoms.length; i++) {
    var a = atoms[i];
    if (a.atom && a.atom !== 'CA') continue;
    if (!groups[a.chain]) { groups[a.chain] = []; order.push(a.chain); }
    groups[a.chain].push(i);
  }
  var segments = [];
  for (var ci = 0; ci < order.length; ci++) {
    var chain = order[ci];
    var list = groups[chain];
    list.sort(function (x, y) { return atoms[x].resi - atoms[y].resi; });
    for (var s = 0; s < list.length - 1; s++) {
      segments.push([list[s], list[s + 1], chain]);
    }
  }
  var mesh = new THREE.InstancedMesh(getBondGeom(), new THREE.MeshStandardMaterial({ roughness: 0.55, vertexColors: true }), segments.length);
  for (var b = 0; b < segments.length; b++) {
    var p = atoms[segments[b][0]], q = atoms[segments[b][1]];
    setBondMatrix(mesh, b, p.x, p.y, p.z, q.x, q.y, q.z, 0.30);
    mesh.setColorAt(b, new THREE.Color(colorFor(atoms[segments[b][0]], segments[b][0])));
  }
  if (segments.length) mesh.instanceColor.needsUpdate = true;
  mesh.userData.segments = segments.length;
  return mesh;
}

function distanceBetween(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Build a flat ribbon through alpha-carbon positions. The ribbon direction is
// estimated from each residue's N-C vector, so it reads as a surface rather
// than a thickened Cα trace. It keeps each chain as a separate mesh.
function makeCartoon(atoms, colorFor) {
  ensureThree();
  var chains = {};
  var order = [];
  for (var i = 0; i < atoms.length; i++) {
    var atom = atoms[i];
    if (atom.atom !== 'CA') continue;
    if (!chains[atom.chain]) { chains[atom.chain] = []; order.push(atom.chain); }
    chains[atom.chain].push({ ca: atom, n: null, c: null });
  }
  for (var j = 0; j < atoms.length; j++) {
    var backboneAtom = atoms[j];
    if (!chains[backboneAtom.chain]) continue;
    for (var ri = 0; ri < chains[backboneAtom.chain].length; ri++) {
      var residue = chains[backboneAtom.chain][ri];
      if (residue.ca.resi !== backboneAtom.resi) continue;
      if (backboneAtom.atom === 'N') residue.n = backboneAtom;
      if (backboneAtom.atom === 'C') residue.c = backboneAtom;
      break;
    }
  }
  var group = new THREE.Group();
  group.userData.representation = 'cartoon';
  for (var ci = 0; ci < order.length; ci++) {
    var chain = chains[order[ci]];
    chain.sort(function (a, b) { return a.ca.resi - b.ca.resi; });
    var material = new THREE.MeshStandardMaterial({ color: colorFor(chain[0].ca, atoms.indexOf(chain[0].ca)), roughness: 0.52, metalness: 0.02, side: THREE.DoubleSide });
    if (chain.length === 1) {
      var single = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10), material);
      single.position.set(chain[0].ca.x, chain[0].ca.y, chain[0].ca.z);
      single.userData.chain = order[ci];
      group.add(single);
      continue;
    }
    var positions = [];
    var indices = [];
    var halfWidth = 0.72;
    var previousSide = null;
    for (var p = 0; p < chain.length; p++) {
      var current = chain[p];
      var ca = current.ca;
      var gap = p > 0 && (ca.resi - chain[p - 1].ca.resi !== 1 || distanceBetween(ca, chain[p - 1].ca) > 5.5);
      var nextGap = p < chain.length - 1 && (chain[p + 1].ca.resi - ca.resi !== 1 || distanceBetween(chain[p + 1].ca, ca) > 5.5);
      if (gap) previousSide = null;
      var before = gap ? ca : chain[Math.max(0, p - 1)].ca;
      var after = nextGap ? ca : chain[Math.min(chain.length - 1, p + 1)].ca;
      var tx = after.x - before.x, ty = after.y - before.y, tz = after.z - before.z;
      var tLength = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
      tx /= tLength; ty /= tLength; tz /= tLength;
      var sx = current.c && current.n ? current.c.x - current.n.x : 0;
      var sy = current.c && current.n ? current.c.y - current.n.y : 0;
      var sz = current.c && current.n ? current.c.z - current.n.z : 0;
      var projection = sx * tx + sy * ty + sz * tz;
      sx -= projection * tx; sy -= projection * ty; sz -= projection * tz;
      var sLength = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (sLength < 1e-4) {
        if (previousSide) {
          sx = previousSide.x; sy = previousSide.y; sz = previousSide.z;
        } else {
          sx = -ty; sy = tx; sz = 0;
        }
        sLength = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
      }
      sx /= sLength; sy /= sLength; sz /= sLength;
      if (previousSide) {
        var sideDot = sx * previousSide.x + sy * previousSide.y + sz * previousSide.z;
        if (sideDot < 0) { sx = -sx; sy = -sy; sz = -sz; }
        // Keep the ribbon frame continuous from residue to residue. Without
        // this transport step, peptide-plane directions can flip and twist
        // the strip into the spike-like artifacts seen in the viewport.
        sx = sx * 0.35 + previousSide.x * 0.65;
        sy = sy * 0.35 + previousSide.y * 0.65;
        sz = sz * 0.35 + previousSide.z * 0.65;
        var smoothedLength = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
        sx /= smoothedLength; sy /= smoothedLength; sz /= smoothedLength;
      }
      previousSide = { x: sx, y: sy, z: sz };
      positions.push(ca.x - sx * halfWidth, ca.y - sy * halfWidth, ca.z - sz * halfWidth);
      positions.push(ca.x + sx * halfWidth, ca.y + sy * halfWidth, ca.z + sz * halfWidth);
      if (p > 0 && !gap) {
        var base = (p - 1) * 2;
        var next = p * 2;
        indices.push(base, base + 1, next, base + 1, next + 1, next);
      }
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    var mesh = new THREE.Mesh(geometry, material);
    mesh.userData.chain = order[ci];
    group.add(mesh);
  }
  return group;
}

// Render every detected bond as a line segment. This is intentionally a
// separate line geometry, not a transparent ball-and-stick approximation.
function makeWireframe(atoms, bonds, colorFor) {
  ensureThree();
  var positions = [];
  var vertexColors = [];
  for (var i = 0; i < bonds.length; i++) {
    var p = atoms[bonds[i][0]], q = atoms[bonds[i][1]];
    positions.push(p.x, p.y, p.z, q.x, q.y, q.z);
    var pColor = new THREE.Color(colorFor(p, bonds[i][0]));
    var qColor = new THREE.Color(colorFor(q, bonds[i][1]));
    vertexColors.push(pColor.r, pColor.g, pColor.b, qColor.r, qColor.g, qColor.b);
  }
  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  var line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 }));
  line.userData.representation = 'wireframe';
  line.userData.bonds = bonds.length;
  return line;
}

function makeHybrid(polymerAtoms, ligandAtoms, ligandBonds, colorFor) {
  ensureThree();
  var group = new THREE.Group();
  group.userData.representation = 'hybrid';
  if (polymerAtoms.length) group.add(makeCartoon(polymerAtoms, colorFor));
  if (ligandAtoms.length) group.add(makeBallStick(ligandAtoms, ligandBonds || [], colorFor, 0.34));
  return group;
}

function computeBounds(atoms) {
  ensureThree();
  if (!atoms.length) return { center: new THREE.Vector3(), radius: 1 };
  var minX = Infinity, minY = Infinity, minZ = Infinity;
  var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (var i = 0; i < atoms.length; i++) {
    var a = atoms[i];
    if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x;
    if (a.y < minY) minY = a.y; if (a.y > maxY) maxY = a.y;
    if (a.z < minZ) minZ = a.z; if (a.z > maxZ) maxZ = a.z;
  }
  var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  var r = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2) + Math.pow(maxZ - minZ, 2)) / 2;
  return { center: new THREE.Vector3(cx, cy, cz), radius: Math.max(r, 0.5) };
}

function disposeObject(obj) {
  if (!obj) return;
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (var i = 0; i < mats.length; i++) mats[i].dispose();
  }
  if (obj.userData && Array.isArray(obj.userData.meshes)) {
    for (var m = 0; m < obj.userData.meshes.length; m++) disposeObject(obj.userData.meshes[m]);
  }
  if (obj.children) {
    for (var c = 0; c < obj.children.length; c++) disposeObject(obj.children[c]);
  }
}

module.exports = {
  makeSpacefill: makeSpacefill,
  makeBallStick: makeBallStick,
  makeBackbone: makeBackbone,
  makeCartoon: makeCartoon,
  makeWireframe: makeWireframe,
  makeHybrid: makeHybrid,
  computeBounds: computeBounds,
  disposeObject: disposeObject
};
