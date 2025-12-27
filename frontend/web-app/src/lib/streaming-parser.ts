/**
 * Streaming Parser
 * V3 Design Document: Incremental Parsing for AI Responses
 *
 * Optimized parser for streaming AI responses that:
 * - Parses content incrementally as chunks arrive
 * - Handles markdown formatting progressively
 * - Extracts structured data (JSON blocks) from streams
 * - Provides smooth text animation
 * - Manages partial state efficiently
 */

// =============================================================================
// Types
// =============================================================================

export type StreamChunkType =
  | 'text'        // Plain text content
  | 'markdown'    // Markdown formatted content
  | 'code'        // Code block
  | 'json'        // JSON data block
  | 'tool_call'   // Tool invocation
  | 'thinking'    // AI thinking/reasoning block
  | 'error'       // Error message

export interface StreamChunk {
  type: StreamChunkType
  content: string
  metadata?: Record<string, unknown>
  isComplete: boolean
  timestamp: number
}

export interface ParsedStream {
  chunks: StreamChunk[]
  fullText: string
  extractedJson: unknown[]
  codeBlocks: CodeBlock[]
  isComplete: boolean
  parseErrors: string[]
}

export interface CodeBlock {
  language: string
  code: string
  startLine: number
  isComplete: boolean
}

export interface StreamParserOptions {
  /** Enable markdown parsing */
  parseMarkdown?: boolean
  /** Enable JSON extraction */
  extractJson?: boolean
  /** Enable code block detection */
  detectCodeBlocks?: boolean
  /** Custom delimiters for JSON blocks */
  jsonDelimiters?: { start: string; end: string }
  /** Callback for each parsed chunk */
  onChunk?: (chunk: StreamChunk) => void
  /** Buffer size before flush (chars) */
  bufferSize?: number
  /** Debounce time for updates (ms) */
  debounceMs?: number
}

// =============================================================================
// Stream Parser State
// =============================================================================

interface ParserState {
  buffer: string
  inCodeBlock: boolean
  codeLanguage: string
  codeContent: string
  inJsonBlock: boolean
  jsonContent: string
  jsonDepth: number
  chunks: StreamChunk[]
  codeBlocks: CodeBlock[]
  extractedJson: unknown[]
  parseErrors: string[]
  lastFlush: number
}

function createInitialState(): ParserState {
  return {
    buffer: '',
    inCodeBlock: false,
    codeLanguage: '',
    codeContent: '',
    inJsonBlock: false,
    jsonContent: '',
    jsonDepth: 0,
    chunks: [],
    codeBlocks: [],
    extractedJson: [],
    parseErrors: [],
    lastFlush: Date.now(),
  }
}

// =============================================================================
// Stream Parser Class
// =============================================================================

export class StreamingParser {
  private state: ParserState
  private options: Required<StreamParserOptions>
  private flushTimeout: NodeJS.Timeout | null = null

  constructor(options: StreamParserOptions = {}) {
    this.state = createInitialState()
    this.options = {
      parseMarkdown: true,
      extractJson: true,
      detectCodeBlocks: true,
      jsonDelimiters: { start: '```json', end: '```' },
      onChunk: () => {},
      bufferSize: 50,
      debounceMs: 16, // ~60fps
      ...options,
    }
  }

  /**
   * Process incoming text chunk
   */
  public push(text: string): void {
    this.state.buffer += text
    this.processBuffer()
  }

  /**
   * Mark stream as complete and flush remaining buffer
   */
  public complete(): ParsedStream {
    this.flushBuffer(true)
    return this.getResult()
  }

