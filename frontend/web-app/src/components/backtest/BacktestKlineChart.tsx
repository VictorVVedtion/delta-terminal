'use client'

import {
  type CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  type HistogramData,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts'
import React, { useCallback,useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import type { ChartData, ChartSignal } from '@/types/insight'

// =============================================================================
// Types
// =============================================================================

interface BacktestKlineChartProps {
  data: ChartData
  className?: string
  height?: number
  /** Show volume bars */
  showVolume?: boolean
  /** Initial visible range (number of candles from right) */
  visibleRange?: number
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
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatSignalMarkers(signals: ChartSignal[], candleTimes: Set<number>): SeriesMarker<Time>[] {
  return signals
    .filter((signal) => {
      // 确保信号时间戳与 K 线时间戳匹配
      const timeInSeconds = Math.floor(signal.timestamp / 1000)
      return candleTimes.has(timeInSeconds)
    })
    .map((signal) => {
      const isBuy = signal.type === 'buy'
      const isClose = signal.type === 'close'

      return {
        time: Math.floor(signal.timestamp / 1000) as Time, // Convert to seconds (integer)
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? CHART_COLORS.buyColor : isClose ? CHART_COLORS.closeColor : CHART_COLORS.sellColor,
        shape: isBuy ? 'arrowUp' : isClose ? 'circle' : 'arrowDown',
        text: signal.label || (isBuy ? 'B' : isClose ? 'C' : 'S'),
        size: 3, // 最大尺寸确保可见
      } as SeriesMarker<Time>
    })
}

function formatCandlestickData(candles: ChartData['candles']): CandlestickData[] {
  return candles.map((candle) => ({
    time: Math.floor(candle.timestamp / 1000) as Time, // Convert to seconds (integer)
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }))
}

function formatVolumeData(candles: ChartData['candles']): HistogramData[] {
  return candles.map((candle) => ({
    time: Math.floor(candle.timestamp / 1000) as Time, // Convert to seconds (integer)
    value: candle.volume,
    color: candle.close >= candle.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
  }))
}

// =============================================================================
// Component
// =============================================================================

export function BacktestKlineChart({
  data,
  className,
  height = 400,
  showVolume = true,
  visibleRange = 100,
}: BacktestKlineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  // Initialize chart
  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return

    // Create chart
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

    // Add candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      wickUpColor: CHART_COLORS.wickUpColor,
      wickDownColor: CHART_COLORS.wickDownColor,
      borderVisible: false,
    })

    candlestickSeriesRef.current = candlestickSeries

    // Add volume series if enabled (v5 API)
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // Overlay on main pane
      })

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })

      volumeSeriesRef.current = volumeSeries
    }

    return chart
  }, [height, showVolume])

  // Update chart data
  const updateChartData = useCallback(() => {
    if (!candlestickSeriesRef.current || !data.candles.length) return

    // Set candlestick data
    const candlestickData = formatCandlestickData(data.candles)
    candlestickSeriesRef.current.setData(candlestickData)

    // 创建 K 线时间集合用于信号匹配
    const candleTimes = new Set(data.candles.map(c => Math.floor(c.timestamp / 1000)))

    // Set volume data
    if (volumeSeriesRef.current && showVolume) {
      const volumeData = formatVolumeData(data.candles)
      volumeSeriesRef.current.setData(volumeData)
    }

    // Set signal markers using lightweight-charts v5 API
    if (data.signals && data.signals.length > 0 && candlestickSeriesRef.current) {
      const markers = formatSignalMarkers(data.signals, candleTimes)

      // Debug: 输出信号数据
      console.log('[BacktestKlineChart] Raw signals count:', data.signals.length)
      console.log('[BacktestKlineChart] Matched markers count:', markers.length)
      console.log('[BacktestKlineChart] First 3 markers:', markers.slice(0, 3))
      console.log('[BacktestKlineChart] Candle times sample:', Array.from(candleTimes).slice(0, 3))

      // Clean up existing markers plugin
      if (markersRef.current) {
        markersRef.current.setMarkers([])
      }

      // Create new markers plugin with v5 API
      if (markers.length > 0) {
        try {
          markersRef.current = createSeriesMarkers(candlestickSeriesRef.current, markers)
          console.log('[BacktestKlineChart] Markers created successfully:', markers.length)
        } catch (err) {
          console.error('[BacktestKlineChart] Failed to create markers:', err)
        }
      } else {
        console.warn('[BacktestKlineChart] No valid markers after filtering')
      }
    } else {
      console.log('[BacktestKlineChart] No signals to display:', {
        signalsExist: !!data.signals,
        signalsLength: data.signals?.length,
        seriesExists: !!candlestickSeriesRef.current,
      })
    }

    // Fit visible range
    if (chartRef.current && visibleRange > 0 && data.candles.length > visibleRange) {
      const fromCandle = data.candles[data.candles.length - visibleRange]
      const toCandle = data.candles[data.candles.length - 1]
      if (fromCandle && toCandle) {
        chartRef.current.timeScale().setVisibleRange({
          from: Math.floor(fromCandle.timestamp / 1000) as Time,
          to: Math.floor(toCandle.timestamp / 1000) as Time,
        })
      }
    } else if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [data, showVolume, visibleRange])

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
    return () => { window.removeEventListener('resize', handleResize); }
  }, [])

  // Initialize and update chart
  useEffect(() => {
    const chart = initChart()

    if (chart) {
      updateChartData()
    }

    return () => {
      if (markersRef.current) {
        markersRef.current.setMarkers([])
        markersRef.current = null
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        candlestickSeriesRef.current = null
        volumeSeriesRef.current = null
      }
    }
  }, [initChart, updateChartData])

  // 统计信号数量用于显示
  const signalCounts = React.useMemo(() => {
    if (!data.signals) return { buy: 0, sell: 0, close: 0 }
    return {
      buy: data.signals.filter(s => s.type === 'buy').length,
      sell: data.signals.filter(s => s.type === 'sell').length,
      close: data.signals.filter(s => s.type === 'close').length,
    }
  }, [data.signals])

  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-background', className)}>
      {/* Chart Header */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{data.symbol}</span>
        <span className="text-xs text-muted-foreground">{data.timeframe}</span>
      </div>

      {/* Signal Legend with counts */}
      <div className="absolute top-2 right-3 z-10 flex items-center gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Buy ({signalCounts.buy})</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Sell ({signalCounts.sell})</span>
        </div>
        {signalCounts.close > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Close ({signalCounts.close})</span>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} style={{ height }} />
    </div>
  )
}

export default BacktestKlineChart
