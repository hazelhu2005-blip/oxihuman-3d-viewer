# 数据来源与映射

- 数据集：Body Fat Extended Dataset
- Kaggle 发布者：Simone Zappatini 及协作者
- 数据页：https://www.kaggle.com/datasets/simonezappatini/body-fat-extended-dataset
- 本地文件：`kaggle_bodyfat_extended.csv`
- 下载日期：2026-07-13
- 原始样本：436 条，其中男性 252、女性 184；按预先定义的生理合理性规则排除 6 条明显异常记录后，430 条进入建模
- Kaggle 标注许可：Database: Open Database；Contents: © Original Authors
- SHA-256：`2C6896CEEE9492ED492CCFF853776A15D261E4AF16A8A110DAAB9D26AA005B8D`

数据集中的体脂率基于水下称重得到的体密度，并使用 Siri 方程换算。原始男性数据由 A. Garth Fisher 提供，并获准自由分发和用于非商业用途；具体引用与参考文献以 Kaggle 数据页为准。

字段映射：`BodyFat → body_fat`、`Sex → sex`、`Biceps → upper_arm`。原始 `Height` 单位为米，训练时转换为厘米。数据集仅提供脐部水平的 `Abdomen`，没有独立 `Waist`；因此简易模式的腰腹围输入映射为 `Abdomen`，专业模式优先使用腹围实测值，避免复制特征造成共线性。
