import { KIND_ORDER, DEFAULT_LABEL } from "../../core/schema.js";

// 4칩 kind 선택기 (v0.3 조각 3).
// 인라인 새 룰(InlineNewRule)과 룰 페이지 강도 pill 팝오버에서 재사용.
// 기존 .kind-btn 스타일 그대로 씀.
export default function KindPicker({ value, onChange, size = "sm" }) {
  return (
    <div className={"kind-pick " + (size === "sm" ? "kind-pick-sm" : "")}>
      {KIND_ORDER.map((k) => (
        <button
          key={k}
          type="button"
          className={"kind-btn " + (value === k ? "on" : "") + " k-" + k}
          onClick={() => onChange(k)}
          title={DEFAULT_LABEL[k]}
        >
          {DEFAULT_LABEL[k]}
        </button>
      ))}
    </div>
  );
}
