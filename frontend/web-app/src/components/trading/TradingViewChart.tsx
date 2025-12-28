/**
 * TradingViewChart - 实时交易 K 线图表
 *
 * 功能:
 * - 实时 K 线展示 (lightweight-charts)
 * - 信号标注 (买入/卖出/平仓)
 * - 成交量柱状图
 * - 多时间周期切换
 * - WebSocket 实时更新
 *
 * @module S20 K线信号标注
 */

'use client'

import {
  type CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  type HistogramData,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { ChartSignal } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TradingViewChartProps {
  /** 交易对符号 */
  symbol: string
  /** K 线数据 */
  candles: Candle[]
  /** 信号标注 */
  signals?: ChartSignal[]
  /** 当前价格 */
  currentPrice?: number
  /** 24h 变化百分比 */
  change24h?: number
  /** 24h 最高价 */
  high24h?: number
  /** 24h 最低价 */
  low24h?: number
  /** 24h 成交量 */
  volume24h?: number
  /** 时间周期 */
  timeframe?: string
  /** 时间周期变化回调 */
  onTimeframeChange?: (timeframe: string) => void
  /** 图表高度 */
  height?: number
  /** 是否显示成交量 */
  showVolume?: boolean
  /** 是否显示价格线 */
  showPriceLine?: boolean
  /** 止损价格 */
  stopLoss?: number
  /** 止盈价格 */
  takeProfit?: number
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const CHART_COLORS = {
  background: '#0a0a0a',
  textColor: '#a1a1aa',
  gridColor: '#27272a',
  upColor: '#22c55e',
  downColor: '#ef4444',
  wickUpColor: '#22c55e',
  wickDownColor: '#ef4444',
  volumeUp: 'rgba(34, 197, 94, 0.3)',
  volumeDown: 'rgba(239, 68, 68, 0.3)',
  // Signal colors
  buyColor: '#22c55e',
  sellColor: '#ef4444',
  closeColor: '#f59e0b',
  // Price lines
  stopLossColor: '#ef4444',
  takeProfitColor: '#22c55e',
  currentPriceColor: '#3b82f6',
}

const TIMEFRAMES = [
  { value: '1m', label: '1分' },
  { value: '5m', label: '5分' },
  { value: '15m', label: '15分' },
  { value: '1h', label: '1时' },
  { value: '4h', label: '4时' },
  { value: '1d', label: '1日' },
]

// =============================================================================
// Helper Functions
// =============================================================================

function formatSignalMarkers(signals: ChartSignal[]): SeriesMarker<Time>[] {
  return signals.map((signal) => {
    const isBuy = signal.type === 'buy'
    const isClose = signal.type === 'close'

    return {
      time: (signal.timestamp / 1000) as Time,
      position: isBuy ? 'belowBar' : 'aboveBar',
      color: isBuy
        ? CHART_COLORS.buyColor
        : isClose
          ? CHART_COLORS.closeColor
          : CHART_COLORS.sellColor,
      shape: isBuy ? 'arrowUp' : isClose ? 'circle' : 'arrowDown',
      text: signal.label || (isBuy ? 'Buy' : isClose ? 'Close' : 'Sell'),
      size: 1,
    } as SeriesMarker<Time>
  })
}

function formatCandlestickData(candles: Candle[]): CandlestickData[] {
  return candles.map((candle) => ({
    time: (candle.timestamp / 1000) as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }))
}

function formatVolumeData(candles: Candle[]): HistogramData[] {
  return candles.map((candle) => ({
    time: (candle.timestamp / 1000) as Time,
    value: candle.volume,
    color: candle.close >= candle.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
  }))
}

// =============================================================================
// Component
// =============================================================================

export function TradingViewChart({
  symbol,
  candles,
  signals = [],
  currentPrice,
  change24h = 0,
  high24h,
  low24h,
  volume24h,
  timeframe = '1h',
  onTimeframeChange,
  height = 400,
  showVolume = true,
  showPriceLine = true,
  stopLoss,
  takeProfit,
  className,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const priceLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)
  const isPositive = change24h >= 0

  // Handle timeframe change
  const handleTimeframeChange = useCallback(
    (value: string) => {
      setSelectedTimeframe(value)
      onTimeframeChange?.(value)
    },
    [onTimeframeChange]
  )

  // Initialize chart
  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.textColor,
      },
      grid: {
        vertLines: { color: CHART_COLORS.gridColor },
        horzLines: { color: CHART_COLORS.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#52525b',
          style: 2,
          labelBackgroundColor: '#27272a',
        },
        horzLine: {
          width: 1,
          color: '#52525b',
          style: 2,
          labelBackgroundColor: '#27272a',
        },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.gridColor,
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: CHART_COLORS.gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    })

    chartRef.current = chart

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      wickUpColor: CHART_COLORS.wickUpColor,
      wickDownColor: CHART_COLORS.wickDownColor,
      borderVisible: false,
    })
    candlestickSeriesRef.current = candlestickSeries

    // Add volume series
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      })
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })
      volumeSeriesRef.current = volumeSeries
    }

    // Add price line series for SL/TP
    if (showPriceLine) {
      const priceLine = chart.addSeries(LineSeries, {
        color: CHART_COLORS.currentPriceColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
      })
      priceLineSeriesRef.current = priceLine
    }

    return chart
  }, [height, showVolume, showPriceLine])

  // Update chart data
  const updateChartData = useCallback(() => {
    if (!candlestickSeriesRef.current || !candles.length) return

    // Set candlestick data
    const candlestickData = formatCandlestickData(candles)
    candlestickSeriesRef.current.setData(candlestickData)

    // Set volume data
    if (volumeSeriesRef.current && showVolume) {
      const volumeData = formatVolumeData(candles)
      volumeSeriesRef.current.setData(volumeData)
    }

    // Set signal markers
    if (signals.length > 0 && candlestickSeriesRef.current) {
      try {
        const markers = formatSignalMarkers(signals)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(candlestickSeriesRef.current as any).setMarkers?.(markers)
      } catch {
        console.debug('Markers not supported in this version')
      }
    }

    // Add price lines for stop loss and take profit
    if (candlestickSeriesRef.current) {
      // Remove existing price lines
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const series = candlestickSeriesRef.current as any

      if (stopLoss) {
        series.createPriceLine?.({
          price: stopLoss,
          color: CHART_COLORS.stopLossColor,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL',
        })
      }

      if (takeProfit) {
        series.createPriceLine?.({
          price: takeProfit,
          color: CHART_COLORS.takeProfitColor,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP',
        })
      }

      if (currentPrice) {
        series.createPriceLine?.({
          price: currentPrice,
          color: CHART_COLORS.currentPriceColor,
          lineWidth: 1,
          lineStyle: 0,
          axisLabelVisible: true,
          title: '',
        })
      }
    }

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [candles, signals, showVolume, stopLoss, takeProfit, currentPrice])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Initialize and update chart
  useEffect(() => {
    const chart = initChart()

    if (chart) {
      updateChartData()
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        candlestickSeriesRef.current = null
        volumeSeriesRef.current = null
        priceLineSeriesRef.current = null
      }
    }
  }, [initChart, updateChartData])

  // Update data when candles change
  useEffect(() => {
    updateChartData()
  }, [candles, signals, updateChartData])

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{symbol}</CardTitle>
            <Badge variant="outline">现货</Badge>
          </div>

          <Tabs value={selectedTimeframe} onValueChange={handleTimeframeChange}>
            <TabsList>
              {TIMEFRAMES.map((tf) => (
                <TabsTrigger key={tf.value} value={tf.value}>
                  {tf.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Price Info */}
        {currentPrice && (
          <div className="flex items-baseline gap-3 mt-4">
            <div className="text-3xl font-bold">${currentPrice.toLocaleString()}</div>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <span
                className={`text-lg font-semibold ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {isPositive ? '+' : ''}
                {change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* 24h Stats */}
        {(high24h || low24h || volume24h) && (
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            {high24h && (
              <div>
                <div className="text-muted-foreground">24h最高</div>
                <div className="font-medium">${high24h.toLocaleString()}</div>
              </div>
            )}
            {low24h && (
              <div>
                <div className="text-muted-foreground">24h最低</div>
                <div className="font-medium">${low24h.toLocaleString()}</div>
              </div>
            )}
            {volume24h && (
              <div>
                <div className="text-muted-foreground">24h成交量</div>
                <div className="font-medium">${(volume24h / 1000000).toFixed(2)}M</div>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Chart Container */}
        <div className="relative rounded-lg overflow-hidden bg-background">
          {/* Signal Legend */}
          <div className="absolute top-2 right-3 z-10 flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Buy</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Sell</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Close</span>
            </div>
            {stopLoss && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-red-500" />
                <span className="text-muted-foreground">SL</span>
              </div>
            )}
            {takeProfit && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-green-500" />
                <span className="text-muted-foreground">TP</span>
              </div>
            )}
          </div>

          {/* Chart */}
          <div ref={chartContainerRef} style={{ height }} />

          {/* Loading state when no data */}
          {candles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-center text-muted-foreground">
                <div className="text-lg font-medium mb-2">加载中...</div>
                <div className="text-sm">正在获取 K 线数据</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TradingViewChart
