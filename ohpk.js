// OHPK v1 (OxiHuman core pack) parser — pure ES module, browser + Node compatible.
// Spec: crates/oxihuman-export/src/core_pack.rs (OxiHuman v0.2.1)

const MAGIC = [0x4f, 0x48, 0x50, 0x4b]; // "OHPK"
const FLAG_DEFLATE = 1;

class Reader {
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.pos = 0;
  }
  need(n) {
    if (this.pos + n > this.bytes.length) {
      throw new Error(`OHPK 数据被截断：offset ${this.pos} 需要 ${n} 字节，剩余 ${this.bytes.length - this.pos}`);
    }
  }
  u8() { this.need(1); return this.bytes[this.pos++]; }
  u16() { this.need(2); const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  u32() { this.need(4); const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  i16() { this.need(2); const v = this.view.getInt16(this.pos, true); this.pos += 2; return v; }
  f32() { this.need(4); const v = this.view.getFloat32(this.pos, true); this.pos += 4; return v; }
  uvarint() {
    let result = 0, shift = 0, byte;
    do {
      byte = this.u8();
      result |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    return result >>> 0;
  }
  bytesN(n) { this.need(n); const s = this.bytes.subarray(this.pos, this.pos + n); this.pos += n; return s; }
  stringU16() {
    const n = this.u16();
    return new TextDecoder('utf-8').decode(this.bytesN(n));
  }
  lenPrefixedU32() {
    const n = this.u32();
    return this.bytesN(n);
  }
}

function parseBaseMesh(r) {
  const nVerts = r.u32();
  const nIndices = r.u32();

  const scales = [r.f32(), r.f32(), r.f32()];
  const biases = [r.f32(), r.f32(), r.f32()];
  const posMaxErr = r.f32();

  const positions = new Float32Array(nVerts * 3);
  for (let i = 0; i < nVerts * 3; i++) {
    const axis = i % 3;
    positions[i] = r.i16() * scales[axis] + biases[axis];
  }

  const indices = new Uint32Array(nIndices);
  for (let i = 0; i < nIndices; i++) indices[i] = r.u32();

  // Optional UV section
  let uvs = null;
  let uvMaxErr = null;
  if (r.u8() !== 0) {
    const uvScales = [r.f32(), r.f32()];
    const uvBiases = [r.f32(), r.f32()];
    uvMaxErr = r.f32();
    uvs = new Float32Array(nVerts * 2);
    for (let i = 0; i < nVerts * 2; i++) {
      const axis = i % 2;
      uvs[i] = r.i16() * uvScales[axis] + uvBiases[axis];
    }
  }

  // Optional helper metadata section
  let helperMeta = null;
  if (r.u8() !== 0) helperMeta = r.lenPrefixedU32();

  return { nVerts, nIndices, positions, indices, uvs, posMaxErr, uvMaxErr, helperMeta };
}

function parseTarget(r) {
  const name = r.stringU16();
  const category = r.stringU16();
  const scale = r.f32();
  const maxAbsErr = r.f32();
  const n = r.u32();

  const indices = new Uint32Array(n);
  let prev = 0 >>> 0;
  for (let i = 0; i < n; i++) {
    prev = (prev + r.uvarint()) >>> 0;
    indices[i] = prev;
  }

  const deltas = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    deltas[i * 3 + 0] = r.i16() * scale;
    deltas[i * 3 + 1] = r.i16() * scale;
    deltas[i * 3 + 2] = r.i16() * scale;
  }

  return { name, category, scale, maxAbsErr, indices, deltas, count: n };
}

/**
 * Parse an OHPK v1 pack.
 * @param {Uint8Array} bytes raw .ohpk file
 * @param {(payload: Uint8Array) => Promise<Uint8Array>} inflateRaw raw-DEFLATE inflater
 */
export async function parseOhpk(bytes, inflateRaw) {
  if (bytes.length < 10) throw new Error('OHPK 文件太短，不是合法的资产包');
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error('OHPK magic 校验失败（不是 .ohpk 文件）');
  }
  const version = bytes[4];
  if (version !== 1) throw new Error(`不支持的 OHPK 版本 ${version}`);

  const flags = bytes[5];
  const declaredLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(6, true);
  const payload = bytes.subarray(10);

  let body;
  if (flags & FLAG_DEFLATE) {
    body = await inflateRaw(payload);
  } else {
    body = payload;
  }
  if (body.length !== declaredLen) {
    throw new Error(`OHPK body 长度不符：头部声明 ${declaredLen}，实际 ${body.length}`);
  }

  const r = new Reader(body);
  const manifest = JSON.parse(new TextDecoder('utf-8').decode(r.lenPrefixedU32()));
  const base = parseBaseMesh(r);
  const targetCount = r.u32();
  const targets = [];
  for (let i = 0; i < targetCount; i++) targets.push(parseTarget(r));

  return { manifest, base, targets };
}

