'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface SpiritBeamProps {
    /** Is the beam active? (e.g. while streaming) */
    isActive: boolean
    /** Primary color of the beam */
    color?: string
    /** Target element ID to beam towards (optional alignment) */
    targetId?: string
}

export function SpiritBeam({ isActive, color = '#00ffff' }: SpiritBeamProps) {
    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 0.6, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute left-6 top-10 w-[2px] h-full origin-top z-0 pointer-events-none"
                    style={{
                        background: `linear-gradient(to bottom, ${color}, transparent)`,
                        filter: 'blur(4px)',
                    }}
                >
                    {/* Moving particles inside the beam */}
                    <motion.div
                        animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-[-2px] w-[6px] h-12 bg-white rounded-full opacity-50 blur-sm"
                    />
                    {/* Scanning overlay */}
                    <motion.div
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-white/10"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}
