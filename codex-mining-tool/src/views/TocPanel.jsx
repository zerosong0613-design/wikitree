import { useMemo, useState } from "react";
import { KIND_COLOR, groupByPath, countKinds } from "../core/schema.js";
import InlineNewRule from "./inline/InlineNewRule.jsx";

// 좌측 목차 (CLAUDE.md 10.1). 리프 클릭 → onSelect(rule.id).
// v0.3 조각 3: `+` 3자리(헤더 · 대분류 옆 · 리프 hover)로 인라인 편집 진입점.
// 한 번에 하나의 InlineNewRule만 열림.
export default function TocPanel({
  rules,
  query,
  selectedRuleId,
  onSelect,
  onTreeChange,
  onRequireAuthor,
  apiKey, // 조각 5: InlineNewRule의 AI path 제안용
}) {
  const [closed, setClosed] = useState({});
  // 열린 인라인 위치: null | { key, initialPath }
  const [openAt, setOpenAt] = useState(null);

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

  function openInline(key, initialPath) {
    setOpenAt({ key, initialPath });
  }
  function closeInline() {
    setOpenAt(null);
  }
  function handleSaved(newTree, stamped) {
    onTreeChange && onTreeChange(newTree);
    onSelect && onSelect(stamped.id);
    closeInline();
  }

  const inlineHere = (key) => openAt?.key === key;

  return (
    <aside className="toc-panel">
      <div className="toc-panel-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="toc-panel-title">목차</span>
          <button
            className="toc-add-btn header"
            onClick={() => openInline("header", [])}
            title="새 판단 심기"
          >
            + 새 판단
          </button>
        </div>
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

      {/* 헤더에서 열린 새 판단 (path 전부 사용자 입력) */}
      {inlineHere("header") && (
        <InlineNewRule
          initialPath={[]}
          onSaved={handleSaved}
          onCancel={closeInline}
          onRequireAuthor={onRequireAuthor}
          apiKey={apiKey}
          treeRules={rules}
        />
      )}

      {total === 0 && !inlineHere("header") ? (
        <div className="toc-empty-state">
          아직 심은 판단이 없어요.
          <br />
          위 <b>+ 새 판단</b>이나 상단 <b>"…더보기"</b>에서 시작해보세요.
        </div>
      ) : (
        <div className="toc-list">
          {majors.map((m, mi) => {
            const visibleLeaves = m.leaves.filter(matches);
            if (q && visibleLeaves.length === 0) return null;
            const forceOpen = !!q && visibleLeaves.length > 0;
            const open = forceOpen || closed[m.name] !== true;
            const majorKey = "major:" + m.name;
            return (
              <div key={m.name} className="toc-major">
                <div className="toc-major-row">
                  <div
                    className="toc-major-toggle"
                    onClick={() => setClosed((s) => ({ ...s, [m.name]: open }))}
                  >
                    <span className="toc-major-caret">{open ? "▾" : "▸"}</span>
                    <span className="toc-n">{mi + 1}.</span>
                    <span className="toc-link">{m.name}</span>
                    {m.blind && <span className="badge-blind">⚠</span>}
                  </div>
                  <button
                    className="toc-add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInline(majorKey, [m.name]);
                    }}
                    title={`"${m.name}" 안에 새 판단`}
                  >
                    +
                  </button>
                </div>

                {inlineHere(majorKey) && (
                  <div className="toc-inline-slot">
                    <InlineNewRule
                      initialPath={[m.name]}
                      onSaved={handleSaved}
                      onCancel={closeInline}
                      onRequireAuthor={onRequireAuthor}
                      apiKey={apiKey}
                      treeRules={rules}
                    />
                  </div>
                )}

                {open && (
                  <div className="toc-items">
                    {visibleLeaves.map((l, li) => {
                      const isHold = l.kind === "hold";
                      const selected = l.id === selectedRuleId;
                      const leafKey = "leaf:" + l.id;
                      const parentPath = [l.path[0], l.path[1]].filter(Boolean);
                      return (
                        <div key={l.id + li}>
                          <div
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
                            <button
                              className="toc-add-btn leaf"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInline(leafKey, parentPath);
                              }}
                              title="이 옆에 새 판단"
                            >
                              +
                            </button>
                          </div>
                          {inlineHere(leafKey) && (
                            <div className="toc-inline-slot leaf-slot">
                              <InlineNewRule
                                initialPath={parentPath}
                                onSaved={handleSaved}
                                onCancel={closeInline}
                                onRequireAuthor={onRequireAuthor}
                                apiKey={apiKey}
                                treeRules={rules}
                              />
                            </div>
                          )}
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