/** Encode a base mesh + deltas as Wavefront OBJ text (v / vt / f v/vt). */
export function baseMeshToObj(base) {
  const { nVerts, positions, uvs, indices } = base;
  const out = [];
  out.push('# OxiHuman base mesh (decoded from OHPK v1)');
  const f = (x) => (Math.abs(x) < 1e-6 ? '0' : x.toFixed(6));
  for (let i = 0; i < nVerts; i++) {
    out.push(`v ${f(positions[i * 3])} ${f(positions[i * 3 + 1])} ${f(positions[i * 3 + 2])}`);
  }
  if (uvs) {
    for (let i = 0; i < nVerts; i++) out.push(`vt ${f(uvs[i * 2])} ${f(uvs[i * 2 + 1])}`);
  }
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] + 1, b = indices[i + 1] + 1, c = indices[i + 2] + 1;
    out.push(uvs ? `f ${a}/${a} ${b}/${b} ${c}/${c}` : `f ${a} ${b} ${c}`);
  }
  return out.join('\n');
}

/**
 * The shipped pack's base mesh also contains MakeHuman's overlay "helper"
 * shells (garment proxies) as open surfaces that cover the whole body. They are
 * not part of the body and render as huge sheets, so drop every open component
 * that spans a large fraction of the figure.
 *
 * A component is kept when it is watertight (after welding UV seams) or only
 * covers a small region.
 */
export function extractBody(base) {
  const { positions: P, indices: I, nVerts: N } = base;

  // 1. weld vertices that share a position (UV seams duplicate them)
  const keyToId = new Map();
  const vid2id = new Int32Array(N);
  for (let v = 0; v < N; v++) {
    const k = `${Math.round(P[v * 3] * 1e4)}|${Math.round(P[v * 3 + 1] * 1e4)}|${Math.round(P[v * 3 + 2] * 1e4)}`;
    let id = keyToId.get(k);
    if (id === undefined) { id = keyToId.size; keyToId.set(k, id); }
    vid2id[v] = id;
  }

  // 2. connected components over welded ids
  const parent = new Int32Array(keyToId.size);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  for (let i = 0; i < I.length; i += 3) {
    union(vid2id[I[i]], vid2id[I[i + 1]]);
    union(vid2id[I[i + 1]], vid2id[I[i + 2]]);
  }

  // 3. edge use counts → boundary detection
  const edgeUse = new Map();
  for (let i = 0; i < I.length; i += 3) {
    const tri = [I[i], I[i + 1], I[i + 2]];
    for (let e = 0; e < 3; e++) {
      const a = vid2id[tri[e]];
      const b = vid2id[tri[(e + 1) % 3]];
      if (a === b) continue;
      const key = a < b ? a * 4194304 + b : b * 4194304 + a;
      edgeUse.set(key, (edgeUse.get(key) || 0) + 1);
    }
  }
  const openEdges = new Map();
  for (const [key, count] of edgeUse) {
    if (count !== 1) continue;
    const a = Math.floor(key / 4194304);
    const r = find(a);
    openEdges.set(r, (openEdges.get(r) || 0) + 1);
  }

  // 4. per-component bounds
  const comps = new Map();
  for (let v = 0; v < N; v++) {
    const r = find(vid2id[v]);
    let c = comps.get(r);
    if (!c) {
      c = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], tris: 0 };
      comps.set(r, c);
    }
    for (let a = 0; a < 3; a++) {
      const x = P[v * 3 + a];
      if (x < c.min[a]) c.min[a] = x;
      if (x > c.max[a]) c.max[a] = x;
    }
  }
  for (let i = 0; i < I.length; i += 3) comps.get(find(vid2id[I[i]])).tris++;

  let totalHeight = 0;
  let minY = Infinity;
  for (const c of comps.values()) {
    totalHeight = Math.max(totalHeight, c.max[1] - c.min[1]);
    minY = Math.min(minY, c.min[1]);
  }
  const limit = totalHeight * 0.3;
  const groundBand = minY + 1.2;   // 脚踝以下：只可能是地面参考物 / 脚部标记

  const keep = new Set();
  const suitCandidates = [];
  const dropped = [];
  for (const [r, c] of comps) {
    const span = Math.max(c.max[0] - c.min[0], c.max[1] - c.min[1], c.max[2] - c.min[2]);
    const open = (openEdges.get(r) || 0) > 0;
    if (!open) {
      // 地面上的参考立方体与脚部小标记：封闭但不属于身体
      if (c.max[1] < groundBand && c.tris < 400) { dropped.push({ tris: c.tris, span }); continue; }
      // 资产包里散布的毫米级定位方块（12 面小立方，直径 < 3 cm），不是人体结构
      const diag = Math.hypot(c.max[0] - c.min[0], c.max[1] - c.min[1], c.max[2] - c.min[2]);
      if (c.tris <= 24 && diag < 0.3) { dropped.push({ tris: c.tris, span, debris: true }); continue; }
      keep.add(r);                                                          // 封闭曲面 = 身体 / 眼球 / 牙齿
      continue;
    }
    if (span > limit && c.tris > 200) { suitCandidates.push({ r, tris: c.tris }); continue; } // 大块开放壳 = 衣物层
    dropped.push({ tris: c.tris, span });                                   // 其余开放块 = 无贴图的卡片/附加细节
  }

  // 只保留最大的一层衣物（其余是叠在里面的同名代理壳，会产生穿插）
  const suit = new Set();
  suitCandidates.sort((a, b) => b.tris - a.tris);
  if (suitCandidates.length) suit.add(suitCandidates[0].r);

  const split = (predicate) => {
    const out = [];
    for (let i = 0; i < I.length; i += 3) {
      if (!predicate(find(vid2id[I[i]]))) continue;
      out.push(I[i], I[i + 1], I[i + 2]);
    }
    return new Uint32Array(out);
  };

  return {
    indices: split((r) => keep.has(r)),
    suitIndices: split((r) => suit.has(r)),
    dropped,
    components: comps.size,
  };
}

