/* 校验「浏览器端推理 == Python 端模型输出」。
   读取 vendor/lgbm_bodyfat.json 与 ml/export_check.json，逐条比对。
   用法：node ml/verify_export.mjs */
import fs from 'fs';

const model = JSON.parse(fs.readFileSync(new URL('../vendor/lgbm_bodyfat.json', import.meta.url), 'utf8'));
const rows = JSON.parse(fs.readFileSync(new URL('./export_check.json', import.meta.url), 'utf8'));

function predict(m, x) {
  const f = m.feature_names.map(k => +x[k]);
  let sum = 0;
  for (const tree of m.trees) {
    let i = 0, guard = 0;
    while (tree[i][0] === 0 && guard++ < 512) i = f[tree[i][1]] <= tree[i][2] ? tree[i][3] : tree[i][4];
    sum += tree[i][5];
  }
  return sum;
}

let maxErr = 0, worst = null;
for (const r of rows) {
  const p = predict(model, r);
  const e = Math.abs(p - r.pred);
  if (e > maxErr) { maxErr = e; worst = { ...r, js: p }; }
}
console.log(`模型：${model.num_trees} 棵树，${model.feature_names.join(',')}`);
console.log(`样本：${rows.length} 条，最大误差 ${maxErr.toExponential(3)}`);
if (worst) console.log('最差样本：', JSON.stringify(worst));
const m = model.meta || {};
console.log('指标：', JSON.stringify(m.metrics || {}));
process.exit(maxErr < 1e-5 ? 0 : 1);
