'use client'

import { AnimatePresence,motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileCheck,
  Loader2,
  Shield,
} from 'lucide-react'
import React, { useEffect,useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useSafetyStore } from '@/store/safety'
import type {
  ApprovalStep,
  RiskDisclosure} from '@/types/safety';
import {
  generateApprovalToken,
  RISK_DISCLOSURES
} from '@/types/safety'

interface ApprovalFlowProps {
  isOpen: boolean
  onClose: () => void
  onApprove: (token: string) => void
  strategyName: string
  capital: number
  riskLevel: 'low' | 'medium' | 'high'
  estimatedLoss?: number
  estimatedGain?: number
}

/**
 * Approval Flow Component
 * V3 Design Document: S31 - Multi-step Approval Process
 *
 * Provides multi-step confirmation for Live deployment:
 * 1. Risk Review - Acknowledge all risks
 * 2. Capital Confirmation - Confirm capital allocation
 * 3. Final Confirmation - Final deployment confirmation
 */
export function ApprovalFlow({
  isOpen,
  onClose,
  onApprove,
  strategyName,
  capital,
  riskLevel,
  estimatedLoss,
  estimatedGain,
}: ApprovalFlowProps) {
  const [currentStep, setCurrentStep] = useState<ApprovalStep>('risk_review')
  const [acknowledgedRisks, setAcknowledgedRisks] = useState<Set<string>>(new Set())
  const [capitalConfirmed, setCapitalConfirmed] = useState(false)
  const [finalConfirmed, setFinalConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coolingCountdown, setCoolingCountdown] = useState<number | null>(null)

  const config = useSafetyStore((state) => state.config.approval)
  const addApprovalRecord = useSafetyStore((state) => state.addApprovalRecord)

  const steps: ApprovalStep[] = ['risk_review', 'capital_confirm', 'final_confirm']
  const currentStepIndex = steps.indexOf(currentStep)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('risk_review')
      setAcknowledgedRisks(new Set())
      setCapitalConfirmed(false)
      setFinalConfirmed(false)
      setIsSubmitting(false)
      setCoolingCountdown(null)
    }
  }, [isOpen])

  // Handle cooling period countdown
  useEffect(() => {
    if (coolingCountdown === null || coolingCountdown <= 0) return

    const timer = setInterval(() => {
      setCoolingCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => { clearInterval(timer); }
  }, [coolingCountdown])

  const toggleRiskAcknowledgment = (riskId: string) => {
    setAcknowledgedRisks((prev) => {
      const next = new Set(prev)
      if (next.has(riskId)) {
        next.delete(riskId)
      } else {
        next.add(riskId)
      }
      return next
    })
  }

  const allRisksAcknowledged = RISK_DISCLOSURES.every((risk) =>
    acknowledgedRisks.has(risk.id)
  )

  const canProceed = () => {
    switch (currentStep) {
      case 'risk_review':
        return allRisksAcknowledged
      case 'capital_confirm':
        return capitalConfirmed
      case 'final_confirm':
        return finalConfirmed && (coolingCountdown === null || coolingCountdown <= 0)
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1]
      if (nextStep) {
        setCurrentStep(nextStep)

        // Start cooling period on final step if enabled
        if (nextStep === 'final_confirm' && config.coolingPeriodEnabled) {
          setCoolingCountdown(config.coolingPeriodMinutes * 60)
        }
      }
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = steps[currentStepIndex - 1]
      if (prevStep) {
        setCurrentStep(prevStep)
      }
    }
  }

  const handleApprove = async () => {
    setIsSubmitting(true)

    try {
      // Generate approval token
      const token = generateApprovalToken()

      // Record approval in history
      addApprovalRecord({
        strategyId: 'pending',
        strategyName,
        approvedAt: Date.now(),
        capital,
        mode: 'live',
        riskLevel,
      })

      // Call parent callback with token
      onApprove(token)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-lg rounded-xl',
              'bg-background border border-amber-500/30',
              'shadow-2xl max-h-[85vh] overflow-hidden flex flex-col'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  Live 部署审批
                </h2>
                <p className="text-sm text-muted-foreground">
                  策略: {strategyName}
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                          index < currentStepIndex && 'bg-green-500 text-white',
                          index === currentStepIndex && 'bg-amber-500 text-white',
                          index > currentStepIndex && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {index < currentStepIndex ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-xs hidden sm:inline',
                          index === currentStepIndex
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        )}
                      >
                        {step === 'risk_review' && '风险审查'}
                        {step === 'capital_confirm' && '资金确认'}
                        {step === 'final_confirm' && '最终确认'}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-0.5 mx-2',
                          index < currentStepIndex ? 'bg-green-500' : 'bg-muted'
                        )}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {/* Step 1: Risk Review */}
                {currentStep === 'risk_review' && (
                  <motion.div
                    key="risk_review"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-500">
                          重要风险提示
                        </p>
                        <p className="text-xs text-amber-500/80 mt-1">
                          请仔细阅读并确认以下每条风险提示
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {RISK_DISCLOSURES.map((risk) => (
                        <RiskDisclosureItem
                          key={risk.id}
                          risk={risk}
                          acknowledged={acknowledgedRisks.has(risk.id)}
                          onToggle={() => { toggleRiskAcknowledgment(risk.id); }}
                        />
                      ))}
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground text-center">
                        已确认 {acknowledgedRisks.size} / {RISK_DISCLOSURES.length} 条风险提示
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Capital Confirmation */}
                {currentStep === 'capital_confirm' && (
                  <motion.div
                    key="capital_confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <DollarSign className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-500">
                          资金配置确认
                        </p>
                        <p className="text-xs text-blue-500/80 mt-1">
                          请确认以下资金将用于真实交易
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">交易资金</span>
                        <span className="text-lg font-bold">
                          ${capital.toLocaleString()}
                        </span>
                      </div>

                      <div className="h-px bg-border" />

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">风险等级</span>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            riskLevel === 'low' && 'text-green-500',
                            riskLevel === 'medium' && 'text-amber-500',
                            riskLevel === 'high' && 'text-red-500'
                          )}
                        >
                          {riskLevel === 'low' && '低风险'}
                          {riskLevel === 'medium' && '中等风险'}
                          {riskLevel === 'high' && '高风险'}
                        </span>
                      </div>

                      {estimatedLoss !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            预估最大损失
                          </span>
                          <span className="text-sm font-medium text-red-500">
                            -${estimatedLoss.toLocaleString()} ({((estimatedLoss / capital) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      )}

                      {estimatedGain !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            预估最大收益
                          </span>
                          <span className="text-sm font-medium text-green-500">
                            +${estimatedGain.toLocaleString()} ({((estimatedGain / capital) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                      <Checkbox
                        checked={capitalConfirmed}
                        onCheckedChange={(checked) => { setCapitalConfirmed(!!checked); }}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          我确认使用 ${capital.toLocaleString()} 进行真实交易
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          我理解这些资金可能因市场波动而产生损失
                        </p>
                      </div>
                    </label>
                  </motion.div>
                )}

                {/* Step 3: Final Confirmation */}
                {currentStep === 'final_confirm' && (
                  <motion.div
                    key="final_confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <FileCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-500">
                          最终确认
                        </p>
                        <p className="text-xs text-green-500/80 mt-1">
                          确认后策略将立即开始真实交易
                        </p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                      <h3 className="text-sm font-medium text-foreground mb-3">
                        部署摘要
                      </h3>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">策略名称</span>
                        <span className="font-medium">{strategyName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">交易资金</span>
                        <span className="font-medium">${capital.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">交易模式</span>
                        <span className="font-medium text-amber-500">Live (真实交易)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">风险已确认</span>
                        <span className="font-medium text-green-500">✓</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">资金已确认</span>
                        <span className="font-medium text-green-500">✓</span>
                      </div>
                    </div>

                    {/* Cooling period */}
                    {coolingCountdown !== null && coolingCountdown > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            冷却期剩余时间
                          </p>
                        </div>
                        <span className="text-lg font-mono font-bold">
                          {formatCountdown(coolingCountdown)}
                        </span>
                      </div>
                    )}

                    <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                      <Checkbox
                        checked={finalConfirmed}
                        onCheckedChange={(checked) => { setFinalConfirmed(!!checked); }}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          我已理解所有风险，确认启动 Live 交易
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          策略将立即开始使用真实资金进行交易
                        </p>
                      </div>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex gap-2">
              {currentStepIndex > 0 ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一步
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
              )}

              {currentStep !== 'final_confirm' ? (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  下一步
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="default"
                  className={cn(
                    'flex-1',
                    'bg-amber-500 hover:bg-amber-600 text-white'
                  )}
                  onClick={handleApprove}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      确认部署
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Risk Disclosure Item Component
// ============================================================================

interface RiskDisclosureItemProps {
  risk: RiskDisclosure
  acknowledged: boolean
  onToggle: () => void
}

function RiskDisclosureItem({ risk, acknowledged, onToggle }: RiskDisclosureItemProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        acknowledged
          ? 'bg-green-500/5 border-green-500/30'
          : 'bg-background border-border hover:bg-muted/30'
      )}
    >
      <Checkbox
        checked={acknowledged}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              acknowledged ? 'text-green-600' : 'text-foreground'
            )}
          >
            {risk.title}
          </span>
          {risk.severity === 'danger' && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-500/10 text-red-500">
              重要
            </span>
          )}
          {risk.severity === 'warning' && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-500">
              注意
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
      </div>
      {acknowledged && (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      )}
    </label>
  )
}

export default ApprovalFlow
