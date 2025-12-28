import { describe, it, expect, beforeEach } from 'vitest'
import { useModeStore, MODE_CONFIGS, type WorkMode } from '../mode'

describe('ModeStore', () => {
  beforeEach(() => {
    // Reset store
    useModeStore.setState({
      currentMode: 'chat',
      previousMode: null,
      isTransitioning: false,
    })
  })

  describe('Initial State', () => {
    it('should have chat as default mode', () => {
      const { currentMode } = useModeStore.getState()
      expect(currentMode).toBe('chat')
    })

    it('should have null previousMode', () => {
      const { previousMode } = useModeStore.getState()
      expect(previousMode).toBeNull()
    })

    it('should not be transitioning', () => {
      const { isTransitioning } = useModeStore.getState()
      expect(isTransitioning).toBe(false)
    })
  })

  describe('Mode Actions', () => {
    it('should set mode', () => {
      useModeStore.getState().setMode('research')
      const { currentMode, previousMode } = useModeStore.getState()
      expect(currentMode).toBe('research')
      expect(previousMode).toBe('chat')
    })

    it('should track mode history', () => {
      useModeStore.getState().setMode('research')
      useModeStore.getState().setMode('monitor')
      const { currentMode, previousMode } = useModeStore.getState()
      expect(currentMode).toBe('monitor')
      expect(previousMode).toBe('research')
    })

    it('should toggle to previous mode', () => {
      useModeStore.getState().setMode('research')
      useModeStore.getState().toggleMode()
      const { currentMode } = useModeStore.getState()
      expect(currentMode).toBe('chat')
    })

    it('should not change if no previous mode on toggle', () => {
      useModeStore.getState().toggleMode()
      const { currentMode } = useModeStore.getState()
      expect(currentMode).toBe('chat')
    })
  })

  describe('Mode Configs', () => {
    it('should have 6 modes configured', () => {
      expect(Object.keys(MODE_CONFIGS)).toHaveLength(6)
    })

    it('should have all required mode properties', () => {
      const modes: WorkMode[] = ['chat', 'research', 'code', 'onchain', 'monitor', 'sleep']
      modes.forEach((mode) => {
        const config = MODE_CONFIGS[mode]
        expect(config.id).toBe(mode)
        expect(config.name).toBeTruthy()
        expect(config.icon).toBeTruthy()
        expect(config.description).toBeTruthy()
        expect(Array.isArray(config.features)).toBe(true)
      })
    })

    it('should have correct chat mode config', () => {
      const config = MODE_CONFIGS.chat
      expect(config.name).toBe('对话模式')
      expect(config.features).toContain('InsightCard')
    })

    it('should have correct sleep mode config', () => {
      const config = MODE_CONFIGS.sleep
      expect(config.name).toBe('安睡模式')
      expect(config.features).toContain('自动化')
    })
  })
})
