export class SignalPlayer {
  private sig1: HTMLAudioElement
  private sig2: HTMLAudioElement

  constructor() {
    this.sig1 = new Audio("/sig1.mp3")
    this.sig2 = new Audio("/sig2.mp3")

    this.sig1.preload = "auto"
    this.sig2.preload = "auto"
  }

  async unlock(): Promise<void> {
    // ブラウザの音声再生制限を解除するため、
    // ユーザー操作中に再生可能な状態にしておく。
    await this.sig1.play().then(() => {
      this.sig1.pause()
      this.sig1.currentTime = 0
    }).catch(() => {})

    await this.sig2.play().then(() => {
      this.sig2.pause()
      this.sig2.currentTime = 0
    }).catch(() => {})
  }

  playSignal1(): void {
    this.play(this.sig1)
  }

  playSignal2(): void {
    this.play(this.sig2)
  }

  private play(audio: HTMLAudioElement): void {
    audio.currentTime = 0

    const promise = audio.play()

    if (promise !== undefined) {
      promise.catch((error) => {
        console.error("Audio playback failed:", error)
      })
    }
  }
}