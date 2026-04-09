import { useState, useRef, useCallback } from "react"

const API_URL = import.meta.env.VITE_API_URL || ""

interface UseVoiceInputOptions {
  onTranscription: (text: string) => void
  onError?: (error: Error) => void
  sampleRate?: number
}

interface UseVoiceInputReturn {
  isRecording: boolean
  isTranscribing: boolean
  startRecording: () => Promise<void>
  stopRecording: () => void
  cancelRecording: () => void
  toggleRecording: () => Promise<void>
  analyser: AnalyserNode | null
}

export function useVoiceInput({
  onTranscription,
  onError,
  sampleRate = 16000,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const isRecordingRef = useRef(false)

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    analyserRef.current?.disconnect()
    analyserRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    isRecordingRef.current = false
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      mediaStreamRef.current = stream

      const ctx = new AudioContext({ sampleRate })
      audioContextRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser

      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      chunksRef.current = []

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0)
        chunksRef.current.push(new Float32Array(data))
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      isRecordingRef.current = true
      setIsRecording(true)
    } catch (err) {
      cleanup()
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }, [sampleRate, cleanup, onError])

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return

    const chunks = chunksRef.current
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const samples = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      samples.set(chunk, offset)
      offset += chunk.length
    }
    chunksRef.current = []

    cleanup()

    // Skip if too short (< 0.3s)
    if (samples.length < sampleRate * 0.3) return

    setIsTranscribing(true)
    const wavBlob = encodeWav(samples, sampleRate)

    const formData = new FormData()
    formData.append("file", wavBlob, "recording.wav")

    fetch(`${API_URL}/api/transcribe`, {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText)
          throw new Error(`Transcription failed: ${text}`)
        }
        return res.json()
      })
      .then((data: { text: string }) => {
        const text = data.text?.trim()
        if (text) onTranscription(text)
      })
      .catch((err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        setIsTranscribing(false)
      })
  }, [sampleRate, cleanup, onTranscription, onError])

  const cancelRecording = useCallback(() => {
    chunksRef.current = []
    if (isRecordingRef.current) cleanup()
  }, [cleanup])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,
    analyser: analyserRef.current,
  }
}

// ── WAV encoder ──────────────────────────────────────────────────────

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const dataLength = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, "WAVE")

  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, bitsPerSample, true)

  writeString(view, 36, "data")
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([buffer], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
