# 环境配置说明

本文件是 [README](./README.md) 的配套文档，覆盖**运行环境、环境变量、依赖清单、验证方法与故障排查**。

> 一句话结论：**看网页只需要一个支持 WebGL 的现代浏览器**；本地起服务用 Node 或 Python 任一；只有重新训练模型才需要 Python 数据栈。

---

## 1. 操作系统

| 系统 | 状态 | 备注 |
|---|---|---|
| Windows 10 / 11 | ✅ 已验证（Windows 11 + Git Bash / PowerShell） | 主开发环境 |
| macOS | ✅ 理论可运行 | 依赖与路径均为相对路径，无需改动 |
| Linux | ✅ 理论可运行 | 同上 |

本项目无任何平台相关的绝对路径依赖，所有资源均以相对路径加载。

---

## 2. 浏览器要求

| 能力 | 要求 | 验证方法 |
|---|---|---|
| WebGL | 必须 | <https://get.webgl.org/> 能看到旋转立方体 |
| WebAssembly | 必须 | DevTools Console 执行 `typeof WebAssembly` → `"object"` |
| ES Module | 必须（`<script type="module">`） | 任何 2018 年后的 Chrome / Edge |
| Fetch API | 必须 | 加载 `vendor/lgbm_bodyfat.json` 用 |

推荐 Chrome / Edge 最新版。Safari 16+ 与 Firefox 亦可运行，但未做重点测试。

---

## 3. 运行时版本

| 运行时 | 最低版本 | 本仓库实测 | 用途 |
|---|---|---|---|
| Node.js | ≥ 18 | **22.22.2** | 本地静态服务器（`server.mjs`） |
| npm | ≥ 9 | 10.9.7 | 执行 `npm start` 等脚本（可选） |
| Python | ≥ 3.8 | **3.12.5** | 仅重新训练模型时需要 |

验证：

```bash
node -v
npm -v
python --version
```

---

## 4. 环境变量

### 4.1 模板

仓库根目录提供 [`.env.example`](./.env.example)：

```bash
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

`.env` 已写入 `.gitignore`，不会被提交。

### 4.2 变量清单

| 变量 | 类型 | 默认值 | 读取方 | 说明 |
|---|---|---|---|---|
| `PORT` | int | `8080` | `server.mjs` | 本地服务主端口。脚本会额外尝试 `PORT+1`（默认 8081）；端口被占用时自动跳过并提示 |
| `OXIHUMAN_DATA` | path | `ml/data/bodyfat_nhanes.csv` | `ml/train_lgbm.py` | 训练数据 CSV 路径。相对路径按**执行命令时的工作目录**解析；命令行 `--data` 优先级更高 |
| `OXIHUMAN_MODEL_OUT` | path | `vendor/lgbm_bodyfat.json` | `ml/train_lgbm.py` | 导出模型 JSON 的落盘位置。页面正是从 `vendor/lgbm_bodyfat.json` 加载，一般不需要改 |

### 4.3 加载方式

Node.js ≥ 20.6 原生支持 `--env-file`，**不需要安装 dotenv**：

```bash
npm run serve:env                       # = node --env-file=.env server.mjs
```

旧版 Node 用内联变量：

```bash
# macOS / Linux
PORT=8090 node server.mjs

# Windows PowerShell
$env:PORT=8090; node server.mjs
```

Python 侧读取的是进程环境变量，先导出再执行：

```bash
# macOS / Linux
export OXIHUMAN_DATA=ml/data/bodyfat_nhanes.csv
python ml/train_lgbm.py

# Windows PowerShell
$env:OXIHUMAN_DATA="ml/data/bodyfat_nhanes.csv"
python ml/train_lgbm.py
```

### 4.4 前端不需要环境变量

`oxihuman_index.html` 是纯静态页面，**不读取任何构建期或运行期注入的变量**：

- 依赖与资产全部用相对路径（`./vendor/...`）；
- 体脂模型的加载地址固定为 `./vendor/lgbm_bodyfat.json`；
- 旧的本地推理接口 `http://127.0.0.1:8001/api/bodyfat/predict` 仅作为**第二级回退**硬编码保留，正常流程不会请求它。

因此换域名、换端口、放到任意子目录部署都无需改配置。

---

## 5. 依赖清单

### 5.1 前端依赖（已本地化在 `vendor/`，无需安装）

