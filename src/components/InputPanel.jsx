// 좌: 입력 패널 (표준안 선택 / 서명본 필수) + 채굴 시작 버튼.
export default function InputPanel({
  standardText,
  signedText,
  signedCount,
  onStandardChange,
  onSignedChange,
  hasKey,
  mining,
  onMine,
}) {
  const canMine = hasKey && signedText.trim().length > 0 && !mining;
  const hint = !hasKey
    ? "API 키를 먼저 넣어주세요 — 우상단 ⚙ 설정"
    : signedText.trim().length === 0
    ? "서명본을 붙여넣어야 채굴할 수 있어요"
    : "";

  return (
    <section className="panel">
      <span className="panel-label">input / paste contracts</span>

      <div className="input-block">
        <div className="input-title">
          <strong>표준안</strong>
          <span className="opt">(선택)</span>
        </div>
        <textarea
          className="input-area std"
          placeholder={"우리 회사 표준 계약 조항을 붙여넣으세요.\n비우면 서명본들의 일관성만으로 판단을 추정합니다."}
          value={standardText}
          onChange={(e) => onStandardChange(e.target.value)}
        />
      </div>

      <div className="input-block">
        <div className="input-title">
          <strong>서명본</strong>
          <span className="req">필수</span>
        </div>
        <textarea
          className="input-area signed"
          placeholder={"실제 서명된 계약 여러 건을 --- 로 구분해 붙여넣으세요.\n\n계약 1 본문...\n---\n계약 2 본문...\n---\n계약 3 본문..."}
          value={signedText}
          onChange={(e) => onSignedChange(e.target.value)}
        />
        <div className="count-line">
          <span>--- 로 구분된 서명본</span>
          <span>
            <b>{signedCount}</b>건 감지
          </span>
        </div>
      </div>

      <button className="mine-btn" onClick={onMine} disabled={!canMine}>
        {mining ? "채굴 중…" : "⛏ 채굴 시작"}
      </button>
      <div className="mine-hint">{hint}</div>
    </section>
  );
}