  /**
   * Reset parser state
   */
  public reset(): void {
    this.state = createInitialState()
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout)
      this.flushTimeout = null
    }
  }

  /**
   * Get current parsed result
   */
  public getResult(): ParsedStream {
    return {
      chunks: this.state.chunks,
      fullText: this.state.chunks.map(c => c.content).join(''),
      extractedJson: this.state.extractedJson,
      codeBlocks: this.state.codeBlocks,
      isComplete: false,
      parseErrors: this.state.parseErrors,
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private processBuffer(): void {
    // Check for code blocks
    if (this.options.detectCodeBlocks) {
      this.detectCodeBlocks()
    }

    // Check for JSON blocks
    if (this.options.extractJson) {
      this.detectJsonBlocks()
    }

    // Debounced flush for regular text
    if (this.state.buffer.length >= this.options.bufferSize) {
      this.scheduleFlush()
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) return

    this.flushTimeout = setTimeout(() => {
      this.flushBuffer(false)
      this.flushTimeout = null
    }, this.options.debounceMs)
  }

  private flushBuffer(force: boolean): void {
    if (!force && this.state.inCodeBlock) return
    if (!force && this.state.inJsonBlock) return
    if (this.state.buffer.length === 0) return

    const chunk: StreamChunk = {
      type: this.state.inCodeBlock ? 'code' : 'text',
      content: this.state.buffer,
      isComplete: force,
      timestamp: Date.now(),
    }

    this.state.chunks.push(chunk)
    this.options.onChunk(chunk)
    this.state.buffer = ''
    this.state.lastFlush = Date.now()
  }

  private detectCodeBlocks(): void {
    const buffer = this.state.buffer
    const codeBlockStart = /```(\w*)\n?/
    const _codeBlockEnd = /\n?```/

    if (!this.state.inCodeBlock) {
      // Look for opening
      const match = buffer.match(codeBlockStart)
      if (match?.index !== undefined) {
        // Flush text before code block
        const textBefore = buffer.substring(0, match.index)
        if (textBefore) {
          const chunk: StreamChunk = {
            type: 'text',
            content: textBefore,
            isComplete: true,
            timestamp: Date.now(),
          }
          this.state.chunks.push(chunk)
          this.options.onChunk(chunk)
        }

        // Start code block
        this.state.inCodeBlock = true
        this.state.codeLanguage = match[1] || 'text'
        this.state.codeContent = ''
        this.state.buffer = buffer.substring(match.index + match[0].length)
      }
    } else {
      // Look for closing
      const closeIndex = buffer.indexOf('```')
      if (closeIndex !== -1) {
        // Complete code block
        this.state.codeContent += buffer.substring(0, closeIndex)

        const codeBlock: CodeBlock = {
          language: this.state.codeLanguage,
          code: this.state.codeContent,
          startLine: 0,
          isComplete: true,
        }
        this.state.codeBlocks.push(codeBlock)

        // Emit code chunk
        const chunk: StreamChunk = {
          type: 'code',
          content: this.state.codeContent,
          metadata: { language: this.state.codeLanguage },
          isComplete: true,
          timestamp: Date.now(),
        }
        this.state.chunks.push(chunk)
        this.options.onChunk(chunk)

        // Reset state
        this.state.inCodeBlock = false
        this.state.codeLanguage = ''
        this.state.codeContent = ''
        this.state.buffer = buffer.substring(closeIndex + 3)
      } else {
        // Accumulate code content
        this.state.codeContent += buffer
        this.state.buffer = ''
      }
    }
  }

  private detectJsonBlocks(): void {
    const buffer = this.state.buffer
    const { start, end } = this.options.jsonDelimiters

    if (!this.state.inJsonBlock) {
      // Look for JSON block start
      const startIndex = buffer.indexOf(start)
      if (startIndex !== -1) {
        // Flush text before JSON
        const textBefore = buffer.substring(0, startIndex)
        if (textBefore) {
          const chunk: StreamChunk = {
            type: 'text',
            content: textBefore,
            isComplete: true,
            timestamp: Date.now(),
          }
          this.state.chunks.push(chunk)
          this.options.onChunk(chunk)
        }

        this.state.inJsonBlock = true
        this.state.jsonContent = ''
        this.state.buffer = buffer.substring(startIndex + start.length)
      }
    } else {
      // Look for JSON block end
      const endIndex = buffer.indexOf(end)
      if (endIndex !== -1) {
        // Complete JSON block
        this.state.jsonContent += buffer.substring(0, endIndex)

        // Try to parse JSON
        try {
          const parsed = JSON.parse(this.state.jsonContent.trim())
          this.state.extractedJson.push(parsed)

          // Emit JSON chunk
          const chunk: StreamChunk = {
            type: 'json',
            content: this.state.jsonContent,
            metadata: { parsed },
            isComplete: true,
            timestamp: Date.now(),
          }
          this.state.chunks.push(chunk)
          this.options.onChunk(chunk)
        } catch (err) {
          this.state.parseErrors.push(`JSON parse error: ${err}`)

          // Emit as text instead
          const chunk: StreamChunk = {
            type: 'text',
            content: start + this.state.jsonContent + end,
            isComplete: true,
            timestamp: Date.now(),
          }
          this.state.chunks.push(chunk)
          this.options.onChunk(chunk)
        }

        // Reset state
        this.state.inJsonBlock = false
        this.state.jsonContent = ''
        this.state.buffer = buffer.substring(endIndex + end.length)
      } else {
        // Accumulate JSON content
        this.state.jsonContent += buffer
        this.state.buffer = ''
      }
    }
  }
}

// =============================================================================
// Text Animator
// =============================================================================

export interface TextAnimatorOptions {
  /** Characters per second (ignored in realtime mode) */
  speed?: number
  /** Vary speed for natural effect (ignored in realtime mode) */
  variableSpeed?: boolean
  /** Pause at punctuation (ignored in realtime mode) */
  pauseAtPunctuation?: boolean
  /**
   * Realtime mode - display characters immediately as they arrive from SSE stream.
   * When true, characters are shown instantly without animation delay,
   * making the typing effect follow the actual AI token generation speed.
   */
  realtime?: boolean
  /** Callback for each character */
  onChar?: (char: string, index: number) => void
  /** Callback on complete */
  onComplete?: (text: string) => void
}

export class TextAnimator {
  private text = ''
  private position = 0
  private options: Required<TextAnimatorOptions>
  private animationFrame: number | null = null
  private lastTime = 0

  constructor(options: TextAnimatorOptions = {}) {
    this.options = {
      speed: 60, // 60 chars/sec (fallback for non-realtime mode)
      variableSpeed: true,
      pauseAtPunctuation: true,
      realtime: true, // 默认使用 realtime 模式，跟随真实 SSE 流速度
      onChar: () => {},
      onComplete: () => {},
      ...options,
    }
  }

  /**
   * Start animating text
   */
  public animate(text: string): void {
    this.text = text
    this.position = 0

    if (this.options.realtime) {
      // Realtime 模式：立即输出所有字符，跟随真实 AI token 速度
      this.emitAllPending()
    } else {
      // Legacy 模式：使用固定速度动画
      this.lastTime = performance.now()
      this.tick()
    }
  }

  /**
   * Append more text (for streaming)
   */
  public append(text: string): void {
    this.text += text

    if (this.options.realtime) {
      // Realtime 模式：立即输出新到达的字符
      this.emitAllPending()
    } else {
      // Legacy 模式：调度动画帧
      if (!this.animationFrame) {
        this.tick()
      }
    }
  }

  /**
   * Emit all pending characters immediately (for realtime mode)
   */
  private emitAllPending(): void {
    while (this.position < this.text.length) {
      const char = this.text[this.position]
      if (char !== undefined) {
        this.options.onChar(char, this.position)
      }
      this.position++
    }
  }

  /**
   * Skip to end
   */
  public skip(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    // Emit remaining characters
    while (this.position < this.text.length) {
      const char = this.text[this.position]
      if (char !== undefined) {
        this.options.onChar(char, this.position)
      }
      this.position++
    }

    this.options.onComplete(this.text)
  }

  /**
   * Stop animation
   */
  public stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  /**
   * Get current displayed text
   */
  public getCurrentText(): string {
    return this.text.substring(0, this.position)
  }

  private tick = (): void => {
    const now = performance.now()
    const delta = now - this.lastTime

    // Calculate characters to emit
    let charsToEmit = Math.floor((delta / 1000) * this.options.speed)

    // Variable speed for natural effect
    if (this.options.variableSpeed) {
      const variance = Math.random() * 0.5 + 0.75 // 0.75-1.25x
      charsToEmit = Math.floor(charsToEmit * variance)
    }

    if (charsToEmit > 0) {
      for (let i = 0; i < charsToEmit && this.position < this.text.length; i++) {
        const char = this.text[this.position]
        if (char !== undefined) {
          this.options.onChar(char, this.position)
          this.position++

          // Pause at punctuation
          if (this.options.pauseAtPunctuation && /[.!?]/.test(char)) {
            this.lastTime = now + 100 // Add 100ms pause
            break
          }
        } else {
          this.position++
        }
      }
      this.lastTime = now
    }

    // Continue or complete
    if (this.position < this.text.length) {
      this.animationFrame = requestAnimationFrame(this.tick)
    } else {
      this.animationFrame = null
      this.options.onComplete(this.text)
    }
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Simple streaming text hook helper
 */
export function createStreamHandler(
  onUpdate: (text: string) => void,
  options: StreamParserOptions = {}
): {
  push: (chunk: string) => void
  complete: () => ParsedStream
  reset: () => void
} {
  const parser = new StreamingParser({
    ...options,
    onChunk: () => {
      onUpdate(parser.getResult().fullText)
    },
  })

  return {
    push: (chunk: string) => { parser.push(chunk); },
    complete: () => parser.complete(),
    reset: () => { parser.reset(); },
  }
}

/**
 * Parse streaming markdown incrementally
 */
export function parseStreamingMarkdown(text: string): {
  formatted: string
  inProgress: {
    bold: boolean
    italic: boolean
    code: boolean
    link: boolean
  }
} {
  // Track incomplete formatting
  const counts = {
    asterisks: (text.match(/\*/g) || []).length,
    underscores: (text.match(/_/g) || []).length,
    backticks: (text.match(/`/g) || []).length,
    brackets: (text.match(/\[/g) || []).length - (text.match(/\]/g) || []).length,
  }

  return {
    formatted: text,
    inProgress: {
      bold: counts.asterisks % 4 >= 2,
      italic: counts.asterisks % 2 === 1 || counts.underscores % 2 === 1,
      code: counts.backticks % 2 === 1,
      link: counts.brackets > 0,
    },
  }
}

// =============================================================================
// Exports
// =============================================================================

export default StreamingParser
