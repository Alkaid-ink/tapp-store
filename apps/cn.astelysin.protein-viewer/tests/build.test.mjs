// Sanity checks for the geometry builders using a minimal THREE mock. Verifies
// instance counts, per-atom matrices/colors and bounds math without a WebGL
// context. Run: node --test tests/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  divideScalar(s) { this.x /= s; this.y /= s; this.z /= s; return this; }
  setFromUnitVectors() { return this; }
  addScaledVector() { return this; }
  cross() { return this; }
}
class Quaternion { setFromUnitVectors() { return this; } }
class Matrix4 {
  constructor() { this._pos = null; this._scale = null; }
  compose(pos, quat, scale) {
    this._pos = { x: pos.x, y: pos.y, z: pos.z };
    this._scale = { x: scale.x, y: scale.y, z: scale.z };
    return this;
  }
  setUsage() {}
}
class Color { constructor(value) { this.value = value; } }
class Geometry { constructor(...args) { this.args = args; } dispose() {} }
class IcosahedronGeometry extends Geometry {}
class CylinderGeometry extends Geometry {}
class SphereGeometry extends Geometry {}
class TubeGeometry extends Geometry {}
class CatmullRomCurve3 { constructor(points) { this.points = points; } }
class BufferGeometry extends Geometry {
  setAttribute(name, value) { this.attributes = this.attributes || {}; this.attributes[name] = value; }
  setIndex(value) { this.index = value; }
  computeVertexNormals() { this.normalsComputed = true; }
}
class Float32BufferAttribute { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; } }
class Mesh {
  constructor(geometry, material) { this.geometry = geometry; this.material = material; this.userData = {}; this.position = new Vector3(); }
}
class LineBasicMaterial { constructor(options) { this.options = options; } dispose() {} }
class LineSegments {
  constructor(geometry, material) { this.geometry = geometry; this.material = material; this.userData = {}; }
}
class MeshStandardMaterial { constructor(options) { this.options = options; } dispose() {} }
class InstancedMesh {
  constructor(geom, mat, count) {
    this.geometry = geom; this.material = mat; this.count = count;
    this.instanceMatrix = { setUsage() {}, needsUpdate: true };
    this.instanceColor = { needsUpdate: true };
    this.userData = {};
    this.matrices = []; this.colors = [];
  }
  setMatrixAt(i, m) { this.matrices[i] = { _pos: { ...m._pos }, _scale: { ...m._scale } }; }
  setColorAt(i, c) { this.colors[i] = c; }
}
class Group {
  constructor() { this.children = []; this.userData = {}; }
  add(child) { this.children.push(child); }
}
const THREE_MOCK = {
  Vector3, Quaternion, Matrix4, Color, Group,
  DynamicDrawUsage: 1,
  IcosahedronGeometry,
  CylinderGeometry,
  SphereGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  LineBasicMaterial,
  LineSegments,
  MeshStandardMaterial,
  InstancedMesh,
};

globalThis.THREE = THREE_MOCK;
const build = require(join(root, 'page', 'build.js'));

const parser = require(join(root, 'page', 'parser.js'));
const bondsMod = require(join(root, 'page', 'bonds.js'));
const sample = readFileSync(join(root, 'tests', 'fixtures', 'sample.cif'), 'utf8');
const structure = parser.parseMmCif(sample);
const atoms = structure.atoms;
const colorFor = (a) => 0x123456;

test('makeSpacefill creates one instance per atom at the right position', () => {
  const mesh = build.makeSpacefill(atoms, colorFor);
  assert.equal(mesh.count, atoms.length);
  assert.equal(mesh.matrices.length, atoms.length);
  assert.deepEqual(mesh.matrices[0]._pos, { x: 10, y: 8, z: 10 });
  assert.deepEqual(mesh.matrices[atoms.length - 1]._pos, { x: 30, y: 30, z: 30 });
  assert.equal(mesh.colors[0].value, colorFor(atoms[0]));
  assert.equal(mesh.colors[2].value, 0x123456);
});

