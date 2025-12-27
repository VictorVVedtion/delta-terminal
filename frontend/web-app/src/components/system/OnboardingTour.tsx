'use client'

/**
 * OnboardingTour Component
 *
 * EPIC-010 Story 10.1: 交互式新手引导流程
 * 为首次使用的用户提供核心功能引导
 */

import { Check, ChevronLeft, ChevronRight, LayoutList, MessageSquare, Rocket, Sparkles, X } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ONBOARDING_STEPS,
  shouldShowOnboarding,
  useOnboardingStore,
} from '@/store/onboarding'

// =============================================================================
// OnboardingTour Component
// =============================================================================

export function OnboardingTour() {
  const {
    completed,
    skipped,
    currentStep,
    lastShownAt,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboardingStore()

  // Check if should show onboarding
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    // Delay check to allow layout to settle
    const timer = setTimeout(() => {
      const shouldShow = shouldShowOnboarding({ completed, skipped, currentStep, lastShownAt })
      if (shouldShow) {
        startOnboarding()
        setIsVisible(true)
      }
    }, 500)

    return () => { clearTimeout(timer); }
  }, [completed, skipped, currentStep, lastShownAt, startOnboarding])

  // Handle completion
  React.useEffect(() => {
    if (completed || skipped) {
      setIsVisible(false)
    }
  }, [completed, skipped])

  // Get current step config
  const step = ONBOARDING_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  // Handle next/complete
  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding()
    } else {
      nextStep()
    }
  }

  if (!isVisible || !step) return null

  // Determine if this is a spotlight step (has target) or modal step
  const isSpotlightStep = !!step.target
  const isQuestionnaireStep = step.id === 'questionnaire'

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay with spotlight cutout */}
      {isSpotlightStep ? (
        <SpotlightOverlay target={step.target!} />
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto" />
      )}

      {/* Content */}
      {isQuestionnaireStep ? (
        <QuestionnaireModal
          step={step}
          currentStep={currentStep}
          totalSteps={ONBOARDING_STEPS.length}
          onNext={handleNext}
          onPrev={prevStep}
          onSkip={skipOnboarding}
        />
      ) : isSpotlightStep ? (
        <SpotlightTooltip
          step={step}
          currentStep={currentStep}
          totalSteps={ONBOARDING_STEPS.length}
          isLastStep={isLastStep}
          isFirstStep={isFirstStep}
          onNext={handleNext}
          onPrev={prevStep}
          onSkip={skipOnboarding}
        />
      ) : (
        <ModalStep
          step={step}
          currentStep={currentStep}
          totalSteps={ONBOARDING_STEPS.length}
          isLastStep={isLastStep}
          isFirstStep={isFirstStep}
          onNext={handleNext}
          onPrev={prevStep}
          onSkip={skipOnboarding}
        />
      )}
    </div>
  )
}

// =============================================================================
// SpotlightOverlay Component
// =============================================================================

interface SpotlightOverlayProps {
  target: string
}

