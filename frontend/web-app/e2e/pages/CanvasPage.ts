/**
 * CanvasPage - Canvas 组件 Page Object
 *
 * 封装 BacktestCanvas, DeployCanvas, MonitorCanvas 的所有交互操作
 */

import { type Locator, type Page, expect } from '@playwright/test'

export class CanvasPage {
  readonly page: Page

  // 通用 Canvas 元素
  readonly canvas: Locator
  readonly closeButton: Locator
  readonly title: Locator

  // 回测相关
  readonly backtestButton: Locator
  readonly backtestProgress: Locator
  readonly backtestMetrics: Locator
  readonly backtestPassed: Locator
  readonly backtestFailed: Locator

  // 部署相关
  readonly deployButton: Locator
  readonly deployPaperButton: Locator
  readonly deployLiveButton: Locator
  readonly deployCancel: Locator
  readonly deployModeSelector: Locator
  readonly riskSettings: Locator

  // 监控相关
  readonly monitorStatus: Locator
  readonly pauseButton: Locator
  readonly resumeButton: Locator
  readonly stopButton: Locator
  readonly pnlDisplay: Locator
  readonly positionsDisplay: Locator

  // 参数面板
  readonly paramPanel: Locator
  readonly sliders: Locator
  readonly toggles: Locator
  readonly selects: Locator

  constructor(page: Page) {
    this.page = page

    // 通用 Canvas
    this.canvas = page.locator('[data-testid="canvas"], [class*="Canvas"], [aria-label*="Canvas"]')
    this.closeButton = this.canvas.locator('button:has(svg[class*="close"]), button:has(svg)').first()
    this.title = this.canvas.locator('h2, h3, [class*="title"]').first()

    // 回测
    this.backtestButton = page.getByRole('button', { name: /运行回测|开始回测/ })
    this.backtestProgress = page.locator('[class*="progress"], [role="progressbar"]')
    this.backtestMetrics = page.locator('[data-testid="backtest-metrics"], [class*="metrics"]')
    this.backtestPassed = page.locator(':text("回测通过"), :text("通过")')
    this.backtestFailed = page.locator(':text("回测未通过"), :text("未通过")')

    // 部署
    this.deployButton = page.getByRole('button', { name: /部署|Deploy/ })
    this.deployPaperButton = page.getByRole('button', { name: /Paper.*部署|模拟.*部署/ })
    this.deployLiveButton = page.getByRole('button', { name: /Live.*部署|真实.*部署/ })
    this.deployCancel = page.getByRole('button', { name: /取消/ })
    this.deployModeSelector = page.locator('[data-testid="deploy-mode"], [class*="mode-selector"]')
    this.riskSettings = page.locator('[data-testid="risk-settings"], [class*="risk"]')

    // 监控
    this.monitorStatus = page.locator('[data-testid="monitor-status"], [class*="status"]')
    this.pauseButton = page.getByRole('button', { name: /暂停/ })
    this.resumeButton = page.getByRole('button', { name: /恢复|继续/ })
    this.stopButton = page.getByRole('button', { name: /停止/ })
    this.pnlDisplay = page.locator('[data-testid="pnl"], [class*="pnl"]')
    this.positionsDisplay = page.locator('[data-testid="positions"], [class*="position"]')

    // 参数面板
    this.paramPanel = this.canvas.locator('[class*="param"], [class*="panel"]')
    this.sliders = this.paramPanel.locator('input[type="range"], [role="slider"]')
    this.toggles = this.paramPanel.locator('[role="switch"], input[type="checkbox"]')
    this.selects = this.paramPanel.locator('select, [role="combobox"]')
  }

  // ==========================================================================
  // 通用方法
  // ==========================================================================

  /**
   * 等待 Canvas 打开
   */
  async waitForOpen(timeout = 10000) {
    await expect(this.canvas).toBeVisible({ timeout })
  }

