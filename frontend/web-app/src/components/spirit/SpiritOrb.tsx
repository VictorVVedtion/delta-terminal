'use client'

import { Sphere } from '@react-three/drei'
import { Canvas, extend, useFrame } from '@react-three/fiber'
import React, { useRef } from 'react'
import * as THREE from 'three'

import { OrbShaderMaterial } from './OrbShader'
import { useSpiritStore } from '@/store/spiritStore'
import { SpiritState } from '@/types/spirit'

extend({ OrbShaderMaterial })

interface OrbProps {
  primaryColor?: string
  secondaryColor?: string
  turbulence?: number
  intensity?: number
}

function OrbMesh({
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

// 视觉配置映射
const visualConfig: Record<SpiritState, OrbProps> = {
  dormant: { primaryColor: '#4a4a4a', secondaryColor: '#2a2a2a', turbulence: 0.1, intensity: 0.5 },
  monitoring: { primaryColor: '#00ffff', secondaryColor: '#0088ff', turbulence: 0.3, intensity: 1.0 },
  analyzing: { primaryColor: '#a020f0', secondaryColor: '#00ffff', turbulence: 1.2, intensity: 1.5 },
  executing: { primaryColor: '#00ff00', secondaryColor: '#ccff00', turbulence: 0.8, intensity: 1.8 },
  alerting: { primaryColor: '#ffaa00', secondaryColor: '#ff4400', turbulence: 2.0, intensity: 2.0 },
  error: { primaryColor: '#ff0000', secondaryColor: '#550000', turbulence: 0.1, intensity: 0.8 }
};

export function SpiritOrb({ className }: { className?: string }) {
  // 仅从 Store 读取状态，订阅由 SpiritConnectionProvider 管理
  const currentState = useSpiritStore((s) => s.currentState);
  const config = visualConfig[currentState] || visualConfig.dormant;

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        {/* eslint-disable-next-line react/no-unknown-property */}
        <ambientLight intensity={0.5} />
        <OrbMesh 
          primaryColor={config.primaryColor} 
          secondaryColor={config.secondaryColor}
          turbulence={config.turbulence}
          intensity={config.intensity}
        />
      </Canvas>
    </div>
  )
}
