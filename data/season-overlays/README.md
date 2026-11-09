# 赛季图鉴数据来源 / 许可

`wiki-through-s4.json` 为洛克王国世界 WIKI 数据表结构化事实的转换结果。

- 原始项目：<https://github.com/JayeGT002/rocom-wiki-data>
- 归档提交：`6ab264cb98eec1dd2dde0d7c6dfa200733a98d63`
- 原始来源：<https://wiki.biligame.com/nrc>
- 数据许可：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- 转换内容：仅抽取图鉴 441–466 的 ID、名称、蛋组、进化关系、数值与游戏配置 ID；将 Lua 转为 JSON，单位/字段名调整为本项目所需格式；未复制描述性文字、图像或素材。
- 覆盖范围：编号 441–442 为前序缺口，443–466 为 S4 阶段资料（包括果实立方人）；**不包含 S5**。
- 更新时间：上游归档并非 11 月的最新数据，后续赛季必须使用已经核验的新快照，并保留同等署名和许可信息。

本目录的 WIKI 衍生数据按 CC BY-SA 4.0 使用；本目录中的许可说明不代表程序源码、原游戏图片或其他素材采用相同许可。

S5 导入器 `scripts/import-live-wiki.cjs` 默认只生成 `data-candidates/` 预览文件，必须核对 S5 图鉴新精灵、形态、蛋组、异色可用性后才能发布。未经核对的结果不应合入 `main`。
