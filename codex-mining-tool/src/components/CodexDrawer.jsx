import RuleCard from "./RuleCard.jsx";

// 우: CODEX 서랍 — 확정(hold 아님) 규칙만 카드로 꽂힌다.
export default function CodexDrawer({ confirmed, hasStandard }) {
  const count = confirmed.length;
  return (
    <section className="panel">
      <div className="drawer-head">
        <span className="panel-label">codex drawer</span>
        <span className="drawer-count">{String(count).padStart(2, "0")}</span>
      </div>
      <p className="drawer-hint">
        {hasStandard
          ? "숫자 = 서명본 중 우리 표준안이 관철된 건수. 한 번도 안 내줬으면 마지노선, 양보 이력이 있으면 협상 여지."
          : "표준안 없이 추정한 규칙. 미터는 등장/표본 기준이며 양보 수치는 만들지 않았어요."}
      </p>

      {count === 0 ? (
        <div className="empty-state">
          <span className="mono">empty</span>
          <span style={{ fontSize: 13 }}>아직 캐낸 규칙이 없어요</span>
        </div>
      ) : (
        <div className="rule-list">
          {confirmed.map((r, i) => (
            <RuleCard key={r.id + i} rule={r} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