test('makeBallStick creates atom and bond instances', () => {
  const bonds = bondsMod.buildBonds(atoms);
  assert.equal(bonds.length, 8);
  const group = build.makeBallStick(atoms, bonds, colorFor);
  const [atomMesh, bondMesh] = group.userData.meshes;
  assert.equal(atomMesh.count, atoms.length);
  assert.equal(bondMesh.count, 8);
  // Peptide bond midpoint should sit between VAL C (10,10,10) and GLY N (10,10.8,10)
  const peptide = bonds.find(([i, j]) => (i === 2 && j === 4) || (i === 4 && j === 2));
  const mid = bondMesh.matrices[bonds.indexOf(peptide)]._pos;
  assert.ok(Math.abs(mid.y - 10.4) < 1e-9, `peptide bond midpoint y = ${mid.y}`);
});

test('makeBackbone creates one tube per adjacent CA pair', () => {
  const mesh = build.makeBackbone(atoms, colorFor);
  // chain A: VAL CA + GLY CA -> 1 segment; chain B: single CA -> 0; HEM: no CA
  assert.equal(mesh.count, 1);
  assert.equal(mesh.userData.segments, 1);
});

test('makeCartoon creates one ribbon mesh per polymer chain', () => {
  const polymer = atoms.filter((atom) => atom.kind !== 'ligand');
  const group = build.makeCartoon(polymer, colorFor);
  assert.equal(group.userData.representation, 'cartoon');
  assert.equal(group.children.length, 2);
  assert.ok(group.children[0].geometry instanceof BufferGeometry);
  assert.equal(group.children[0].geometry.normalsComputed, true);
  assert.ok(group.children[1].geometry instanceof SphereGeometry);
});

test('makeCartoon does not bridge missing or distant residues', () => {
  const sparse = [
    { atom: 'CA', chain: 'A', resn: 'ALA', resi: 1, x: 0, y: 0, z: 0 },
    { atom: 'CA', chain: 'A', resn: 'GLY', resi: 2, x: 3.8, y: 0, z: 0 },
    { atom: 'CA', chain: 'A', resn: 'SER', resi: 10, x: 20, y: 0, z: 0 }
  ];
  const group = build.makeCartoon(sparse, colorFor);
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0].geometry.index.length, 6, 'only the contiguous residue pair should form faces');
});

test('makeWireframe creates line segments from detected bonds', () => {
  const bonds = bondsMod.buildBonds(atoms);
  const line = build.makeWireframe(atoms, bonds, colorFor);
  assert.equal(line.userData.representation, 'wireframe');
  assert.equal(line.userData.bonds, bonds.length);
  assert.equal(line.geometry.attributes.position.array.length, bonds.length * 6);
});

test('makeHybrid combines polymer cartoon and ligand ball-and-stick', () => {
  const polymer = atoms.filter((atom) => atom.kind !== 'ligand');
  const ligand = atoms.filter((atom) => atom.kind === 'ligand');
  const group = build.makeHybrid(polymer, ligand, bondsMod.buildBonds(ligand), colorFor);
  assert.equal(group.userData.representation, 'hybrid');
  assert.equal(group.children.length, 2);
  assert.equal(group.children[0].userData.representation, 'cartoon');
  assert.equal(group.children[1].userData.meshes[0].count, ligand.length);
});

test('computeBounds returns a sane center and radius', () => {
  const b = build.computeBounds(atoms);
  assert.ok(Number.isFinite(b.center.x) && Number.isFinite(b.center.y) && Number.isFinite(b.center.z));
  assert.ok(b.radius >= 10, `radius should cover spread atoms, got ${b.radius}`);
  // x spans 9..30 (VAL O .. HEM FE) -> center 19.5
  assert.ok(Math.abs(b.center.x - 19.5) < 1e-9, `center.x = ${b.center.x}`);
});

test('disposeObject walks children and geometry/material', () => {
  const group = build.makeBallStick(atoms, bondsMod.buildBonds(atoms), colorFor);
  let disposed = 0;
  for (const child of group.children) {
    const orig = child.geometry.dispose.bind(child.geometry);
    child.geometry.dispose = () => { disposed += 1; orig(); };
  }
  build.disposeObject(group);
  assert.ok(disposed >= 2, `expected to dispose nested geometries, disposed ${disposed}`);
});
