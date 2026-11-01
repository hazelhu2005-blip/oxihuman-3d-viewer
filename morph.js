// MakeHuman-style macrodetails blending for the OxiHuman core pack.
// Pure ES module — used by both the page and Node-side verification.

const RE_CORNER = /^macrodetails\/(?:universal|african|asian|caucasian)-(male|female)-(young|old)-(min|max|average)muscle-(min|max|average)weight$/;
const RE_HEIGHT = /^macrodetails\/height\/(male|female)-young-averagemuscle-averageweight-(min|max)height$/;
const RE_MEASURE = /^measure\/measure-(bust|hips|underbust|waist)-circ-(incr|decr)$/;

/** Bucket the pack's targets into a lookup structure. */
export function classifyTargets(targets) {
  const corners = { female: { young: {}, old: {} }, male: { young: {}, old: {} } };
  const height = { female: {}, male: {} };
  const measure = {};
  const unused = [];

  for (const t of targets) {
    let m;
    if ((m = RE_CORNER.exec(t.name))) {
      const [, gender, age, muscle, weight] = m;
      // Only the 4 hard corners take part in bilinear blending; average-* variants
      // are ignored on purpose (they would double-count the centre shape).
      if (muscle === 'average' || weight === 'average') { unused.push(t.name); continue; }
      corners[gender][age][`${muscle}-${weight}`] = t;
      continue;
    }
    if ((m = RE_HEIGHT.exec(t.name))) {
      height[m[1]][m[2]] = t;
      continue;
    }
    if ((m = RE_MEASURE.exec(t.name))) {
      const [, part, dir] = m;
      (measure[part] ||= {})[dir] = t;
      continue;
    }
    unused.push(t.name);
  }
  return { corners, height, measure, unused };
}

/**
 * Turn slider params into concrete target weights.
 * @param {{gender:number, age:number, muscle:number, weight:number, height:number,
 *          bust:number, waist:number, hips:number, underbust:number}} p
 */
export function computeWeights(p, index) {
  const out = new Map();
  const add = (target, w) => {
    if (!target || !(w > 1e-4)) return;
    out.set(target.name, (out.get(target.name) || 0) + w);
  };

  const g = clamp01(p.gender), a = clamp01(p.age), m = clamp01(p.muscle), w = clamp01(p.weight);

  for (const gender of ['female', 'male']) {
    const gw = gender === 'male' ? g : 1 - g;
    if (gw <= 1e-4) continue;
    for (const age of ['young', 'old']) {
      const aw = age === 'old' ? a : 1 - a;
      const G = gw * aw;
      if (G <= 1e-4) continue;
      const c = index.corners[gender][age];
      const names = ['min-min', 'min-max', 'max-min', 'max-max'];
      const bilinear = [(1 - m) * (1 - w), (1 - m) * w, m * (1 - w), m * w];
      names.forEach((n, i) => add(c[n], G * bilinear[i]));
    }
  }

  // Stature is handled as an explicit proportional scale (see applyStature) —
  // the pack's height/ targets store a ~±40 % proportional stretch, far larger
  // than a realistic stature range, so they are deliberately not blended here.

  // Girth targets: sliders are 0..1 with 0.5 = neutral.
  for (const part of ['bust', 'waist', 'hips', 'underbust']) {
    const v = p[part];
    if (v === undefined) continue;
    let t = (v - 0.5) * 2; 
    if (part === 'bust') {
        t = t * 0.6; // 强行把胸部的变化幅度缩小 40%
    }

    const pair = index.measure[part];
    if (!pair) continue;
    if (t > 0) add(pair.incr, t);
    else add(pair.decr, -t);
  }

  return out;
}

/**
 * positions = base + Σ weight × delta
 * @param {Float32Array} basePositions
 * @param {Map<string, number>} weights
 * @param {Map<string, {indices: Uint32Array, deltas: Float32Array}>} targetMap
 * @param {Float32Array} [out]
 */
export function applyWeights(basePositions, weights, targetMap, out) {
  const dst = out || new Float32Array(basePositions.length);
  dst.set(basePositions);
  for (const [name, w] of weights) {
    const t = targetMap.get(name);
    if (!t) continue;
    const { indices, deltas } = t;
    for (let i = 0; i < indices.length; i++) {
      const o = indices[i] * 3;
      dst[o] += w * deltas[i * 3];
      dst[o + 1] += w * deltas[i * 3 + 1];
      dst[o + 2] += w * deltas[i * 3 + 2];
    }
  }
  return dst;
}

/**
 * Proportionally scale the body around the feet to change stature.
 * Taller bodies are also slightly wider, hence the smaller XZ factor.
 */
