type SignalName = "signal1" | "signal2"

/** Plays decoded, in-memory audio buffers so signals can be scheduled precisely. */
export class SignalPlayer {
  private readonly context: AudioContext
  private readonly buffers: Record<SignalName, AudioBuffer | null> = {
    signal1: null,
    signal2: null,
  }
  private loading: Promise<void> | null = null

  constructor() {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (!AudioContextConstructor) {
      throw new Error("Web Audio API is not supported by this browser")
    }

    this.context = new AudioContextConstructor()
  }

  get currentTime(): number {
    return this.context.currentTime
  }

  /** Call directly from a user gesture so Safari can unlock audio playback. */
  async unlock(): Promise<void> {
    const resume = this.context.resume()
    await Promise.all([resume, this.loadBuffers()])
    if (this.context.state !== "running") await this.context.resume()
  }

  scheduleSignal1(audioTime: number): void {
    this.schedule("signal1", audioTime)
  }

  scheduleSignal2(audioTime: number): void {
    this.schedule("signal2", audioTime)
  }

  private loadBuffers(): Promise<void> {
    if (!this.loading) {
      this.loading = Promise.all(
        (["signal1", "signal2"] as const).map(async (name) => {
          const file = name === "signal1" ? "sig1.mp3" : "sig2.mp3"
          const response = await fetch(`${import.meta.env.BASE_URL}${file}`)
          if (!response.ok) throw new Error(`Could not load ${file}`)
          const data = await response.arrayBuffer()
          this.buffers[name] = await this.context.decodeAudioData(data)
        }),
      ).then(() => undefined).catch((error: unknown) => {
        this.loading = null
        throw error
      })
    }

    return this.loading
  }

  private schedule(name: SignalName, audioTime: number): void {
    const buffer = this.buffers[name]
    if (!buffer || this.context.state !== "running") return

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.context.destination)
    source.start(Math.max(audioTime, this.context.currentTime))
  }
}
