# 舞萌 Simai 导出（Beat Data Generator 插件）

把 [Beat Data Generator](https://github.com/BUGJI) 工程里的所有标记点导出为
舞萌（maimai / Simai）谱面文本，并按拍位自动计算最小分拍网格、写入 BPM 变化。

插件 id：`dev.bdg.simai-exporter`

## 安装

把本仓库整个文件夹放进插件扫描目录，重启编辑器：

- 用户目录：`<userData>/plugins/`（编辑器设置页可一键打开）；
- 开发模式：宿主工程根目录的 `plugins/`。

## 使用

- 「导出」菜单 →「舞萌 Simai 谱面」；
- 「插件」菜单 →「导出舞萌 Simai 谱面」。

两者都会弹出保存对话框，默认文件名 `<工程名>.simai.txt`，输出为纯 Simai 谱面文本。

## 导出规则

- **Tap**：每个标记点导出一个单点。默认键位为 **1**。
  标记点若带属性 `pos` / `position` / `button` / `key`，可覆盖键位：
  `1`–`8` 为普通键，`A1`–`A8` 为触摸键。
- **BPM**：起始 BPM（以及每个 BPM 点）取自宿主 `api.project.bpmAtBeat`，
  以 `(bpm)` 内联写出，`abs` / `mult` 两种模式都由宿主解析。
- **网格**：拍位量化到 1/96 拍；每小节（4 拍）求出最小分拍 `{n}`，
  `n` 恒为 384 的因子（如 `{4}` `{8}` `{12}` `{16}` …）。
  空槽用逗号占位，空小节输出 `{1},`（整小节休止）。
- 谱面以 `E` 结尾。

## 示例

标记点位于 0/1/2/3 拍，170 BPM：

```
(170){4}1,1,1,1,
E
```

标记点位于 0/0.5/…/3.5 拍（八分）：

```
(120){8}1,1,1,1,1,1,1,1,
E
```

标记点在 0 与 2 拍，且第 2 拍变速到 200：

```
(170){2}1,(200)1,
E
```

## 当前限制

目前仅支持 **Tap** 与 **BPM 变化**；Hold、Slide、Break、Touch 音符尚未支持。
所有音符默认落在键位 1，需要分散键位时给标记点加 `pos` 属性。

## 开发

```
bdg_plugin_ma2/
├─ manifest.json     # 元信息（必需）
├─ main.js           # 主进程入口（占位，仅注册 info 处理器）
├─ renderer.js       # 导出逻辑与 UI 贡献注册
├─ plugin-api.d.ts   # 宿主 API 类型声明
└─ README.md
```

`renderer.js` 顶部引用 `plugin-api.d.ts` 可获得编辑器类型提示；
转换逻辑集中在 `buildChart()`，导出入口为 `runExport()`。

## 许可与发布

- 插件版权归 BUGJI，采用与宿主一致的 **GNU GPL v3**。
- 宿主编辑器 **Beat Data Generator** 以 **GNU GPL v3** 发布（作者 BUGJI）。
  插件由宿主加载器装载运行，分发时建议注明与宿主的关联。
- 官方插件模板见 <https://github.com/BUGJI/bdg_plugin_template>。
