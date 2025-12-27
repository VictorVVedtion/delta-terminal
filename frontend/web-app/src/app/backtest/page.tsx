'use client'

import { FlaskConical, History, LineChart } from 'lucide-react'
import React from 'react'

import { BacktestForm } from '@/components/backtest/BacktestForm'
import { BacktestHistory } from '@/components/backtest/BacktestHistory'
import { BacktestResults } from '@/components/backtest/BacktestResults'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBacktestStore } from '@/store/backtest'
import type { BacktestConfig } from '@/types/backtest'

// =============================================================================
// Backtest Page
// =============================================================================

export default function BacktestPage() {
  const [activeTab, setActiveTab] = React.useState('new')

  // 从 Store 获取真实数据
  const {
    currentResult: result,
    currentStatus,
    history,
    setCurrentBacktest,
    setResult,
    updateStatus,
    setError,
    removeFromHistory,
  } = useBacktestStore()

  const isRunning = currentStatus.isRunning

  // 调用真实的回测 API
  const handleRunBacktest = React.useCallback(async (config: BacktestConfig) => {
    const backtestId = `bt_${Date.now()}`
    setCurrentBacktest(backtestId, config)

    try {
      // 调用真实的回测 API
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error(`回测失败: ${response.statusText}`)
      }

      // 处理 SSE 流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)

            switch (event.type) {
              case 'progress':
                updateStatus({
                  progress: event.progress,
                  stage: event.stage,
                })
                break
              case 'result':
                setResult(event.result)
                setActiveTab('results')
                break
              case 'error':
                setError(event.error)
                break
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '回测执行失败')
    }
  }, [setCurrentBacktest, updateStatus, setResult, setError])

  // 处理历史记录选择
  const handleSelectHistory = React.useCallback((id: string) => {
    const item = history.find((h) => h.id === id)
    if (item) {
      // TODO: 加载历史回测详情
      console.log('Selected backtest:', id)
    }
  }, [history])

  // 处理历史记录删除
  const handleDeleteHistory = React.useCallback((id: string) => {
    removeFromHistory(id)
  }, [removeFromHistory])

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">策略回测</h1>
          <p className="text-muted-foreground mt-1">
            使用历史数据验证和优化你的交易策略
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="new" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              新建回测
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2" disabled={!result}>
              <LineChart className="h-4 w-4" />
              回测结果
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              历史记录 {history.length > 0 && `(${history.length})`}
            </TabsTrigger>
          </TabsList>

          {/* New Backtest */}
          <TabsContent value="new" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Config Form */}
              <div className="lg:col-span-2">
                <BacktestForm
                  onSubmit={handleRunBacktest}
                  isRunning={isRunning}
                />
              </div>

              {/* Quick Tips */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">回测提示</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      • 选择足够长的时间周期以获得可靠的结果
                    </p>
                    <p>
                      • 考虑不同市场条件（牛市、熊市、震荡市）
                    </p>
                    <p>
                      • 注意滑点和手续费对收益的影响
                    </p>
                    <p>
                      • 避免过度拟合历史数据
                    </p>
                    <p>
                      • 使用样本外数据验证策略
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Results */}
          <TabsContent value="results" className="mt-6">
            {result ? (
              <BacktestResults result={result} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  运行回测后将在此显示结果
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-6">
            {history.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  暂无回测历史记录
                </CardContent>
              </Card>
            ) : (
              <BacktestHistory
                items={history}
                onSelect={handleSelectHistory}
                onDelete={handleDeleteHistory}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