  /**
   * 检查 Canvas 是否打开
   */
  async isOpen(): Promise<boolean> {
    try {
      await expect(this.canvas).toBeVisible({ timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 关闭 Canvas
   */
  async close() {
    await this.closeButton.click()
    await expect(this.canvas).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * 按 ESC 关闭 Canvas
   */
  async closeWithEscape() {
    await this.page.keyboard.press('Escape')
    await expect(this.canvas).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * 获取 Canvas 标题
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || ''
  }

  // ==========================================================================
  // 回测方法
  // ==========================================================================

  /**
   * 运行回测
   */
  async runBacktest() {
    await this.backtestButton.click()
  }

  /**
   * 等待回测完成
   */
  async waitForBacktestComplete(timeout = 60000) {
    // 等待进度条出现
    try {
      await expect(this.backtestProgress).toBeVisible({ timeout: 5000 })
    } catch {
      // 进度条可能很快完成
    }

    // 等待进度条消失或指标出现
    await Promise.race([
      expect(this.backtestProgress).not.toBeVisible({ timeout }),
      expect(this.backtestMetrics).toBeVisible({ timeout }),
    ])
  }

  /**
   * 检查回测是否通过
   */
  async isBacktestPassed(): Promise<boolean> {
    try {
      await expect(this.backtestPassed).toBeVisible({ timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取回测指标
   */
  async getBacktestMetrics(): Promise<Record<string, string>> {
    const metrics: Record<string, string> = {}
    const metricElements = await this.backtestMetrics.locator('[data-metric]').all()
    for (const el of metricElements) {
      const key = await el.getAttribute('data-metric')
      const value = await el.textContent()
      if (key && value) {
        metrics[key] = value.trim()
      }
    }
    return metrics
  }

  // ==========================================================================
  // 部署方法
  // ==========================================================================

  /**
   * 选择部署模式
   */
  async selectDeployMode(mode: 'paper' | 'live') {
    if (mode === 'paper') {
      await this.deployPaperButton.click()
    } else {
      await this.deployLiveButton.click()
    }
  }

  /**
   * 点击部署按钮
   */
  async clickDeploy() {
    await this.deployButton.click()
  }

  /**
   * 取消部署
   */
  async cancelDeploy() {
    await this.deployCancel.click()
    await expect(this.canvas).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * 等待部署完成
   */
  async waitForDeployComplete(timeout = 30000) {
    // 等待成功消息或错误消息
    await this.page.waitForSelector(
      ':text("部署成功"), :text("部署失败"), :text("Deploy")',
      { timeout }
    )
  }

  /**
   * 检查部署是否成功
   */
  async isDeploySuccessful(): Promise<boolean> {
    try {
      await expect(this.page.locator(':text("部署成功")')).toBeVisible({ timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * 调整风险设置
   */
  async adjustRiskSetting(settingName: string, value: number) {
    const slider = this.riskSettings.locator(`[data-setting="${settingName}"] input[type="range"]`)
    await slider.fill(String(value))
  }

  // ==========================================================================
  // 监控方法
  // ==========================================================================

  /**
   * 获取监控状态
   */
  async getMonitorStatus(): Promise<string> {
    return (await this.monitorStatus.textContent()) || ''
  }

  /**
   * 暂停代理
   */
  async pauseAgent() {
    await this.pauseButton.click()
    await this.page.waitForTimeout(1000)
  }

  /**
   * 恢复代理
   */
  async resumeAgent() {
    await this.resumeButton.click()
    await this.page.waitForTimeout(1000)
  }

  /**
   * 停止代理
   */
  async stopAgent() {
    await this.stopButton.click()
    await this.page.waitForTimeout(1000)
  }

  /**
   * 获取盈亏显示
   */
  async getPnL(): Promise<string> {
    return (await this.pnlDisplay.textContent()) || ''
  }

  /**
   * 获取持仓数量
   */
  async getPositionCount(): Promise<number> {
    return await this.positionsDisplay.locator('[data-position]').count()
  }

  // ==========================================================================
  // 参数调整方法
  // ==========================================================================

  /**
   * 调整滑块参数
   */
  async adjustSlider(index: number, value: number) {
    const slider = this.sliders.nth(index)
    await slider.fill(String(value))
  }

  /**
   * 切换开关
   */
  async toggleSwitch(index: number) {
    const toggle = this.toggles.nth(index)
    await toggle.click()
  }

  /**
   * 选择下拉选项
   */
  async selectOption(index: number, value: string) {
    const select = this.selects.nth(index)
    await select.selectOption(value)
  }

  /**
   * 获取所有滑块值
   */
  async getSliderValues(): Promise<number[]> {
    const values: number[] = []
    const count = await this.sliders.count()
    for (let i = 0; i < count; i++) {
      const value = await this.sliders.nth(i).inputValue()
      values.push(Number(value))
    }
    return values
  }

  // ==========================================================================
  // 验证方法
  // ==========================================================================

  /**
   * 验证 Canvas 类型
   */
  async expectCanvasType(type: 'backtest' | 'deploy' | 'monitor') {
    const title = await this.getTitle()
    const typeMap = {
      backtest: /回测|Backtest/i,
      deploy: /部署|Deploy/i,
      monitor: /监控|Monitor/i,
    }
    expect(title).toMatch(typeMap[type])
  }

  /**
   * 验证回测指标显示
   */
  async expectBacktestMetricsVisible() {
    await expect(this.backtestMetrics).toBeVisible({ timeout: 5000 })
  }

  /**
   * 验证部署按钮状态
   */
  async expectDeployButtonEnabled() {
    await expect(this.deployButton).toBeEnabled()
  }

  /**
   * 验证部署按钮禁用
   */
  async expectDeployButtonDisabled() {
    await expect(this.deployButton).toBeDisabled()
  }
}