function SpotlightOverlay({ target }: SpotlightOverlayProps) {
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    const element = document.querySelector(target)
    if (element) {
      const updateRect = () => {
        setRect(element.getBoundingClientRect())
      }
      updateRect()

      // Update on resize
      window.addEventListener('resize', updateRect)
      return () => { window.removeEventListener('resize', updateRect); }
    }
  }, [target])

  if (!rect) {
    return <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto" />
  }

  const padding = 8

  return (
    <div className="absolute inset-0 pointer-events-auto">
      {/* SVG overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight border */}
      <div
        className="absolute border-2 border-primary rounded-lg ring-4 ring-primary/30 animate-pulse"
        style={{
          left: rect.left - padding,
          top: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
      />
    </div>
  )
}

// =============================================================================
// SpotlightTooltip Component
// =============================================================================

interface SpotlightTooltipProps {
  step: typeof ONBOARDING_STEPS[0]
  currentStep: number
  totalSteps: number
  isLastStep: boolean
  isFirstStep: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

function SpotlightTooltip({
  step,
  currentStep,
  totalSteps,
  isLastStep,
  isFirstStep,
  onNext,
  onPrev,
  onSkip,
}: SpotlightTooltipProps) {
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)

  React.useEffect(() => {
    if (!step.target) return

    const element = document.querySelector(step.target)
    if (element) {
      const rect = element.getBoundingClientRect()
      // Position tooltip below the target element
      setPosition({
        top: rect.bottom + 16,
        left: Math.max(16, rect.left),
      })
    }
  }, [step.target])

  if (!position) return null

  return (
    <div
      className="absolute pointer-events-auto w-80 p-4 bg-background border border-border rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="pr-6">
        <h3 className="font-semibold mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Progress */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button variant="ghost" size="sm" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLastStep ? '开始使用' : '下一步'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// QuestionnaireModal Component
// =============================================================================

interface QuestionnaireModalProps {
  step: typeof ONBOARDING_STEPS[0]
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

function QuestionnaireModal({
  step: _step,
  currentStep: _currentStep,
  totalSteps: _totalSteps,
  onNext,
  onPrev,
  onSkip,
}: QuestionnaireModalProps) {
  const { questionnaire, setQuestionnaireAnswer } = useOnboardingStore()
  const [qStep, setQStep] = React.useState(0) // 0: experience, 1: interests, 2: exchange

  const handleNextQ = () => {
    if (qStep < 2) {
      setQStep(qStep + 1)
    } else {
      onNext()
    }
  }

  const handlePrevQ = () => {
    if (qStep > 0) {
      setQStep(qStep - 1)
    } else {
      onPrev()
    }
  }

  // Render content based on qStep
  const renderContent = () => {
    switch (qStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">您的交易经验如何？</h3>
            <div className="space-y-3">
              {[
                { id: 'new', label: '完全新手', desc: '刚接触加密货币' },
                { id: 'experienced', label: '有一些经验', desc: '买卖过几次，了解基本概念' },
                { id: 'pro', label: '经验丰富', desc: '经常交易，熟悉各种策略' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setQuestionnaireAnswer('experience', opt.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-all hover:border-primary/50',
                    questionnaire.experience === opt.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">你最感兴趣的交易方式？(多选)</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                '定投', '网格交易', '波段交易', '套利', '趋势跟踪', '风险管理'
              ].map((opt) => {
                const selected = questionnaire.interests.includes(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      const newInterests = selected
                        ? questionnaire.interests.filter(i => i !== opt)
                        : [...questionnaire.interests, opt]
                      setQuestionnaireAnswer('interests', newInterests)
                    }}
                    className={cn(
                      'p-3 rounded-lg border-2 text-sm font-medium transition-all',
                      selected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'
                    )}
                  >
                    {selected && <Check className="inline-block w-3 h-3 mr-1" />}
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-center">您想使用哪个交易所？</h3>
            <div className="space-y-3">
              {[
                { id: 'binance', label: 'Binance (币安)' },
                { id: 'okx', label: 'OKX (欧易)' },
                { id: 'coinbase', label: 'Coinbase' },
                { id: 'other', label: '其他 / 暂不确定' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setQuestionnaireAnswer('exchange', opt.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border-2 transition-all hover:border-primary/50 flex items-center justify-between',
                    questionnaire.exchange === opt.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                  {questionnaire.exchange === opt.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
      <div className="w-full max-w-md p-8 bg-background border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        <div className="mb-6 text-center">
          <div className="text-xs font-medium text-primary mb-2">步骤 {qStep + 1}/3</div>
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <Button variant="ghost" onClick={handlePrevQ}>
            上一步
          </Button>
          
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={cn("w-2 h-2 rounded-full", i === qStep ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          <Button onClick={handleNextQ}>
            {qStep === 2 ? '完成设置' : '下一步'}
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full text-center mt-4 text-xs text-muted-foreground hover:text-foreground"
        >
          跳过问卷
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// ModalStep Component (for welcome and completion screens)
// =============================================================================

interface ModalStepProps {
  step: typeof ONBOARDING_STEPS[0]
  currentStep: number
  totalSteps: number
  isLastStep: boolean
  isFirstStep: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

function ModalStep({
  step,
  currentStep,
  totalSteps,
  isLastStep,
  isFirstStep,
  onNext,
  onPrev,
  onSkip,
}: ModalStepProps) {
  const getStepIcon = () => {
    switch (step.id) {
      case 'welcome':
        return <Sparkles className="h-12 w-12 text-primary" />
      case 'chat':
        return <MessageSquare className="h-12 w-12 text-primary" />
      case 'strategies':
        return <LayoutList className="h-12 w-12 text-primary" />
      case 'complete':
        return <Rocket className="h-12 w-12 text-primary" />
      default:
        return <Sparkles className="h-12 w-12 text-primary" />
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
      <div className="w-full max-w-md p-8 bg-background border border-border rounded-2xl shadow-2xl text-center animate-in zoom-in-95 fade-in duration-300">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            {getStepIcon()}
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
        <p className="text-muted-foreground mb-8">{step.description}</p>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                i === currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          {isFirstStep ? (
            <>
              <Button variant="ghost" onClick={onSkip}>
                跳过
              </Button>
              <Button size="lg" onClick={onNext} className="min-w-[120px]">
                开始引导
              </Button>
            </>
          ) : (
            <>
              {!isFirstStep && (
                <Button variant="ghost" onClick={onPrev}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一步
                </Button>
              )}
              <Button size="lg" onClick={onNext} className="min-w-[120px]">
                {isLastStep ? (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    开始使用
                  </>
                ) : (
                  <>
                    下一步
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Skip link for non-first steps */}
        {!isFirstStep && !isLastStep && (
          <button
            onClick={onSkip}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            跳过引导
          </button>
        )}
      </div>
    </div>
  )
}

export default OnboardingTour
