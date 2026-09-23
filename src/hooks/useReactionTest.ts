import { useCallback, useEffect, useRef, useState } from "react"
import { SignalPlayer } from "../audio/SignalPlayer.ts"

export type Phase =
  | "idle"
  | "signal1"
  | "signal2"
  | "signal3"
  | "waiting"
  | "triggered"
  | "signal4"
  | "result"
  | "finished"

export interface TrialResult {
  trial: number
  triggerBeforeFourthSignalMS: number
  reactionMS: number | null
  fourthSignalToTapMS: number | null
  falseStart: boolean
  tappedAfterFourthSignal: boolean
}

// const TRIALS = 10
const SIGNAL_INTERVAL_MS = 1000
const GO_MIN_BEFORE_FOURTH_MS = 0
const GO_MAX_BEFORE_FOURTH_MS = 200

function now(): number {
  return performance.now()
}

export function useReactionTest() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [signalNumber, setSignalNumber] = useState(0)
  const [trialNumber, setTrialNumber] = useState(0)
  const [trialCount, setTrialCount] = useState(10)
  const [reactionMS, setReactionMS] = useState<number | null>(null)
  const [falseStart, setFalseStart] = useState(false)
  const [tappedAfterFourthSignal, setTappedAfterFourthSignal] =
    useState(false)
  const [triggerBeforeFourthSignalMS, setTriggerBeforeFourthSignalMS] =
    useState(0)
  const [results, setResults] = useState<TrialResult[]>([])

  const trialID = useRef(0)
  const timers = useRef<number[]>([])
  const triggerTime = useRef<number | null>(null)
  const fourthSignalTime = useRef<number | null>(null)
  const tappedBeforeFourth = useRef(false)
  const running = useRef(false)
  const player = useRef(new SignalPlayer())

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) {
      window.clearTimeout(timer)
    }
    timers.current = []
  }, [])

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.current.push(timer)
  }, [])

  const startTrial = useCallback(
    (id: number, trial: number) => {
      clearTimers()

      triggerTime.current = null
      fourthSignalTime.current = null
      tappedBeforeFourth.current = false

      setTrialNumber(trial)
      setSignalNumber(1)
      setReactionMS(null)
      setFalseStart(false)
      setTappedAfterFourthSignal(false)
      setPhase("signal1")

      player.current.playSignal1()

      schedule(() => {
        if (trialID.current !== id) return
        setSignalNumber(2)
        setPhase("signal2")
        player.current.playSignal1()
      }, SIGNAL_INTERVAL_MS)

      schedule(() => {
        if (trialID.current !== id) return
        setSignalNumber(3)
        setPhase("signal3")
        player.current.playSignal1()
      }, SIGNAL_INTERVAL_MS * 2)

      const beforeFourth =
        Math.random() *
          (GO_MAX_BEFORE_FOURTH_MS - GO_MIN_BEFORE_FOURTH_MS) +
        GO_MIN_BEFORE_FOURTH_MS

      setTriggerBeforeFourthSignalMS(beforeFourth)

      const goDelay = SIGNAL_INTERVAL_MS - beforeFourth

      schedule(() => {
        if (trialID.current !== id || !running.current) return

        triggerTime.current = now()
        setPhase("triggered")
      }, SIGNAL_INTERVAL_MS * 2 + goDelay)

      schedule(() => {
        if (trialID.current !== id || !running.current) return

        fourthSignalTime.current = now()
        setSignalNumber(4)
        setPhase("signal4")
        player.current.playSignal2()

        // GO〜4音目前にすでにタップしていた場合は、
        // 4音目を鳴らしたあと結果画面へ進む
        if (tappedBeforeFourth.current) {
          setPhase("result")
        }
      }, SIGNAL_INTERVAL_MS * 3)
    },
    [clearTimers, schedule],
  )

  const startTest = useCallback(async () => {
    clearTimers()
    await player.current.unlock()

    trialID.current += 1
    const id = trialID.current

    setResults([])
    setTrialNumber(1)
    running.current = true
    triggerTime.current = null
    fourthSignalTime.current = null

    startTrial(id, 1)
  }, [clearTimers, startTrial])

  const registerFalseStart = useCallback(
    (tapTime: number) => {
      // GO前のタップ
      if (triggerTime.current === null) {
        clearTimers()
        trialID.current += 1

        setFalseStart(true)
        setReactionMS(null)
        setTappedAfterFourthSignal(false)

        setResults((previous) => [
          ...previous,
          {
            trial: trialNumber,
            triggerBeforeFourthSignalMS,
            reactionMS: null,
            fourthSignalToTapMS: null,
            falseStart: true,
            tappedAfterFourthSignal: false,
          },
        ])

        setPhase("result")
        return
      }

      // GO後の処理
      const expectedFourthSignalTime =
        triggerTime.current + triggerBeforeFourthSignalMS

      const fourthToTap =
        tapTime - expectedFourthSignalTime

      clearTimers()
      trialID.current += 1

      setFalseStart(true)
      setReactionMS(null)
      setTappedAfterFourthSignal(false)

      setResults((previous) => [
        ...previous,
        {
          trial: trialNumber,
          triggerBeforeFourthSignalMS,
          reactionMS: null,
          fourthSignalToTapMS: fourthToTap,
          falseStart: true,
          tappedAfterFourthSignal: false,
        },
      ])

      setPhase("result")
    },
    [
      clearTimers,
      trialNumber,
      triggerBeforeFourthSignalMS,
    ],
  )

  const registerReaction = useCallback(
    (afterFourth: boolean, tapTime: number, keepFourthSignal: boolean) => {
      if (triggerTime.current === null) return
      if (phase === "result") return

      const reaction = Math.max(0, tapTime - triggerTime.current)

      /*
      * 通常タップの場合は、実際に4音目が鳴った時刻を使用する。
      */
      const fourthToTap =
        fourthSignalTime.current !== null
          ? tapTime - fourthSignalTime.current
          : null

      // GO〜4音目前のタップ
      if (keepFourthSignal) {
        tappedBeforeFourth.current = true
      } else {
        // 4音目後のタップでは、この試行を終了させる
        clearTimers()
        trialID.current += 1
      }

      setReactionMS(reaction)
      setFalseStart(false)
      setTappedAfterFourthSignal(afterFourth)

      setResults((previous) => [
        ...previous,
        {
          trial: trialNumber,
          triggerBeforeFourthSignalMS,
          reactionMS: reaction,
          fourthSignalToTapMS: fourthToTap,
          falseStart: false,
          tappedAfterFourthSignal: afterFourth,
        },
      ])

      // GO〜4音目前なら結果画面にしない
      if (!keepFourthSignal) {
        setPhase("result")
      }
    },
    [
      clearTimers,
      phase,
      trialNumber,
      triggerBeforeFourthSignalMS,
    ],
  )

  const handleTap = useCallback(() => {
    if (!running.current) return

    const currentTime = now()

    // GO前
    if (triggerTime.current === null) {
      /*
       * 通常はここには入らないが、
       * GO表示前のタップはフライングとして扱う。
       */
      registerFalseStart(currentTime)
      return
    }

    // 4th signal以降
    if (
      fourthSignalTime.current !== null &&
      currentTime >= fourthSignalTime.current
    ) {
      // GO〜4音目前ですでにタップ済みなら、
      // 4音目後のタップは無効
      if (tappedBeforeFourth.current) {
        return
      }

      registerReaction(true, currentTime, false)
      return
    }
    
    // GO後、4th signal前
    registerReaction(false, currentTime, true)
  }, [registerFalseStart, registerReaction])

  const nextTrial = useCallback(() => {
    if (phase !== "result") return

    if (results.length >= trialCount) {
      running.current = false
      setPhase("finished")
      return
    }

    clearTimers()
    trialID.current += 1

    const id = trialID.current
    const nextNumber = results.length + 1

    triggerTime.current = null
    fourthSignalTime.current = null

    startTrial(id, nextNumber)
  }, [clearTimers, phase, results.length, startTrial, trialCount])

  const reset = useCallback(() => {
    clearTimers()
    trialID.current += 1

    running.current = false
    triggerTime.current = null
    fourthSignalTime.current = null

    setPhase("idle")
    setSignalNumber(0)
    setTrialNumber(0)
    setReactionMS(null)
    setFalseStart(false)
    setTappedAfterFourthSignal(false)
    setTriggerBeforeFourthSignalMS(0)
    setResults([])
  }, [clearTimers])

  useEffect(() => {
    return () => {
      clearTimers()
      running.current = false
    }
  }, [clearTimers])

  const validResults = results
    .map((result) => result.reactionMS)
    .filter((value): value is number => value !== null)

  const average =
    validResults.length > 0
      ? validResults.reduce((sum, value) => sum + value, 0) /
        validResults.length
      : null

  const sorted = [...validResults].sort((a, b) => a - b)

  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] +
            sorted[sorted.length / 2]) /
          2
        : sorted[Math.floor(sorted.length / 2)]

  const fastest = sorted.length > 0 ? sorted[0] : null
  const slowest = sorted.length > 0 ? sorted[sorted.length - 1] : null

  const falseStartCount = results.filter(
    (result) => result.falseStart,
  ).length

  return {
    phase,
    signalNumber,
    trialNumber,
    reactionMS,
    falseStart,
    tappedAfterFourthSignal,
    triggerBeforeFourthSignalMS,
    results,
    average,
    median,
    fastest,
    slowest,
    falseStartCount,
    startTest,
    handleTap,
    nextTrial,
    reset,
    trialCount,
    setTrialCount,
  }
}