export function applyStature(positions, height01, pivotY, out) {
  const t = clamp01(height01) - 0.5;
  const sy = 1 + t * 0.12;
  const sxz = 1 + t * 0.05;
  const dst = out || positions;
  if (dst !== positions) dst.set(positions);
  for (let i = 0; i < dst.length; i += 3) {
    dst[i] *= sxz;
    dst[i + 1] = pivotY + (dst[i + 1] - pivotY) * sy;
    dst[i + 2] *= sxz;
  }
  return dst;
}

/**
 * Male chest corrective.
 *
 * The shipped core pack has gender corners (`universal-male-*` / `universal-female-*`)
 * but no breast-specific target, so a 100 % male body still carries the full
 * volumetric bust of the base mesh. Measured on the pack: the male midline peaks at
 * z = 1.94 around y = 3.1, i.e. a 3 cm mammary mound centred exactly on the nipple —
 * a pectoral sits higher (y ≈ 3.8), is split left/right, and is far shallower.
 *
 * Two hard constraints shaped this implementation:
 *
 * 1. The target depth must depend on (x, y) only. An earlier version used a 3-D
 *    ellipsoid around the nipple, which made the z -> z' mapping non-monotonic:
 *    wherever the target surface crossed the skin it squeezed out a hard arc — the
 *    "under-bust crease" visible in renders.
 * 2. The target must not be derived from the mesh itself by smoothing/eroding.
 *    Erosion digs the bust out but also sinks the whole chest, ending up with a
 *    torso that is 1.6 cm *deeper* at the belly than at the sternum.
 *
 * So the target is an explicit anatomical profile, anchored to a per-shape depth
 * reference (the median front-torso depth, which tracks muscle/weight/age):
 *
 *     target(x, y) = zRef + spine(y) + pectoral(x, y)
 *
 * `zRef` is the median depth of the *abdomen*, not of the whole chest: the bust
 * dominates any chest-wide statistic, which would leave the corrected chest deeper
 * than the belly. `spine` is the sternum line relative to that abdominal plane,
 * `pectoral` adds two lobes either side of it. Both are C1-continuous in (x, y),
 * so no crease can appear anywhere, and the skin is eased onto the target.
 *
 * @param {Float32Array} positions  model-space positions, mutated in place
 * @param {Uint32Array}  indices    triangle indices (to skip unreferenced verts)
 * @param {number}       male01     0 = untouched, 1 = full male correction
 */
