/**
 * Analysis Store - 分析面板状态管理
 * 用于控制各种分析面板的打开/关闭状态
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type {
  AttributionInsightData,
  ComparisonInsightData,
  SensitivityInsightData,
} from '@/types/insight'

interface AnalysisState {
  // 敏感度分析
  sensitivityOpen: boolean
  sensitivityData: SensitivityInsightData | null
  openSensitivityAnalysis: (data: SensitivityInsightData) => void
  closeSensitivityAnalysis: () => void

  // 归因分析
  attributionOpen: boolean
  attributionData: AttributionInsightData | null
  openAttributionAnalysis: (data: AttributionInsightData) => void
  closeAttributionAnalysis: () => void

  // 对比分析
  comparisonOpen: boolean
  comparisonData: ComparisonInsightData | null
  openComparisonAnalysis: (data: ComparisonInsightData) => void
  closeComparisonAnalysis: () => void

  // 版本历史
  versionHistoryOpen: boolean
  versionStrategyId: string
  versionStrategyName: string
  openVersionHistory: (strategyId: string, strategyName: string) => void
  closeVersionHistory: () => void

  // 紧急操作
  emergencyActionsOpen: boolean
  emergencyStrategyId: string
  openEmergencyActions: (strategyId: string) => void
  closeEmergencyActions: () => void

  // 清理所有面板
  closeAllPanels: () => void
}

export const useAnalysisStore = create<AnalysisState>()(
  devtools((set) => ({
    // 初始状态
    sensitivityOpen: false,
    sensitivityData: null,
    attributionOpen: false,
    attributionData: null,
    comparisonOpen: false,
    comparisonData: null,
    versionHistoryOpen: false,
    versionStrategyId: '',
    versionStrategyName: '',
    emergencyActionsOpen: false,
    emergencyStrategyId: '',

    // 敏感度分析
    openSensitivityAnalysis: (data) =>
      { set(
        { sensitivityOpen: true, sensitivityData: data },
        false,
        'analysis/openSensitivity'
      ); },
    closeSensitivityAnalysis: () =>
      { set(
        { sensitivityOpen: false, sensitivityData: null },
        false,
        'analysis/closeSensitivity'
      ); },

    // 归因分析
    openAttributionAnalysis: (data) =>
      { set(
        { attributionOpen: true, attributionData: data },
        false,
        'analysis/openAttribution'
      ); },
    closeAttributionAnalysis: () =>
      { set(
        { attributionOpen: false, attributionData: null },
        false,
        'analysis/closeAttribution'
      ); },

    // 对比分析
    openComparisonAnalysis: (data) =>
      { set(
        { comparisonOpen: true, comparisonData: data },
        false,
        'analysis/openComparison'
      ); },
    closeComparisonAnalysis: () =>
      { set(
        { comparisonOpen: false, comparisonData: null },
        false,
        'analysis/closeComparison'
      ); },

    // 版本历史
    openVersionHistory: (strategyId, strategyName) =>
      { set(
        {
          versionHistoryOpen: true,
          versionStrategyId: strategyId,
          versionStrategyName: strategyName,
        },
        false,
        'analysis/openVersionHistory'
      ); },
    closeVersionHistory: () =>
      { set(
        {
          versionHistoryOpen: false,
          versionStrategyId: '',
          versionStrategyName: '',
        },
        false,
        'analysis/closeVersionHistory'
      ); },

    // 紧急操作
    openEmergencyActions: (strategyId) =>
      { set(
        { emergencyActionsOpen: true, emergencyStrategyId: strategyId },
        false,
        'analysis/openEmergencyActions'
      ); },
    closeEmergencyActions: () =>
      { set(
        { emergencyActionsOpen: false, emergencyStrategyId: '' },
        false,
        'analysis/closeEmergencyActions'
      ); },

    // 清理所有面板
    closeAllPanels: () =>
      { set(
        {
          sensitivityOpen: false,
          sensitivityData: null,
          attributionOpen: false,
          attributionData: null,
          comparisonOpen: false,
          comparisonData: null,
          versionHistoryOpen: false,
          versionStrategyId: '',
          versionStrategyName: '',
          emergencyActionsOpen: false,
          emergencyStrategyId: '',
        },
        false,
        'analysis/closeAll'
      ); },
  }))
)
