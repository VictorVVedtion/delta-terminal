'use client'

/**
 * LogicBuilder 使用示例
 *
 * 展示如何在 A2UI 系统中使用 LogicBuilder 组件
 */

import React, { useState } from 'react'
import { LogicBuilder } from './LogicBuilder'
import type { InsightParam, LogicCondition, LogicConnector } from '@/types/insight'

export function LogicBuilderExample() {
  // 模拟参数定义
  const param: InsightParam = {
    key: 'entry_conditions',
    label: '入场条件',
    type: 'logic_builder',
    value: [],
    level: 1,
    description: '定义多个条件组合成的入场逻辑',
    config: {},
  }

  // 状态管理
  const [conditions, setConditions] = useState<LogicCondition[]>([
    {
      id: 'cond_1',
      indicator: 'rsi',
      operator: '<',
      value: 30,
    },
  ])

  const [connector, setConnector] = useState<LogicConnector>('AND')

  // 处理条件变化
  const handleConditionsChange = (newConditions: LogicCondition[]) => {
    setConditions(newConditions)
    console.log('Conditions updated:', newConditions)
  }

  // 处理连接器变化
  const handleConnectorChange = (newConnector: LogicConnector) => {
    setConnector(newConnector)
    console.log('Connector changed to:', newConnector)
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      {/* 基础示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">基础示例</h2>
        <LogicBuilder
          param={param}
          value={conditions}
          onChange={handleConditionsChange}
          connector={connector}
          onConnectorChange={handleConnectorChange}
        />
      </section>

      {/* 带警告的示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">带警告状态</h2>
        <LogicBuilder
          param={{ ...param, label: '退出条件（警告）' }}
          value={conditions}
          onChange={handleConditionsChange}
          connector={connector}
          onConnectorChange={handleConnectorChange}
          warning="建议添加止损条件以控制风险"
        />
      </section>

      {/* 带错误的示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">带错误状态</h2>
        <LogicBuilder
          param={{ ...param, label: '风险控制（错误）' }}
          value={conditions}
          onChange={handleConditionsChange}
          connector={connector}
          onConnectorChange={handleConnectorChange}
          error="至少需要2个条件才能启用此策略"
        />
      </section>

      {/* 禁用状态 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">禁用状态</h2>
        <LogicBuilder
          param={{ ...param, label: '条件（禁用）' }}
          value={conditions}
          onChange={handleConditionsChange}
          connector={connector}
          onConnectorChange={handleConnectorChange}
          disabled={true}
        />
      </section>

      {/* 调试信息 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">当前状态</h2>
        <div className="p-4 rounded-lg bg-muted">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                connector,
                conditions,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </section>

      {/* 使用说明 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">使用说明</h2>
        <div className="prose prose-sm dark:prose-invert">
          <ul>
            <li>
              <strong>添加条件</strong>：点击"添加条件"按钮创建新条件
            </li>
            <li>
              <strong>编辑条件</strong>：选择指标、运算符、输入阈值
            </li>
            <li>
              <strong>删除条件</strong>：点击条件右侧的 × 按钮（至少保留1个条件）
            </li>
            <li>
              <strong>切换逻辑</strong>：点击顶部的 AND/OR 按钮切换条件连接方式
            </li>
            <li>
              <strong>拖拽排序</strong>：使用左侧的拖拽手柄调整条件顺序（待实现）
            </li>
          </ul>
        </div>
      </section>

      {/* 代码示例 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">代码示例</h2>
        <div className="p-4 rounded-lg bg-muted">
          <pre className="text-xs overflow-auto">
            {`import { LogicBuilder } from '@/components/a2ui/controls'

const [conditions, setConditions] = useState<LogicCondition[]>([
  {
    id: 'cond_1',
    indicator: 'rsi',
    operator: '<',
    value: 30,
  },
])

const [connector, setConnector] = useState<LogicConnector>('AND')

<LogicBuilder
  param={param}
  value={conditions}
  onChange={setConditions}
  connector={connector}
  onConnectorChange={setConnector}
/>`}
          </pre>
        </div>
      </section>
    </div>
  )
}

export default LogicBuilderExample
