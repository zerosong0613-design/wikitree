import Cody from "./Cody.jsx";

// 중앙: 채굴 현장. 상태에 따라 코디 대사와 현장 표시가 바뀐다.
export default function MiningFloor({ status, signedCount, result, error, onRetry }) {
  let codyState = "idle";
  let line = "서명본 붙여넣고 곡괭이 챙기면 시작해요.";

  if (status === "mining") {
    codyState = "mining";
    line = `${signedCount}건 읽는 중이에요…`;
  } else if (status === "done" && result) {
    codyState = "done";
    const k = result.summary?.needs_human ?? 0;
    const c = result.summary?.confirmed ?? 0;
    line =
      k > 0
        ? `${c}개 캤어요! ${k}개는 갈려서 사람 확인으로 뒀어요.`
        : `${c}개 캤어요! 갈린 건 없었어요.`;
  } else if (status === "error") {
    codyState = "error";
    line = "앗, 채굴하다 막혔어요. 오른쪽 대신 여기 보세요.";
  }

  return (
    <section className="panel floor">
      {(status === "done" || status === "mining") && <div className="floor-beam" />}
      <span className="panel-label" style={{ position: "relative" }}>
        mining floor
      </span>

      {/* 채굴 중: 진행 표시 + 스켈레톤 */}
      {status === "mining" && (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="status-strip">
            <span className="dot" />
            <span className="txt">{signedCount}건 읽는 중</span>
            <span className="mono">codi digging…</span>
          </div>
          <div className="skeleton-row" />
          <div className="skeleton-row" style={{ animationDelay: "0.2s" }} />
          <div className="skeleton-row" style={{ animationDelay: "0.4s" }} />
        </div>
      )}

      {/* 대기 */}
      {status === "idle" && (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="status-strip">
            <span className="dot" style={{ animation: "none", background: "#8a9086" }} />
            <span className="txt">채굴 대기</span>
            <span className="mono">idle</span>
          </div>
        </div>
      )}

      {/* 완료: 후보→확정 요약 타일 */}
      {status === "done" && result && (
        <div className="recap" style={{ position: "relative" }}>
          <div className="recap-tile">
            <span className="big">{result.summary?.candidates ?? result.rules?.length ?? 0}</span>
            <span className="big" style={{ color: "#8a9086" }}>→</span>
            <span className="big accent">{result.summary?.confirmed ?? 0}</span>
            <span className="lbl">후보에서 확정 규칙으로</span>
          </div>
          <div className="recap-tile" style={{ animationDelay: "80ms" }}>
            <span className="big" style={{ color: "#8a9086" }}>
              {result.summary?.needs_human ?? 0}
            </span>
            <span className="lbl">사람 확인 큐로 분리 (모르는 건 모른다고)</span>
          </div>
        </div>
      )}

      {/* 에러 + 재시도 */}
      {status === "error" && error && (
        <div className="error-box" style={{ position: "relative" }}>
          <span className="etitle">⚠ {error.title}</span>
          <span className="emsg">{error.msg}</span>
          <button className="retry-btn" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      )}

      <Cody state={codyState} line={line} />
    </section>
  );
}
