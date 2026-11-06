# 体脂率 LightGBM 模型（训练 → 导出 → 前端推理）

网页「专业版」的体脂预测由这里的 LightGBM 模型给出。模型在本地训练好之后被压成一份
JSON 放到 `vendor/lgbm_bodyfat.json`，浏览器直接推理，**不需要任何后端服务**——
任何人打开 Pages 链接都能用到同一个模型。

## 数据

- 数据集：Kaggle **Body Fat Extended Dataset**（simonezappatini），436 条真实体测记录，
  男性 252 / 女性 184；体脂率由水下称重得到的体密度经 Siri 方程换算。
- 本地文件：`ml/data/bodyfat_extended.csv`，SHA-256 `2c6896ce…005b8d`，来源说明见 `ml/data/SOURCE.md`。
- 清洗：剔除年龄、身高、体重、腰围、臀围、上臂围或体脂率超出生理合理范围的记录，剩 **432 条**。

## 特征

只使用网页表单真正能采集到的 8 项，顺序即模型输入顺序：

| 字段 | 含义 | 备注 |
|---|---|---|
| `sex` | 性别 | 1=男，0=女（前端传 1/2，调用前转换） |
| `age` | 年龄 | 岁 |
| `height` | 身高 | cm（原始数据为米，训练脚本自动 ×100） |
| `weight` | 体重 | kg |
| `bmi` | BMI | `weight/(height/100)^2`，由前端现算 |
| `waist` | 腰围 | 对应数据集 `Abdomen`（脐部腹围） |
| `hip` | 臀围 | cm |
| `arm` | 上臂围 | 对应数据集 `Biceps` |

目标：`body_fat`（体脂率 %）。

## 训练

```bash
python ml/train_lgbm.py            # 全网格，5 折，约 90 秒
python ml/train_lgbm.py --quick    # 小网格冒烟
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

### 当前结果

| 指标 | 数值 |
|---|---|
| 交叉验证 RMSE | 4.44 |
| 测试集 RMSE / MAE / R² | 4.17 / 3.44 / 0.646 |
| 最优参数 | `n_estimators=200, num_leaves=7, lr=0.03, colsample=0.85, subsample=0.7, λ=1.0` |
| 实际使用轮次 | 133 棵（早停） |

样本量只有 432 条，R²≈0.65 属正常范围；指标仅代表该固定留出集，不能替代独立人群验证。

## 导出格式（`lgbm-flat-v1`）

`vendor/lgbm_bodyfat.json`：

```json
{
  "format": "lgbm-flat-v1",
  "feature_names": ["sex","age","height","weight","bmi","waist","hip","arm"],
  "num_trees": 133,
  "trees": [ [ [isLeaf, featureIdx, threshold, leftIdx, rightIdx, leafValue], ... ], ... ],
  "meta": { "best_params": {...}, "metrics": {...}, "dataset": {...} }
}
```

每棵树按先序展平成节点数组：`isLeaf=0` 时按 `x[feature] <= threshold` 走左/右子树，
`isLeaf=1` 时取 `leafValue`。**预测值 = 所有树叶子值之和**（LightGBM 已把学习率折进叶子值，
不需要再乘 `learning_rate`）。

前端实现见 `oxihuman_index.html` 里的 `lgbmLoad()` / `lgbmPredict()`：加载一次 JSON 缓存到内存，
每次提交表单遍历 133 棵树，耗时亚毫秒级。

### 一致性校验

```bash
node ml/verify_export.mjs     # 读取 ml/export_check.json，逐条比对 JS 与 Python 推理
# 实测 132 条样本最大误差 4.9e-07（浮点精度级）
```

`ml/export_check.json` 由训练脚本生成（120 条数据抽样 + 12 组边界组合），换模型后可复跑校验。

## 失效时的回退链

1. **内置模型**（首选，所有人可用）；
2. 模型文件加载失败（`file://` 打开、被拦截）→ 请求 `http://127.0.0.1:8001/api/bodyfat/predict`（旧本地服务，保留兼容）；
3. 仍失败 → 页面里的线性公式 `1.20·BMI + 0.23·年龄 + 0.15·腰围 − 0.10·臀围 + 0.08·上臂围 − 10.8(男) − 5.4`。

## 注意

模型输出与旧线性公式不是同一口径：真实数据里同围度人群更瘦，例如 170cm/65kg、
腰围 82cm、臀围 94cm、上臂围 30cm 的 30 岁男性，线性公式给 23%，模型给约 14%。
这是数据驱动结果，页面上的分级阈值（男 6/14/18/25）仍适用。
