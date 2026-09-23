import { useReactionTest } from "./hooks/useReactionTest"

function formatMS(value: number | null): string {
  return value === null ? "-" : `${Math.round(value)}`
}

function formatSignedMS(value: number | null): string {
  if (value === null) return "-"

  const rounded = Math.round(value)

  if (rounded > 0) {
    return `+${rounded}`
  }

  return `${rounded}`
}

function App() {
  const test = useReactionTest()

  const isFinished = test.phase === "finished"
  const isResult = test.phase === "result"
  const isActive =
    !["idle", "result", "finished"].includes(test.phase)

  const backgroundClass =
    test.phase === "triggered"
      ? "app go"
      : test.phase === "signal4"
        ? "app fourth"
        : test.phase === "result" && test.falseStart
          ? "app flying"
          : "app"

  return (
    <main className={backgroundClass}>
      <section
        className="test-screen"
        onPointerDown={(event) => {
          // ボタン操作は画面タップとして扱わない
          if ((event.target as HTMLElement).closest("button")) return
          test.handleTap()
        }}
      >
        <header className="header">
          <div className="title">
            {test.phase === "idle"
              ? "REACTION TEST"
              : isFinished
                ? "RESULT"
                : `TRIAL ${test.trialNumber} / ${test.trialCount}`}
          </div>

          {isResult && (
            <div className="timing">
              4音目まで{" "}
              {Math.round(test.triggerBeforeFourthSignalMS)} ms
            </div>
          )}
        </header>

        <div className="main-area">
          {test.phase === "idle" && (
            <>
              <div className="big idle-text">REACTION</div>

              <div className="trial-select">
                <label htmlFor="trial-count">
                  試行回数
                </label>

                <select
                  id="trial-count"
                  value={test.trialCount}
                  onChange={(event) =>
                    test.setTrialCount(Number(event.target.value))
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(
                    (count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="sub-text">START TEST</div>
            </>
          )}
          
          {["signal1", "signal2", "signal3"].includes(test.phase) && (
            <>
              <div className="big">{test.signalNumber}</div>
              <div className="sub-text">WAIT</div>
            </>
          )}

          {test.phase === "triggered" && (
            <>
              <div className="big go-text">GO!</div>
              <div className="tap-text">TAP!</div>
            </>
          )}

          {test.phase === "signal4" && (
            <>
              <div className="big go-text">4</div>
              <div className="tap-text">GO!</div>
            </>
          )}

          {test.phase === "result" && (
            <div className="result-main">
              {test.falseStart ? (
                <>
                  <div className="flying-text">FLYING</div>
                  <div className="sub-text">予測スタート</div>
                  <div className="small-text">
                    GOまで{" "}
                    {Math.round(
                      test.triggerBeforeFourthSignalMS,
                    )}{" "}
                    ms
                  </div>
                </>
              ) : (
                <>
                  <div className="reaction">
                    {formatMS(test.reactionMS)}
                    <span> ms</span>
                  </div>
                  <div className="sub-text">
                    {test.tappedAfterFourthSignal
                      ? "4音目後"
                      : "4音目前"}
                  </div>
                </>
              )}
            </div>
          )}

          {isFinished && (
            <div className="finished-main">
              <div className="big">FINISHED</div>
            </div>
          )}
        </div>

        {isResult && (
          <div className="result-actions">
            <button
              className="primary-button"
              onClick={test.nextTrial}
            >
              {test.results.length >= test.trialCount ? "結果を見る" : "次へ"}
            </button>
          </div>
        )}

        {test.phase === "idle" && (
          <div className="result-actions">
            <button
              className="primary-button start-button"
              onClick={() => void test.startTest()}
            >
              スタート
            </button>
          </div>
        )}

        {isActive && (
          <div className="hint">画面が変わったらタップ</div>
        )}

        {isFinished && (
          <div className="finished-area">
            <div className="stats">
              <Stat title="平均値" value={test.average} />
              <Stat title="中央値" value={test.median} />
              <Stat title="最速" value={test.fastest} />
              <Stat title="最遅" value={test.slowest} />
            </div>

            <div className="false-start-count">
              フライング {test.falseStartCount} / {test.trialCount}
            </div>

            <div className="history">
              {/* カラム名 */}
              <div className="history-row history-header">
                <span>試行</span>
                <span>GO位置</span>
                <span>GO→タップ</span>
                <span>4音目→タップ</span>
              </div>

              {test.results.map((result) => (
                <div
                  className="history-row"
                  key={result.trial}
                >
                  <span>{result.trial}</span>
                  <span>
                    -{Math.round(
                      result.triggerBeforeFourthSignalMS,
                    )}
                    ms
                  </span>
                  <span>
                    {result.falseStart
                      ? "フライング"
                      : `${Math.round(
                          result.reactionMS ?? 0,
                        )}ms`}
                  </span>
                  <span>
                    {formatSignedMS(
                      result.fourthSignalToTapMS,
                    )}
                    {result.fourthSignalToTapMS !== null
                      ? "ms"
                      : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="button-row">
              <button
                className="secondary-button"
                onClick={test.reset}
              >
                リセット
              </button>

              <button
                className="primary-button"
                onClick={() => void test.startTest()}
              >
                もう一度
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

function Stat({
  title,
  value,
}: {
  title: string
  value: number | null
}) {
  return (
    <div className="stat">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{formatMS(value)}</div>
      <div className="stat-unit">ms</div>
    </div>
  )
}

export default App