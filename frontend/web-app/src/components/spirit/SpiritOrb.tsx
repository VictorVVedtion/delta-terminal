'use client'

import { Sphere } from '@react-three/drei'
import { Canvas, extend, useFrame } from '@react-three/fiber'
import React, { useRef } from 'react'
import * as THREE from 'three'

import { OrbShaderMaterial } from './OrbShader'

extend({ OrbShaderMaterial })

interface OrbProps {
  /** 当前状态：idling, thinking, speaking, error */
  state?: 'idle' | 'thinking' | 'speaking' | 'error'
  /** 主要颜色 (Hex or CSS string) */
  primaryColor?: string
  /** 次要颜色 (Hex or CSS string) */
  secondaryColor?: string
  /** 湍流强度 (0.0 - 2.0) */
  turbulence?: number
  /** 強度 (0.0 - 2.0) */
  intensity?: number
  /** 尺寸 */
  size?: number
}

function OrbMesh({
  state: _state = 'idle',
  primaryColor = '#00ffff',
  secondaryColor = '#ff00ff',
  turbulence = 0.1,
  intensity = 1.0,
}: OrbProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialRef = useRef<any>(null)

  // Convert colors to THREE.Color
  const c1 = new THREE.Color(primaryColor)
  const c2 = new THREE.Color(secondaryColor)

  useFrame((_frameState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime += delta

      // Smoothly interpolate intensity
      materialRef.current.uIntensity = THREE.MathUtils.lerp(
        materialRef.current.uIntensity,
        intensity,
        delta * 2
      )

      // Smoothly interpolate turbulence
      materialRef.current.uTurbulence = THREE.MathUtils.lerp(
        materialRef.current.uTurbulence,
        turbulence,
        delta * 1.5
      )

      // Update colors
      materialRef.current.uColorPrimary.lerp(c1, delta * 2)
      materialRef.current.uColorSecondary.lerp(c2, delta * 2)
    }
  })

  return (
    <Sphere args={[1, 64, 64]} scale={1.5}>
      {/* eslint-disable react/no-unknown-property */}
      <orbShaderMaterial ref={materialRef} transparent={true} blending={THREE.AdditiveBlending} />
      {/* eslint-enable react/no-unknown-property */}
    </Sphere>
  )
}

export function SpiritOrb({ className, ...props }: OrbProps & { className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <ambientLight intensity={0.5} />
        <OrbMesh {...props} />
      </Canvas>
    </div>
  )
}
