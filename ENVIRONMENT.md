# 环境配置说明

## 1. 操作系统

- Windows 10 / 11（已验证）
- macOS / Linux 理论可运行

## 2. 浏览器要求

- Chrome 最新版 或 Edge 最新版
- 必须支持 WebGL 与 WebAssembly
- 验证 WebGL：打开 https://get.webgl.org/ ，看到旋转立方体即正常
- 验证 WASM：DevTools Console 输入 typeof WebAssembly ，返回 object 即正常

## 3. 本地运行环境

### 方案 A：Python（最简单）

要求 Python 3.8+。

python --version
cd D:\Oxihuman
python -m http.server 8000

访问 http://localhost:8000/oxihuman_index.html

### 方案 B：Node.js（仓库自带服务器）

要求 Node.js 18+。

node -v
cd D:\Oxihuman
npm install
node server.mjs

按终端提示访问对应地址，路径追加 /oxihuman_index.html

## 4. 前端依赖

已本地化到 vendor/ ，无需 npm install 前端库。

- vendor/three.module.js：Three.js 核心渲染引擎
- vendor/OrbitControls.js：相机轨道控制
- vendor/echarts.min.js：图表库

若需升级，替换 vendor/ 下对应文件即可。

## 5. 模型与数据文件

- oxihuman-core-v1.ohpk：核心数据包，约 2MB
- tree.json：骨骼树，约 1.7MB
- _body.bin：几何数据，约 3.3MB
- oxihuman_wasm_bg.wasm：WASM 运行时，约 430KB

均使用相对路径加载，不要改成 file:// 绝对路径。

## 6. Rust 源码（可选，仅参考）

src/rust/ 下为引擎核心源码。编译 WASM 需要：

rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli

普通运行页面不需要 Rust 环境，WASM 已预编译在仓库中。

## 7. 常见问题

### 页面空白或模型加载失败

- 确认通过 http://localhost 访问，不要双击 HTML
- DevTools Console 查看 404 或 CORS 报错
- 确认 vendor/、_body.bin、tree.json 路径大小写一致

### GitHub Pages 404

- 确认 Pages 分支 main，目录 / (root)
- 主文件是 oxihuman_index.html，访问需带文件名，或用 index.html 跳转
- 等待 1 到 5 分钟，Ctrl+F5 强制刷新

### WebGL 不可用

- 更新浏览器
- Chrome 设置 → 系统 → 使用硬件加速

## 8. 部署环境

- GitHub Pages：分支 main，目录 / (root)
- 在线地址：https://hazelhu2005-blip.github.io/oxihuman-3d-viewer/oxihuman_index.html