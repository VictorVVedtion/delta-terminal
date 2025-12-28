'use client'

import { motion, useMotionValue, useSpring } from 'framer-motion'
import React, { useRef } from 'react'

import type { ButtonProps } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MagneticButtonProps extends ButtonProps {
  springConfig?: { stiffness: number; damping: number; mass: number }
  threshold?: number
}

export function MagneticButton({
  children,
  className,
  springConfig = { stiffness: 150, damping: 15, mass: 0.1 },
  threshold: _threshold = 20, // Distance to pull
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Spring physics for smooth return
  const mouseX = useSpring(x, springConfig)
  const mouseY = useSpring(y, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current!.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)

    x.set(middleX * 0.2) // Dampen the movement
    y.set(middleY * 0.2)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div style={{ x: mouseX, y: mouseY }} className="inline-block">
      <Button
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn('relative transition-transform active:scale-95', className)}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  )
}