/**
 * Weld vertices that share a position. MakeHuman's base mesh duplicates vertices
 * along UV seams; those duplicates get separate normals, which shows up as hard
 * shading lines running down the neck, arms and legs. Rendering the welded mesh
 * gives one continuous surface with no seams.
 *
 * `rep[i]` is an original vertex index that supplies the position of welded
 * vertex i, so the caller can keep deforming the original buffer and just copy
 * the representative positions over.
 */
export function weldMesh(base, indices) {
  const { positions: P } = base;
  const keyToId = new Map();
  const rep = [];
  const out = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    const k = `${Math.round(P[v * 3] * 1e4)}|${Math.round(P[v * 3 + 1] * 1e4)}|${Math.round(P[v * 3 + 2] * 1e4)}`;
    let id = keyToId.get(k);
    if (id === undefined) {
      id = rep.length;
      keyToId.set(k, id);
      rep.push(v);
    }
    out[i] = id;
  }
  return { indices: out, rep: Int32Array.from(rep), vertexCount: rep.length };
}

/** Compact JSON target descriptor for WasmEngine.load_target_from_json(). */export function targetToJson(t) {
  const parts = new Array(t.count);
  for (let i = 0; i < t.count; i++) {
    parts[i] = `[${t.indices[i]},${round4(t.deltas[i * 3])},${round4(t.deltas[i * 3 + 1])},${round4(t.deltas[i * 3 + 2])}]`;
  }
  return `{"deltas":[${parts.join(',')}]}`;
}

function round4(x) {
  const v = Math.round(x * 10000) / 10000;
  return Object.is(v, -0) ? 0 : v;
}

/** Parse the binary mesh buffer returned by WasmEngine.build_mesh_bytes(). */
export function parseMeshBytes(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 0;
  const version = dv.getUint32(off, true); off += 4;
  const vertexCount = dv.getUint32(off, true); off += 4;
  const indexCount = dv.getUint32(off, true); off += 4;

  const positions = new Float32Array(bytes.buffer, bytes.byteOffset + off, vertexCount * 3); off += vertexCount * 3 * 4;
  const normals = new Float32Array(bytes.buffer, bytes.byteOffset + off, vertexCount * 3); off += vertexCount * 3 * 4;
  const uvs = new Float32Array(bytes.buffer, bytes.byteOffset + off, vertexCount * 2); off += vertexCount * 2 * 4;
  const indices = new Uint32Array(bytes.buffer, bytes.byteOffset + off, indexCount);

  return { version, vertexCount, indexCount, positions, normals, uvs, indices };
}
