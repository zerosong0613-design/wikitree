import Meter from "./Meter.jsx";
import { KIND_COLOR, KIND_FG } from "../kinds.js";

// 룰 카드: id(mono) → 판단(굵게) → 강도 배지(색=kind) → 관철/양보 배지 → note → origin 우상단 → 미터
// index로 cx-snap 애니메이션을 하나씩 튕기게 지연.
export default function RuleCard({ rule, index = 0 }) {
  const color = KIND_COLOR[rule.kind];
  const fg = KIND_FG[rule.kind];
  const isHold = rule.kind === "hold";
  return (
    <div
      className={"rule-card" + (isHold ? " dashed" : "")}
      style={{
        animationDelay: `${index * 80}ms`,
        boxShadow: isHold ? "none" : `0 0 0 4px ${color}22`,
      }}
    >
      <div className="rule-top">
        <span className="rule-id">{rule.id}</span>
        <span className="rule-origin">{rule.origin}</span>
      </div>
      <span className="rule-judgment">{rule.judgment}</span>
      <div className="rule-mid">
        <span className="badge-strength" style={{ background: color, color: fg }}>
          {rule.strength_label}
        </span>
        {rule.badge ? <span className="badge-ratio">{rule.badge}</span> : <span />}
      </div>
      {rule.note ? <span className="rule-note">{rule.note}</span> : null}
      <Meter held={rule.held} total={rule.total} muddy={isHold} />
    </div>
  );
}
