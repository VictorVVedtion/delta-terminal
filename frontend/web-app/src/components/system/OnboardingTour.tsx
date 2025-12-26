'use client'

/**
 * OnboardingTour Component
 *
 * EPIC-010 Story 10.1: 交互式新手引导流程
 * 为首次使用的用户提供核心功能引导
 */

import React from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles, MessageSquare, LayoutList, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useOnboardingStore,
  ONBOARDING_STEPS,
  shouldShowOnboarding,
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

    return () => clearTimeout(timer)
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

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay with spotlight cutout */}
      {isSpotlightStep ? (
        <SpotlightOverlay target={step.target!} />
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto" />
      )}

      {/* Content */}
      {isSpotlightStep ? (
        <SpotlightTooltip
          step={step}
          currentStep={currentStep}
          totalSteps={ONBOARDING_STEPS.length}
          isLastStep={isLastStep}
          onNext={handleNext}
          onPrev={prevStep}
          onSkip={skipOnboarding}
          isFirstStep={isFirstStep}
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
      return () => window.removeEventListener('resize', updateRect)
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
