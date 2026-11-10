# Windows 文件夹便携版（开发预览）

本地测试基线，不是正式稳定版。S5 未确认字段、游戏规则和真实仓库导入仍需验收。

## 从源码构建

使用 Node.js 22 与 npm，在项目根目录执行：

```sh
npm ci
npm run check:shiny
npm run test:portable
npm run electron:build
```

默认生成 Windows x64 文件夹便携 ZIP，输出位于 `dist-electron/`。
`npm run electron:build:dir` 只生成 `dist-electron/win-unpacked/`，适合本地反复测试。
ZIP 必须全部解压到新建的可写目录，再运行 `洛克王国孵蛋数据管理系统.exe`。不能只移动 EXE。
不要将该目录放在旧版或抓包助手目录内；上游会搜索附近目录并启动助手。不要与旧版同时运行。

## 数据与配置

- 打包版默认业务数据：EXE 同级 `roco_egg_data.json`。
- 偏好、缓存与浏览器存储：EXE 同级 `portable-profile/`。
- 每个解压副本独立，默认不读取旧 AppData 配置。首次启动前请备份旧数据；需要迁移时由用户自行导入。
- 用户已明确选择的自定义数据目录仍受支持；选择前核实不会影响旧版。
- 便携配置目录不可创建/写入时，程序提示并停止，不悄悄回退到旧版共享配置。
- 开发模式仍使用开发环境原有配置，业务数据在项目根目录。不要将真实数据提交到 Git。
- 若开发者显式选择旧单文件 `portable` target，路径使用 `PORTABLE_EXECUTABLE_DIR`，而非临时解压目录；默认分发已改为文件夹 ZIP。

## 依赖与实测

本包不含抓包助手、Python、Npcap 安装程序。手动 JSON 导入不需要安装抓包驱动。
缺依赖时先关闭“未找到安装包”提示，然后选择“继续运行软件”。已安装依赖的步骤会跳过。
先用少量样本检查导入、保存、完全退出和重启、账号隔离，再测试大仓库与排窝。
CI 的 Windows 打包、单测和构建并不等于 Windows GUI、抓包、游戏机制已通过实测。

## Git 数据保护范围

`.gitignore` 已覆盖本地 `roco_egg_data*.json`、`portable-profile/`、`app_config.json`、候选数据、数据库备份、抓包与分卷产物。原始 JSON 抓包请放在 `raw-captures/` 或 `local-data/` 等被忽略目录中；任意文件名的 JSON 不会一概忽略，以免隐藏源代码图鉴。

历史仓库已跟踪 `data/roco_egg_data.json` 和若干日志文件。本次没有删除或修改这些历史文件；新增忽略规则不会自动取消其跟踪。不要用真实仓库数据覆盖已跟踪的样例。每次提交前检查 `git status` 和 `git diff --cached`，不要直接 `git add .`。这不是全仓秘密审计。
