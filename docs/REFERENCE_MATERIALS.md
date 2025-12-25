# Delta Terminal 2.0 - 锁定参考材料

> 此文件定义了项目的核心参考文档，所有开发工作必须与这些材料保持一致。

## 📋 锁定的 PRD 文档

**文件路径**: `/Users/victor/Desktop/A2UI/Delta-Terminal-2.0-PRD-v4-Full.docx`

### PRD 核心内容概要

| 章节 | 内容 |
|------|------|
| **第一部分** | 产品定义：愿景、A2UI创新、设计哲学、目标用户 |
| **第二部分** | 本体模型：核心实体、关系图、状态机 |
| **第三部分** | 数据架构：InsightData、InsightParam、约束系统 |
| **第四部分** | 设计规范：颜色、字体、间距、组件库 |
| **第五部分** | 界面架构：布局系统、Canvas、交互模式 |
| **第六部分** | 核心流程：创建→回测→部署→监控→迭代 |
| **第七部分** | 风控体系：约束、预警、熔断、审批 |
| **第八部分** | 用户体验：分层专业用户、小白用户、Trading Spirit |
| **第九部分** | 系统能力：模式选择、状态处理、成长系统 |

### A2UI 核心理念

```
"AI Proposer, Human Approver"
- AI 不只返回文本，而是返回可渲染为交互控件的结构化配置
- 用户从"手动配置"转变为"审批决策"
- 每次对话都能落成可视化、可调参、可验证、可部署的策略资产
```

### InsightData 数据流

```
用户自然语言
    ↓
AI 理解意图 + 生成 InsightData
    ↓
渲染为 InsightCard (Chat中的预览卡片)
    ↓
用户点击 → 展开 Canvas (详细配置面板)
    ↓
用户调参 → 实时回测反馈
    ↓
审批 → 部署为 Agent → 实盘运行
```

---

## 🎨 锁定的原型图

**文件路径**: `/Users/victor/Desktop/A2UI/delta-terminal-v3-complete.html`

### 原型包含内容

- **RiverBit Design System** - 完整 CSS 变量定义
- **71 个活跃场景** (4个已整合)
- **优先级分布**: P0:30 | P1:28 | P2:15 | P3:7
- **完整交互组件**:
  - InsightCard 展示
  - Canvas 模式类型 (Proposal/Backtest/Monitor/Config/Explorer/Detail)
  - 参数控件 (Slider/HeatmapSlider/ButtonGroup/Toggle/Select/LogicBuilder)
  - 状态徽章和颜色系统
  - K线图和图表组件

### 设计系统色彩

| 名称 | 色值 | 用途 |
|------|------|------|
| Cyan (主色) | `#0EECBC` | 主要操作、链接、高亮 |
| Green (成功) | `#61DD3C` | 盈利、成功状态 |
| Yellow (警告) | `#E8BD30` | 警告、待处理 |
| Red (危险) | `#DD3C41` | 亏损、错误 |
| Purple | `#A855F7` | 特殊状态、Spirit |

### 灰度系统 (D-Scale)

| 名称 | 色值 | 用途 |
|------|------|------|
| D950 | `#070E12` | 页面背景 |
| D930 | `#0D1417` | 次级背景 |
| D900 | `#151B1E` | 卡片背景 |
| D800 | `#1F292E` | 边框、分隔线 |
| D100 | `#E2E7E9` | 主要文字 |

---

## 🔒 使用规范

1. **所有 UI 实现**必须参照原型图的设计规范
2. **所有功能开发**必须符合 PRD 中定义的业务逻辑
3. **InsightData 结构**必须严格遵循 PRD 第三部分的定义
4. **约束系统**必须实现 PRD 第三部分和第七部分的规则
5. **状态机**必须遵循 PRD 第二部分的设计

---

## 📁 快速访问

在浏览器中打开原型图:
```bash
open "/Users/victor/Desktop/A2UI/delta-terminal-v3-complete.html"
```

---

**最后更新**: 2025-12-25
**文档版本**: v4.0.0 Full Edition