| 文件 | 大小 | 版本 | 用途 | 许可 |
|---|---|---|---|---|
| `vendor/three.module.js` | 1.27 MB | Three.js r1xx（ES Module） | WebGL 渲染引擎 | MIT |
| `vendor/OrbitControls.js` | 30 KB | 随 Three.js | 相机轨道/缩放控制 | MIT |
| `vendor/echarts.min.js` | 1.03 MB | ECharts 5.x | 部位占比条形图 | Apache-2.0 |
| `vendor/lgbm_bodyfat.json` | 82 KB | 本项目训练产物 | LightGBM 体脂模型（187 棵） | 见 README License |

升级方式：直接替换 `vendor/` 下对应文件，保持文件名为准（页面按名引用，无版本号后缀）。

> 为什么不用 CDN：避免离线环境、内网评审、CDN 抖动导致 3D 模型加载失败。**代价**是仓库体积增大，首次访问需下载约 1.3 MB 的 JS。

### 5.2 Node 端依赖（零第三方包）

`server.mjs` 仅使用 Node 内置模块：

```
node:http   node:fs   node:net   node:path   node:url
```

因此 **`npm install` 不是启动前提**，直接 `node server.mjs` 即可。

`package.json` 中声明的 `@cooljapan/oxihuman@^0.2.0` 是上游三维引擎包，**运行本页面不依赖它**（页面用的是仓库内置的 `ohpk.js` / `morph.js` / WASM）。仅在需要对照上游实现时才安装。

```json
"scripts": {
  "start":      "node server.mjs",
  "serve":      "node server.mjs",
  "serve:env":  "node --env-file=.env server.mjs",
  "train":      "python ml/train_lgbm.py",
  "verify:model": "node ml/verify_export.mjs"
}
```

### 5.3 Python 端依赖（仅重新训练模型时需要）

见 [`requirements.txt`](./requirements.txt)，版本为本仓库实测通过的组合：

| 包 | 版本 | 用途 |
|---|---|---|
| `lightgbm` | 4.7.0 | 训练、早停、`dump_model` 导出树结构 |
| `scikit-learn` | 1.8.0 | `Pipeline`、`SimpleImputer`、`GridSearchCV`、指标 |
| `pandas` | 3.0.2 | CSV 读取、清洗、导出校验集 |
| `numpy` | 2.4.4 | 数值运算、抽样 |

```bash
pip install -r requirements.txt
```

### 5.4 模型与资产文件（仓库已包含）

| 文件 | 大小 | 是否被页面加载 | 说明 |
|---|---|---|---|
| `oxihuman-core-v1.ohpk` | 2.0 MB | ✅ | 核心几何数据包 |
| `tree.json` | 1.7 MB | ✅ | 骨骼树 |
| `oxihuman_wasm_bg.wasm` | 424 KB | ✅ | WASM 运行时（已预编译，无需 Rust） |
| `oxihuman_wasm.js` / `oxihuman_wasm_bg.js` | ~30 KB | ✅ | WASM 胶水代码 |
| `_body.bin` | 3.2 MB | ❌ | 旧版几何数据，历史遗留；仓库保留但不参与渲染 |

### 5.5 Rust（可选，仅重新编译 WASM 时需要）

`src/rust/` 下为引擎核心源码，**普通运行完全不需要 Rust 环境**：

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli
```

---

## 6. 启动配置

### 6.1 方案 A：Node（推荐）

```bash
node server.mjs              # 自动尝试 8080 / 8081
PORT=8090 node server.mjs    # 指定端口
npm run serve:env            # 从 .env 读取 PORT
```

访问 `http://127.0.0.1:<PORT>/oxihuman_index.html`

特性：正确的 `.wasm` MIME（`application/wasm`）、`cache-control: no-cache`、CORS 全放开、根路径自动指向主页面。

### 6.2 方案 B：Python

```bash
python -m http.server 8000
```

访问 `http://localhost:8000/oxihuman_index.html`

> ⚠️ Python 内置服务器对 `.wasm` 的 MIME 类型不一定是 `application/wasm`，部分浏览器会拒绝实例化 WASM，表现为 3D 卡片一直停在占位状态。遇到这种情况请改用方案 A。

### 6.3 方案 C：GitHub Pages（线上，零安装）

<https://hazelhu2005-blip.github.io/oxihuman-3d-viewer/>

