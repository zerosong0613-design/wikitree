import { useMemo, useState } from "react";
import { KIND_COLOR, groupByPath, countKinds } from "../core/schema.js";

// 좌측 목차 (CLAUDE.md 10.1). 기존 WikitreeTab의 toc 로직 흡수.
// - 대분류 접이식(기본 열림). 리프 클릭 → onSelect(rule.id).
// - 검색어(query) 있으면 판단문/path에 포함된 리프만. 매칭 리프의 부모는 자동 열림.
// - 다수 hold 가지엔 ⚠. 리프별 개별 컨테이너로 렌더 → 조각 3에서 `+` 붙이기 쉽게.
export default function TocPanel({ rules, query, selectedRuleId, onSelect }) {
  const [closed, setClosed] = useState({});

  const majors = useMemo(() => groupByPath(rules), [rules]);
  const counts = useMemo(() => countKinds(rules), [rules]);
  const total = rules.length;

  const q = (query || "").trim().toLowerCase();
  const matches = (r) => {
    if (!q) return true;
    const hay = [r.judgment, r.note, ...(r.path || [])].join(" ").toLowerCase();
    return hay.includes(q);
  };

  const flex = {
    hard: counts.hard || 0.001,
    soft: counts.soft || 0.001,
    neu: counts.neu || 0.001,
    hold: counts.hold || 0.001,
  };

  return (
    <aside className="toc-panel">
      <div className="toc-panel-head">
        <span className="toc-panel-title">목차</span>
        <span className="toc-panel-meta">
          규칙 {String(total).padStart(2, "0")}개 · 가지 {majors.length}개
        </span>
      </div>

      <div className="dist-bar tall">
        {["hard", "soft", "neu", "hold"].map((k) => (
          <div
            key={k}
            className="dist-seg"
            style={{ flex: flex[k], background: KIND_COLOR[k], border: "none" }}
          />
        ))}
      </div>
      <div className="dist-legend">
        <span>마지노선 {counts.hard}</span>
        <span>협상 {counts.soft}</span>
        <span>신규 {counts.neu}</span>
        <span>사람 확인 {counts.hold}</span>
      </div>

      {total === 0 ? (
        <div className="toc-empty-state">
          아직 심은 판단이 없어요.
          <br />
          "…더보기"에서 첫 판단을 심어보세요.
        </div>
      ) : (
        <div className="toc-list">
          {majors.map((m, mi) => {
            const visibleLeaves = m.leaves.filter(matches);
            if (q && visibleLeaves.length === 0) return null;
            const forceOpen = !!q && visibleLeaves.length > 0;
            const open = forceOpen || closed[m.name] !== true;
            return (
              <div key={m.name} className="toc-major">
                <div
                  className="toc-major-toggle"
                  onClick={() => setClosed((s) => ({ ...s, [m.name]: open }))}
                >
                  <span className="toc-major-caret">{open ? "▾" : "▸"}</span>
                  <span className="toc-n">{mi + 1}.</span>
                  <span className="toc-link">{m.name}</span>
                  {m.blind && <span className="badge-blind">⚠</span>}
                </div>
                {open && (
                  <div className="toc-items">
                    {visibleLeaves.map((l, li) => {
                      const isHold = l.kind === "hold";
                      const selected = l.id === selectedRuleId;
                      return (
                        <div
                          key={l.id + li}
                          className={"toc-leaf" + (selected ? " selected" : "")}
                          onClick={() => onSelect && onSelect(l.id)}
                        >
                          <span className="toc-n sm">
                            {mi + 1}.{li + 1}
                          </span>
                          <span
                            className="toc-dot"
                            style={{
                              background: isHold ? "transparent" : KIND_COLOR[l.kind],
                              borderStyle: isHold ? "dashed" : "solid",
                              borderColor: isHold ? KIND_COLOR.hold : "var(--ink)",
                            }}
                          />
                          <span className="toc-item-name">{l.judgment}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
