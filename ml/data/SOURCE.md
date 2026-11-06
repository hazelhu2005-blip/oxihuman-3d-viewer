# 数据来源与字段映射

## 当前使用：NHANES 体格测量 + DXA 体脂

- 本地文件：`bodyfat_nhanes.csv`（`ml/data/bodyfat_nhanes.csv`）
- 上游路径：`D:\智能体脂管家\data\processed处理后的数据\bodyfat_dataset.csv`
- 原始样本：2423 条，男性 1166 / 女性 1257，年龄 18–59 岁，无缺失
- 清洗后用于建模：2422 条（去重 1 条），男 1166 / 女 1256
- SHA-256：`DD910DBAA436A986FAE3EE326B9A730E69A69E530CAA761641C18E402C08530B`
- 体脂观测方式：DXA（双能 X 线吸收法），比水下称重覆盖面更广、人群代表性更好
- `SEQN` 为 NHANES 受访者序列号，仅作标识，不参与建模

字段映射：

| 原始列 | 模型列 | 说明 |
|---|---|---|
| `Gender` | `sex` | NHANES 编码 1=男、2=女 → 训练时转为 1/0 |
| `Age` | `age` | 岁 |
| `Height` | `height` | 已是 cm |
| `Weight` | `weight` | kg |
| `BMI` | — | 不使用原列，训练时按 `weight/(height/100)^2` 现算，与前端完全一致 |
| `Waist` | `waist` | 腰围 cm |
| `Hip` | `hip` | 臀围 cm |
| `ArmCircumference` | `arm` | 上臂围 cm |
| `BodyFat` | `body_fat` | 目标变量，% |

## 历史数据（已停用，脚本仍兼容其表头）

- 数据集：Body Fat Extended Dataset（Kaggle，Simone Zappatini），436 条，男 252 / 女 184
- 本地文件：`bodyfat_extended.csv`，SHA-256 `2C6896CE…005B8D`
- 表头差异：`Sex`（M/F）、`Abdomen`（取代 `Waist`）、`Biceps`（取代 `ArmCircumference`）、`Height` 单位为米
- 体脂由水下称重体密度经 Siri 方程换算

`ml/train_lgbm.py` 的 `load_dataset()` 会自动识别这两套表头（性别支持 `Gender 1/2`、
`Sex M/F`；身高为米时自动 ×100），所以 `--data` 指向任一份都能直接训练。