根路径由 `index.html` 跳转到 `oxihuman_index.html`。

### 6.4 禁止的方式

```bash
# ❌ 不要直接双击 HTML
file:///D:/Oxihuman/oxihuman_index.html
```

`file://` 下 `fetch()` 模型 JSON、WASM 实例化都会被 CORS 策略阻断，页面会降级到线性公式（体脂仍能算，但 3D 模型不出现）。

---

## 7. 部署环境

| 项 | 配置 |
|---|---|
| 平台 | GitHub Pages |
| 分支 / 目录 | `main` / `/ (root)` |
| 入口 | `oxihuman_index.html`（`index.html` 为跳转页） |
| 构建 | 无（纯静态，无 CI 步骤） |
| 缓存 | 页面无强缓存；模型 JSON 用 `cache: no-cache` + ETag 校验 |

发布流程：推送到 `main` → Settings → Pages 确认 `main` + `/ (root)` → 等待 1–5 分钟 → `Ctrl + F5` 刷新。

> 文件名以下划线开头（如 `_body.bin`）会被 Jekyll 忽略而返回 404。该文件页面并未引用，无实际影响；若需要它可访问，在仓库根加一个空的 `.nojekyll` 文件。

---

## 8. 验证环境是否正常

按顺序执行，任一步失败即可定位问题层：

```bash
# 1) 服务能否起来
curl -I http://127.0.0.1:8080/oxihuman_index.html        # 期望 200

# 2) WASM MIME 是否正确（必须 application/wasm）
curl -sI http://127.0.0.1:8080/oxihuman_wasm_bg.wasm | grep -i content-type

# 3) 模型文件是否可下载（期望 83713 字节左右）
curl -sI http://127.0.0.1:8080/vendor/lgbm_bodyfat.json | grep -iE 'content-length|content-type'

# 4) 模型结构是否完整
node -e "const m=require('./vendor/lgbm_bodyfat.json');console.log(m.format,m.num_trees,m.feature_names.join(','))"
# 期望：lgbm-flat-v1 187 sex,age,height,weight,bmi,waist,hip,arm

# 5) JS 与 Python 推理是否一致（需先跑过训练生成 export_check.json）
node ml/verify_export.mjs
# 期望：最大误差 < 1e-5
```

浏览器侧自检（DevTools Console）：

```js
window.__lgbm.state()        // {ready: true, error: null, trees: 187}
typeof WebAssembly           // "object"
document.querySelector('#bodyViewer canvas')   // 提交表单后应存在
```

---

## 9. 常见问题

### 页面空白 / 3D 卡片一直显示「填写数据后生成身材示意」

1. 确认用 `http://` 打开，不是 `file://`；
2. Console 查 404：多半是 `vendor/`、`tree.json`、`.ohpk` 路径或大小写不对；
3. 检查 WASM MIME 是否为 `application/wasm`；不符就换 `node server.mjs`；
4. 首次通过 GitHub Pages 访问时，`three.module.js`（1.27 MB）在 CDN 上可能耗时 20–40 秒，属网络问题，本地瞬间完成。

### 体脂率明显不合理

先看 Console 有没有 `[LightGBM] 模型未加载` 警告：

- **有** → 模型没加载成功，页面退回线性公式，数值口径不同（同一个人可能差 3–6 个百分点）；
- **无** → 属模型正常输出。该模型训练于 NHANES 人群，输出通常比旧线性公式**更接近真实 DXA 测量值**。

### 端口被占用

`server.mjs` 会自动跳过被占用的端口并提示，也可显式换端口：

```bash
PORT=8090 node server.mjs
```

### GitHub Pages 404

- 确认 Pages 分支 `main`、目录 `/ (root)`；
- 主文件是 `oxihuman_index.html`，访问需带文件名，或走 `index.html` 跳转；
- 部署后 1–5 分钟生效，`Ctrl + F5` 强制刷新。

### WebGL 不可用

- 升级浏览器；
- Chrome：设置 → 系统 → 开启「使用硬件加速」；
- 虚拟机 / 远程桌面环境常无 GPU，渲染会失败。

### 训练脚本报 ModuleNotFoundError

```bash
pip install -r requirements.txt
```

注意部分系统 `python` 与 `pip` 指向不同解释器，可用 `python -m pip install -r requirements.txt` 确保一致。