export function applyChestCorrection(positions, indices, male01, opts) {
  let m = clamp01(male01);
  
  if (m < 0.2) {
      m = 0.05;
  }

  if (m < 0.002) return positions;

  const O = opts || {};
  const PEC_H = O.pec === undefined ? 0.115 : O.pec;        // 单侧胸肌峰值厚度（dm）
  const PEC_CY = O.pecY === undefined ? 3.70 : O.pecY;      // 胸肌中心高度
  const PEC_CX = O.pecCX === undefined ? 0.62 : O.pecCX;    // 胸肌中心横向位置
  const PEC_RX = O.pecRX === undefined ? 0.72 : O.pecRX;    // 横向半轴
  const PEC_RY = O.pecRY === undefined ? 0.58 : O.pecRY;    // 纵向半轴
  const PEC_CORE = O.pecCore === undefined ? 0.54 : O.pecCore;  // 平顶区半径比例
  // 胸大肌外上厚、内下薄：中心高度随 |x| 抬升，下缘因此成为一条斜线，
  // 而不是水平圆弧（水平圆弧是乳房的特征）。
  const PEC_TILT = O.pecTilt === undefined ? 0.26 : O.pecTilt;
  const STRENGTH = O.strength === undefined ? 1.0 : O.strength;

  const nAll = positions.length / 3;
  const seen = new Uint8Array(nAll);
  for (let i = 0; i < indices.length; i += 3) {
    seen[indices[i]] = 1; seen[indices[i + 1]] = 1; seen[indices[i + 2]] = 1;
  }

  // ---- 1. 深度基准：腹部软组织的正面中位深度（用直方图求，避免排序）----
  //      取腹部而不是整个躯干，否则乳房的体积会把基准抬高，压完之后胸比肚子还深。
  // 只取中线附近：腹部高度带上 |x| 放到 1.2 会把腰侧（z≈0.7）也统计进来，
  // 中位数因此被拉到 1.59，整片胸腹都会被压塌。
  const AB_LO = 2.35, AB_HI = 2.95, XR = 0.60;
  const HIST_N = 128, HIST_LO = 1.0, HIST_HI = 2.4;
  const hist = new Uint32Array(HIST_N);
  let samples = 0;
  for (let v = 0; v < nAll; v++) {
    if (!seen[v]) continue;
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    if (z < 0.6) continue;                    // 只取躯干正面（手臂深度接近 0）
    if (y < AB_LO || y > AB_HI || Math.abs(x) > XR) continue;
    if (z < HIST_LO || z >= HIST_HI) continue;
    hist[Math.floor((z - HIST_LO) / (HIST_HI - HIST_LO) * HIST_N)]++;
    samples++;
  }
  // 中线附近在这一带上只有十几个顶点，阈值不能定高，否则会直接跳过修正
  if (samples < 4) return positions;
  let acc = 0, bin = 0;
  for (; bin < HIST_N; bin++) {
    acc += hist[bin];
    if (acc * 2 >= samples) break;
  }
  const zRef = HIST_LO + ((bin + 0.5) / HIST_N) * (HIST_HI - HIST_LO);

  // ---- 2. 中线（胸骨）相对深度：锁骨下收、胸廓渐深、腹部再略前凸 ----
  //      节点为 (y, 相对 zRef 的偏移)，中间用 smoothstep 插值保持 C1 连续
  const SPINE = [
    [2.10, 0.010], [2.35, 0.000], [2.60, -0.025], [2.85, -0.075],
    [3.05, -0.090], [3.25, -0.095], [3.45, -0.090], [3.65, -0.082],
    [3.85, -0.090], [4.05, -0.110], [4.25, -0.150], [4.45, -0.200],
    [4.65, -0.260],
  ];
  const spineAt = (y) => {
    if (y <= SPINE[0][0]) return SPINE[0][1];
    const last = SPINE.length - 1;
    if (y >= SPINE[last][0]) return SPINE[last][1];
    let i = 0;
    while (i < last && SPINE[i + 1][0] < y) i++;
    const [y0, v0] = SPINE[i], [y1, v1] = SPINE[i + 1];
    let t = (y - y0) / (y1 - y0);
    t = t * t * (3 - 2 * t);                  // smoothstep，节点处导数为 0
    return v0 + (v1 - v0) * t;
  };

  // ---- 3. 作用窗口：躯干核心权重为 1，锁骨与下腹两端平滑收口 ----
  //      钟形曲线会让胸肌处只剩半程效果，所以用「平台 + smoothstep 收口」。
  const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  //      过渡带要足够宽（≥6 cm）：网格顶点间距约 1.5 cm，权重在窄带上从 1 掉到 0
  //      会在光照下显出一条折线。
  const band = (y) => {
    if (y <= 2.10 || y >= 4.80) return 0;
    if (y < 2.75) return smoothstep((y - 2.10) / 0.65);
    if (y > 4.15) return smoothstep((4.80 - y) / 0.65);
    return 1;
  };
  const lateral = (x) => smoothstep((1.55 - Math.abs(x)) / 1.00);

  // ---- 4. 贴合目标面 ----
  for (let v = 0; v < nAll; v++) {
    if (!seen[v]) continue;
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    if (z < 0.6) continue;

    const wy = band(y);
    if (wy <= 0) continue;
    const wx = lateral(x);
    if (wx <= 0) continue;
    const w = m * wy * wx * STRENGTH;
    if (w <= 0.001) continue;

    // 平顶椭圆块：d<CORE 时恒为 1（肌肉的平坦顶面），到 d=1 平滑收到 0。
    // 中央两个块在中线处互相抵到 0，胸骨沟因此自然形成。
    const pecY = y - PEC_CY - PEC_TILT * (Math.abs(x) - PEC_CX);
    const dy = pecY / PEC_RY;
    const dxl = (x + PEC_CX) / PEC_RX;
    const dxr = (x - PEC_CX) / PEC_RX;
    const dl = Math.sqrt(dxl * dxl + dy * dy);
    const dr = Math.sqrt(dxr * dxr + dy * dy);
    const pecl = 1 - smoothstep((dl - PEC_CORE) / (1 - PEC_CORE));
    const pecr = 1 - smoothstep((dr - PEC_CORE) / (1 - PEC_CORE));
    const pec = PEC_H * (pecl + pecr);
    const target = zRef + spineAt(y) + pec;

    positions[v * 3 + 2] = z + (target - z) * w;
  }
  return positions;
}

export function applyGenderSilhouette(positions, male01) {
  const m = clamp01(male01) * 2 - 1;      // -1 = 女，+1 = 男
  if (Math.abs(m) < 0.02) return positions;

  const bump = (y, c, s) => {
    const t = (y - c) / s;
    return Math.exp(-t * t);
  };

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const ax = Math.abs(x);
    if (ax > 2.4) continue;                       // 手臂不参与缩放，避免与躯干错位
    const win = ax < 1.7 ? 1 : (2.4 - ax) / 0.7;  // 向体侧平滑收口
    const shoulder = bump(y, 4.55, 1.15);
    const pelvis = bump(y, -0.55, 1.25);
    const k = m * (0.048 * shoulder - 0.075 * pelvis) * win;
    if (k !== 0) positions[i] = x * (1 + k);
  }
  return positions;
}

export function boundsOf(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = positions[i + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  return { min, max };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
