import { KIND_COLOR } from "../kinds.js";

// 하단: 실시간 숫자판(후보 N · 확정 M · 사람 확인 K) + hard/soft/neu 분포 바.
export default function SummaryBar({ summary, confirmedCount, holdCount, rulesLen }) {
  const candidates = summary?.candidates ?? rulesLen ?? 0;
  const confirmed = summary?.confirmed ?? confirmedCount ?? 0;
  const needsHuman = summary?.needs_human ?? holdCount ?? 0;
  const dist = summary?.distribution || { hard: 0, soft: 0, neu: 0 };
  const total = (dist.hard || 0) + (dist.soft || 0) + (dist.neu || 0);

  const seg = (kind, n, label) =>
    n > 0 ? (
      <div
        className="dist-seg"
        key={kind}
        style={{
          flex: n,
          background: KIND_COLOR[kind],
          color: kind === "hard" ? "#f5f6f3" : "#14171c",
        }}
      >
        {label} {n}
      </div>
    ) : null;

  return (
    <div className="summary-bar">
      <div className="summary-stats">
        <div className="stat confirmed">
          <span className="cap">candidates → confirmed</span>
          <span className="num">
            {candidates}
            <span style={{ fontSize: 30, margin: "0 8px", color: "#8a9086" }}>→</span>
            {confirmed}
          </span>
          <span className="sub">후보 {candidates}개 · 확정 {confirmed}개</span>
        </div>
        <div className="stat human dashed">
          <span className="cap">needs human</span>
          <span className="num">{needsHuman}</span>
          <span className="sub">사람 확인 필요</span>
        </div>
        <div className="stat">
          <span className="cap">distribution</span>
          <span className="num" style={{ fontSize: 40 }}>
            {dist.hard || 0}
            <span style={{ fontSize: 20, color: "#8a9086" }}> / </span>
            {dist.soft || 0}
            <span style={{ fontSize: 20, color: "#8a9086" }}> / </span>
            {dist.neu || 0}
          </span>
          <span className="sub">마지노선 / 협상 여지 / 신규</span>
        </div>
      </div>

      <div className="dist-wrap">
        <span className="panel-label">hard · soft · neu 분포</span>
        <div className="dist-bar">
          {total > 0 ? (
            [
              seg("hard", dist.hard || 0, "HARD"),
              seg("soft", dist.soft || 0, "SOFT"),
              seg("neu", dist.neu || 0, "NEU"),
            ]
          ) : (
            <div className="dist-empty">분포 데이터 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}
