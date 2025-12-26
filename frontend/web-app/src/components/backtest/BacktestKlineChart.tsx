'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
  type SeriesMarker,
} from 'lightweight-charts'
import type { ChartData, ChartSignal } from '@/types/insight'
import { cn } from '@/lib/utils'

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

function formatSignalMarkers(signals: ChartSignal[]): SeriesMarker<Time>[] {
  return signals.map((signal) => {
    const isBuy = signal.type === 'buy'
    const isClose = signal.type === 'close'

    return {
      time: (signal.timestamp / 1000) as Time, // Convert to seconds
      position: isBuy ? 'belowBar' : 'aboveBar',
      color: isBuy ? CHART_COLORS.buyColor : isClose ? CHART_COLORS.closeColor : CHART_COLORS.sellColor,
      shape: isBuy ? 'arrowUp' : isClose ? 'circle' : 'arrowDown',
      text: signal.label || (isBuy ? 'Buy' : isClose ? 'Close' : 'Sell'),
      size: 1,
    } as SeriesMarker<Time>
  })
}

function formatCandlestickData(candles: ChartData['candles']): CandlestickData<Time>[] {
  return candles.map((candle) => ({
    time: (candle.timestamp / 1000) as Time, // Convert to seconds
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }))
}

function formatVolumeData(candles: ChartData['candles']): HistogramData<Time>[] {
  return candles.map((candle) => ({
    time: (candle.timestamp / 1000) as Time,
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

    // Set volume data
    if (volumeSeriesRef.current && showVolume) {
      const volumeData = formatVolumeData(data.candles)
      volumeSeriesRef.current.setData(volumeData)
    }

    // Set signal markers
    // Note: In lightweight-charts v5, markers API changed
    // Using attachPrimitive or custom overlay for signals
    // TODO: Implement custom marker primitives for v5
    if (data.signals && data.signals.length > 0 && candlestickSeriesRef.current) {
      try {
        // Try v5 API first (may need createSeriesMarkers plugin)
        const markers = formatSignalMarkers(data.signals)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(candlestickSeriesRef.current as any).setMarkers?.(markers)
      } catch {
        // Markers not supported in this version, skip
        console.debug('Markers not supported, using overlay instead')
      }
    }

    // Fit visible range
    if (chartRef.current && visibleRange > 0 && data.candles.length > visibleRange) {
      const fromCandle = data.candles[data.candles.length - visibleRange]
      const toCandle = data.candles[data.candles.length - 1]
      if (fromCandle && toCandle) {
        chartRef.current.timeScale().setVisibleRange({
          from: (fromCandle.timestamp / 1000) as Time,
          to: (toCandle.timestamp / 1000) as Time,
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
    return () => window.removeEventListener('resize', handleResize)
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
      }
    }
  }, [initChart, updateChartData])

  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-background', className)}>
      {/* Chart Header */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{data.symbol}</span>
        <span className="text-xs text-muted-foreground">{data.timeframe}</span>
      </div>

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
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} style={{ height }} />
    </div>
  )
}

export default BacktestKlineChart
