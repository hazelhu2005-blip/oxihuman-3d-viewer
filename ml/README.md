# 体脂率 LightGBM 模型（训练 → 导出 → 前端推理）

网页「专业版」的体脂预测由这里的 LightGBM 模型给出。模型在本地训练好之后被压成一份
JSON 放到 `vendor/lgbm_bodyfat.json`，浏览器直接推理，**不需要任何后端服务**——
任何人打开 Pages 链接都能用到同一个模型。

## 数据

- 数据集：**NHANES 体格测量 + DXA 体脂**（来自 `D:\智能体脂管家\data\processed处理后的数据\bodyfat_dataset.csv`），
  原始 2423 条，男性 1166 / 女性 1256，年龄 18–59 岁。
- 本地文件：`ml/data/bodyfat_nhanes.csv`，SHA-256 `dd910dba…c08530b`，字段与来源见 `ml/data/SOURCE.md`。
- 清洗：按生理合理范围过滤（年龄 18–85、身高 140–210、体重 35–250、腰围 45–180、臀围 60–180、
  上臂围 15–80、体脂 2–60）并去重，剩 **2422 条**（男 1166 / 女 1256），无缺失。

原始字段：`SEQN, Gender, Age, Weight, Height, BMI, Waist, Hip, ArmCircumference, BodyFat`，
其中 `Gender` 为 NHANES 编码（1=男，2=女）。

## 特征

只使用网页表单真正能采集到的 8 项，顺序即模型输入顺序：

| 字段 | 含义 | 备注 |
|---|---|---|
| `sex` | 性别 | 1=男，0=女（数据集 1/2 → 0/1，前端传 1/2 由 `lgbmPredict` 转换） |
| `age` | 年龄 | 岁 |
| `height` | 身高 | cm（脚本自动识别米的单位并 ×100） |
| `weight` | 体重 | kg |
| `bmi` | BMI | `weight/(height/100)^2`，由前端现算 |
| `waist` | 腰围 | 对应数据集 `Waist`（兼容旧表头 `Abdomen`） |
| `hip` | 臀围 | cm |
| `arm` | 上臂围 | 对应数据集 `ArmCircumference`（兼容旧表头 `Biceps`） |

目标：`body_fat`（体脂率 %）。

## 训练

```bash
python ml/train_lgbm.py            # 全网格，5 折，约 3.5 分钟
python ml/train_lgbm.py --quick    # 小网格冒烟
python ml/train_lgbm.py --data 其他路径.csv   # 换数据源（自动识别两套表头）
```

流水线：`SimpleImputer(median) → LGBMRegressor`，用 `GridSearchCV` 在下列网格上搜索
（1296 组 × 5 折 = 6480 次拟合，评分 `neg_root_mean_squared_error`）：

| 参数 | 取值 |
|---|---|
| `n_estimators` | 200 / 400 / 700 |
| `num_leaves` | 7 / 15 / 31 / 63 |
| `learning_rate` | 0.01 / 0.03 / 0.05 / 0.1 |
| `subsample` | 0.7 / 0.85 / 1.0 |
| `colsample_bytree` | 0.7 / 0.85 / 1.0 |
| `reg_lambda` | 0.0 / 1.0 / 10.0 |

选出的最优组合再用 15% 验证集早停（patience 60）重训，剪掉多余轮次，最后在 15% 留出测试集上评估。

> 注：LightGBM 的 sklearn 接口需要 `subsample_freq>0` 才会真正启用行采样，默认 0，
> 所以网格里的 `subsample` 实际不生效——小网格与全网格跑出相同结果不是缓存问题。

### 当前结果（NHANES 2422 条）

| 指标 | 数值 |
|---|---|
| 交叉验证 RMSE | 3.292 |
| 测试集 RMSE / MAE / R² | 3.393 / 2.623 / **0.841** |
| 最优参数 | `n_estimators=200, num_leaves=7, lr=0.1, colsample=0.7, subsample=0.7, λ=10.0` |
| 实际使用轮次 | 187 棵（早停） |
| 模型体积 | 82 KB |

相比早期的 436 条 Kaggle 数据（R² 0.646），样本量与人群覆盖提升后 R² 到 0.841，
MAE 从 3.44 降到 2.62 个百分点。指标仅代表该固定留出集，不能替代独立人群验证。

## 导出格式（`lgbm-flat-v1`）

`vendor/lgbm_bodyfat.json`：

```json
{
  "format": "lgbm-flat-v1",
  "feature_names": ["sex","age","height","weight","bmi","waist","hip","arm"],
  "num_trees": 187,
  "trees": [ [ [isLeaf, featureIdx, threshold, leftIdx, rightIdx, leafValue], ... ], ... ],
  "meta": { "best_params": {...}, "metrics": {...}, "dataset": {...} }
}
```

每棵树按先序展平成节点数组：`isLeaf=0` 时按 `x[feature] <= threshold` 走左/右子树，
`isLeaf=1` 时取 `leafValue`。**预测值 = 所有树叶子值之和**（LightGBM 已把学习率折进叶子值，
不需要再乘 `learning_rate`）。

前端实现见 `oxihuman_index.html` 里的 `lgbmLoad()` / `lgbmPredict()`：加载一次 JSON 缓存到内存，
每次提交表单遍历 187 棵树，耗时亚毫秒级。请求用 `cache:'no-cache'`，
每次带 ETag 校验——模型更新后老用户不会卡在浏览器缓存的旧版本上。

### 一致性校验

```bash
node ml/verify_export.mjs     # 读取 ml/export_check.json，逐条比对 JS 与 Python 推理
# 实测 132 条样本最大误差 4.8e-07（浮点精度级）
```

`ml/export_check.json` 由训练脚本生成（120 条数据抽样 + 12 组边界组合），换模型后可复跑校验。

## 失效时的回退链

1. **内置模型**（首选，所有人可用）；
2. 模型文件加载失败（`file://` 打开、被拦截）→ 请求 `http://127.0.0.1:8001/api/bodyfat/predict`（旧本地服务，保留兼容）；
3. 仍失败 → 页面里的线性公式 `1.20·BMI + 0.23·年龄 + 0.15·腰围 − 0.10·臀围 + 0.08·上臂围 − 10.8(男) − 5.4`。

## 注意

模型输出与旧线性公式不是同一口径：线性公式在同围度人群上偏高。
例如 170cm/65kg、腰围 82cm、臀围 92cm、上臂围 31cm 的 30 岁男性，
线性公式给 23.0%，模型给 **20.4%**（该数据集中腰围 78–86 男性的体脂中位数是 21.1%）。
页面分级阈值（男 6/14/18/25）仍适用。

简单版走的是另一条腰围公式（男 `0.567×腰围 − 31.8`，女 `0.439×腰围 − 15.2`），
只输入腰围时给出 14.7%，与专业版存在口径差，属原有设计。
