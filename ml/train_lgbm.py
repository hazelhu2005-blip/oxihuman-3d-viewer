# -*- coding: utf-8 -*-
"""训练 LightGBM 体脂模型，并把模型导出为前端可直接推理的 JSON。

数据：NHANES 体格测量（2423 条，男 1166 / 女 1257，18-59 岁），
字段 Gender(1男/2女) / Age / Height / Weight / BMI / Waist / Hip /
ArmCircumference / BodyFat，与网页表单一一对应。

流程：
  1) 读取数据并做生理范围清洗（缺失、越界、重复去掉）；
  2) 特征只用网页表单能采集到的 8 项：性别、年龄、身高、体重、BMI、腰围、臀围、上臂围；
  3) 用 GridSearchCV 在用户指定的参数网格上搜索（5 折），早停重训后留出测试集评估；
  4) 把 booster 的树结构压成扁平数组，写入 vendor/lgbm_bodyfat.json，供浏览器端 JS 推理。

运行：
  python ml/train_lgbm.py            # 默认网格 + 5 折
  python ml/train_lgbm.py --quick    # 小网格，用于快速冒烟
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import time
import warnings
from pathlib import Path

import lightgbm
import numpy as np
import pandas as pd
import sklearn
from lightgbm import LGBMRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, KFold, train_test_split
from sklearn.pipeline import Pipeline

warnings.filterwarnings("ignore", message=".*eval_set.*")

SEED = 42
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "bodyfat_nhanes.csv"
OUT_MODEL = ROOT.parent / "vendor" / "lgbm_bodyfat.json"
OUT_REPORT = ROOT / "model_report.json"

# 前端表单实际能拿到的字段，顺序即 JSON 里的 feature_names
FEATURES = ["sex", "age", "height", "weight", "bmi", "waist", "hip", "arm"]
FEATURE_CN = {
    "sex": "性别", "age": "年龄", "height": "身高", "weight": "体重",
    "bmi": "BMI", "waist": "腰围", "hip": "臀围", "arm": "上臂围",
}
TARGET = "body_fat"

PARAM_GRID = {
    "model__n_estimators": [200, 400, 700],
    "model__num_leaves": [7, 15, 31, 63],
    "model__learning_rate": [0.01, 0.03, 0.05, 0.1],
    "model__subsample": [0.7, 0.85, 1.0],
    "model__colsample_bytree": [0.7, 0.85, 1.0],
    "model__reg_lambda": [0.0, 1.0, 10.0],
}


def tree_pipeline(estimator) -> Pipeline:
    """与离线实验一致的流水线：中位数填补 -> 模型。"""
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", estimator)])


def _pick(raw: pd.DataFrame, *names: str) -> pd.Series:
    """按候选列名取列（兼容 NHANES 与 Kaggle 两套表头）。"""
    for n in names:
        if n in raw.columns:
            return raw[n]
    raise KeyError(f"数据缺少列：{names}；实际列={list(raw.columns)}")


def load_dataset(path: Path) -> pd.DataFrame:
    raw = pd.read_csv(path)

    # 性别：NHANES 用 1=男/2=女，Kaggle 用 M/F，统一成 1=男/0=女
    sex_raw = _pick(raw, "Gender", "Sex")
    if sex_raw.dtype == object:
        sex = sex_raw.astype(str).str.strip().str.upper().map({"M": 1, "F": 0, "MALE": 1, "FEMALE": 0})
    else:
        sex = pd.to_numeric(sex_raw, errors="coerce").map({1: 1, 2: 0})

    df = pd.DataFrame({
        "sex": sex,
        "age": pd.to_numeric(_pick(raw, "Age"), errors="coerce"),
        "height": pd.to_numeric(_pick(raw, "Height"), errors="coerce"),
        "weight": pd.to_numeric(_pick(raw, "Weight"), errors="coerce"),
        "waist": pd.to_numeric(_pick(raw, "Waist", "Abdomen"), errors="coerce"),
        "hip": pd.to_numeric(_pick(raw, "Hip"), errors="coerce"),
        "arm": pd.to_numeric(_pick(raw, "ArmCircumference", "Biceps"), errors="coerce"),
        "body_fat": pd.to_numeric(_pick(raw, "BodyFat"), errors="coerce"),
    })
    # 少数来源身高单位是米
    if df["height"].median() < 3:
        df["height"] = df["height"] * 100
    df["bmi"] = df["weight"] / (df["height"] / 100) ** 2

    ranges = {
        "age": (18, 85), "height": (140, 210), "weight": (35, 250),
        "waist": (45, 180), "hip": (60, 180), "arm": (15, 80), "body_fat": (2, 60),
    }
    mask = pd.Series(True, index=df.index)
    for col, (lo, hi) in ranges.items():
        mask &= df[col].between(lo, hi)
    df = df[mask].dropna().reset_index(drop=True)
    return df.drop_duplicates(subset=FEATURES + ["body_fat"]).reset_index(drop=True)


def export_booster(booster: lightgbm.Booster, feature_names: list[str], num_iteration: int | None = None) -> dict:
    """把 booster 压成扁平数组，浏览器端逐棵树遍历即可完成推理。"""
    dump = booster.dump_model(num_iteration=num_iteration)
    trees = [_flatten_tree(info["tree_structure"]) for info in dump["tree_info"]]
    return {
        "format": "lgbm-flat-v1",
        "feature_names": feature_names,
        "num_trees": len(trees),
        "trees": trees,
    }


def _flatten_tree(root: dict) -> list[list[float]]:
    """先序 DFS 展开：node = [is_leaf, feature, threshold, left, right, leaf_value]。

    非叶子节点 left/right 指向展开数组中的下标；叶子节点用 is_leaf=1。
    """
    nodes: list[list[float]] = []

    def visit(node: dict) -> int:
        idx = len(nodes)
        nodes.append(None)  # 占位
        if "leaf_value" in node and "split_feature" not in node:
            nodes[idx] = [1, 0, 0.0, 0, 0, float(node["leaf_value"])]
            return idx
        left_idx = visit(node["left_child"])
        right_idx = visit(node["right_child"])
        nodes[idx] = [0, int(node["split_feature"]), float(node["threshold"]), left_idx, right_idx, 0.0]
        return idx

    visit(root)
    return nodes


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=DATA)
    ap.add_argument("--quick", action="store_true", help="用缩小的网格做冒烟训练")
    ap.add_argument("--cv", type=int, default=5)
    ap.add_argument("--jobs", type=int, default=-1)
    args = ap.parse_args()

    t0 = time.time()
    df = load_dataset(args.data)
    print(f"数据清洗后样本 {len(df)} 条（男 {int((df.sex == 1).sum())} / 女 {int((df.sex == 0).sum())}）")

    X, y = df[FEATURES], df[TARGET].to_numpy()
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.15, random_state=SEED)
    X_fit, X_val, y_fit, y_val = train_test_split(X_tr, y_tr, test_size=0.15 / 0.85, random_state=SEED)

    grid = PARAM_GRID
    if args.quick:
        grid = {
            "model__n_estimators": [200, 400],
            "model__num_leaves": [7, 15],
            "model__learning_rate": [0.03, 0.1],
            "model__subsample": [0.85],
            "model__colsample_bytree": [0.85],
            "model__reg_lambda": [1.0],
        }

    base = LGBMRegressor(random_state=SEED, n_jobs=1, verbosity=-1)
    search = GridSearchCV(
        tree_pipeline(base),
        param_grid=grid,
        scoring="neg_root_mean_squared_error",
        cv=KFold(n_splits=args.cv, shuffle=True, random_state=SEED),
        n_jobs=args.jobs,
        refit=False,
        verbose=0,
    )
    combos = int(np.prod([len(v) for v in grid.values()]))
    print(f"网格搜索：{combos} 组参数 × {args.cv} 折 = {combos * args.cv} 次拟合 …")
    search.fit(X_tr, y_tr)
    best = {k.replace("model__", ""): v for k, v in search.best_params_.items()}
    cv_rmse = -search.best_score_
    print(f"最佳参数：{best}")
    print(f"交叉验证 RMSE：{cv_rmse:.4f}")

    # 用留出验证集早停重训，剪掉多余轮次（同时也控制前端模型体积）
    final = tree_pipeline(
        LGBMRegressor(**best, random_state=SEED, n_jobs=-1, verbosity=-1)
    )
    model = final.named_steps["model"]
    model.set_params(n_estimators=best["n_estimators"])
    final.fit(
        X_fit, y_fit,
        model__callbacks=[
            lightgbm.early_stopping(60, verbose=False),
            lightgbm.log_evaluation(0),
        ],
        model__eval_set=[(X_val, y_val)],
    )
    best_iter = int(model.best_iteration_ or best["n_estimators"])

    pred_te = final.predict(X_te)
    metrics = {
        "cv_rmse": round(float(cv_rmse), 4),
        "test_rmse": round(float(np.sqrt(mean_squared_error(y_te, pred_te))), 4),
        "test_mae": round(float(mean_absolute_error(y_te, pred_te)), 4),
        "test_r2": round(float(r2_score(y_te, pred_te)), 4),
        "n_train": int(len(X_fit)), "n_val": int(len(X_val)), "n_test": int(len(X_te)),
        "best_iteration": best_iter,
        "n_estimators_grid": best["n_estimators"],
    }
    print(f"测试集：RMSE {metrics['test_rmse']}  MAE {metrics['test_mae']}  R2 {metrics['test_r2']}")

    booster = final.named_steps["model"].booster_
    booster.save_model(str(ROOT / "model.txt"))

    # 抽样 + 边界组合，供 Node 侧核对「JS 推理 == Python 推理」
    rng = np.random.default_rng(7)
    rows = df.iloc[rng.choice(len(df), size=120, replace=False)][FEATURES].copy()
    edge = []
    for sex in (0, 1):
        for height, weight, waist, hip, arm in [
            (150, 40, 58, 80, 22), (160, 55, 70, 92, 26), (170, 65, 82, 92, 31),
            (175, 80, 95, 100, 34), (180, 100, 110, 110, 38), (190, 60, 78, 95, 28),
        ]:
            edge.append({"sex": sex, "age": 35, "height": height, "weight": weight,
                         "waist": waist, "hip": hip, "arm": arm})
    rows = pd.concat([rows, pd.DataFrame(edge)], ignore_index=True)
    rows["bmi"] = rows["weight"] / (rows["height"] / 100) ** 2
    rows["pred"] = np.round(final.predict(rows[FEATURES]), 6)
    rows[FEATURES + ["pred"]].to_json(ROOT / "export_check.json", orient="records", force_ascii=False)

    payload = export_booster(booster, FEATURES, num_iteration=best_iter)
    raw_rows = int(sum(1 for _ in open(args.data, encoding="utf-8-sig")) - 1)
    sha = hashlib.sha256(args.data.read_bytes()).hexdigest()
    payload["meta"] = {
        "target": "body_fat",
        "feature_names": FEATURES,
        "feature_cn": FEATURE_CN,
        "sex_encoding": {"male": 1, "female": 0, "frontend_male": 1, "frontend_female": 2},
        "best_params": best,
        "n_estimators_used": int(booster.num_trees()),
        "metrics": metrics,
        "dataset": {
            "name": "NHANES 体格测量与 DXA 体脂（智能体脂管家 processed 数据集）",
            "file": args.data.name,
            "rows_raw": raw_rows, "rows_used": int(len(df)),
            "male": int((df.sex == 1).sum()), "female": int((df.sex == 0).sum()),
            "sha256": sha,
        },
        "lib": {"lightgbm": lightgbm.__version__, "sklearn": sklearn.__version__,
                "pandas": pd.__version__, "numpy": np.__version__, "python": platform.python_version()},
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "elapsed_sec": round(time.time() - t0, 1),
    }

    OUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    OUT_MODEL.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    OUT_REPORT.write_text(json.dumps(payload["meta"], ensure_ascii=False, indent=2), encoding="utf-8")
    size_kb = OUT_MODEL.stat().st_size / 1024
    print(f"模型已导出：{OUT_MODEL}（{size_kb:.0f} KB，{payload['num_trees']} 棵树）")
    print(f"训练报告：{OUT_REPORT}")

    # 与页面同口径的三个样例，便于人工核对
    samples = [
        {"sex": 1, "age": 30, "height": 170, "weight": 65, "waist": 82, "hip": 92, "arm": 31},
        {"sex": 1, "age": 45, "height": 175, "weight": 88, "waist": 98, "hip": 100, "arm": 33},
        {"sex": 0, "age": 28, "height": 162, "weight": 55, "waist": 68, "hip": 92, "arm": 26},
    ]
    for s in samples:
        s = dict(s, bmi=s["weight"] / (s["height"] / 100) ** 2)
        print("  样例", s, "->", round(float(final.predict(pd.DataFrame([s])[FEATURES])[0]), 2), "%")


if __name__ == "__main__":
    main()
