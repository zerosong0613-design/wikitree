import { useMemo, useState } from "react";
import { KIND_COLOR, countKinds } from "../core/schema.js";
import { groupByCategories } from "../core/categories.js";

// 좌측 목차 (CLAUDE.md v0.4 10.3) — 순수 지도.
// - 기본 접힘 · 대분류 헤더 sticky · 강도 dot은 잎(항목)에만.
// - 미분류 맨 아래 고정.
// - 편집 자리(`+`) 없음 — 편집은 룰 페이지에서만(3장-9).
// - 카테고리 없으면 [카테고리 설정] 유도.
export default function TocPanel({
  rules,
  categoriesDoc,
  selectedRuleId,
  onSelect,
  onOpenCategorySetup,
}) {
  const [openMap, setOpenMap] = useState({}); // major name → boolean

  const { categorized, uncategorized } = useMemo(
    () => groupByCategories(rules, categoriesDoc),
    [rules, categoriesDoc]
  );
  const counts = useMemo(() => countKinds(rules), [rules]);
  const total = rules.length;

  const hasCategories = (categoriesDoc?.categories || []).length > 0;

  // 선택된 룰의 부모 대분류는 자동 open (사용자가 뭘 보는지 사라지지 않도록)
  const selectedRule = rules.find((r) => r.id === selectedRuleId);
  const forceOpenMajor = selectedRule?.path?.[0] || null;

  const isOpen = (name) => name === forceOpenMajor || openMap[name] === true;
  const toggle = (name) =>
    setOpenMap((m) => ({ ...m, [name]: !(m[name] === true) }));

  const flex = {
    hard: counts.hard || 0.001,
    soft: counts.soft || 0.001,
    neu: counts.neu || 0.001,
    hold: counts.hold || 0.001,
  };

  return (
    <aside className="toc-panel">
      <div className="toc-panel-head">
        <div className="toc-panel-title-row">
          <span className="toc-panel-title">목차</span>
          <span className="toc-panel-meta">
            규칙 {String(total).padStart(2, "0")}개
          </span>
        </div>
        <button className="toc-cat-btn" onClick={onOpenCategorySetup}>
          카테고리 설정
        </button>
      </div>

      {hasCategories && total > 0 && (
        <div className="toc-dist-wrap">
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
        </div>
      )}

      <div className="toc-body">
        {!hasCategories ? (
          <EmptyCategories onOpenSetup={onOpenCategorySetup} />
        ) : (
          <>
            {categorized.map((m, mi) => (
              <MajorBlock
                key={m.name}
                m={m}
                mi={mi}
                open={isOpen(m.name)}
                onToggle={() => toggle(m.name)}
                selectedRuleId={selectedRuleId}
                onSelect={onSelect}
              />
            ))}
            {uncategorized && (
              <MajorBlock
                m={uncategorized}
                mi={categorized.length}
                open={isOpen(uncategorized.name)}
                onToggle={() => toggle(uncategorized.name)}
                selectedRuleId={selectedRuleId}
                onSelect={onSelect}
                isUncategorized
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function MajorBlock({ m, mi, open, onToggle, selectedRuleId, onSelect, isUncategorized }) {
  const count = m.leaves.length;
  return (
    <div className={"toc-major" + (isUncategorized ? " uncat" : "")}>
      <button
        className={"toc-major-head" + (open ? " open" : "")}
        onClick={onToggle}
        type="button"
      >
        <span className="toc-major-caret">{open ? "▾" : "▸"}</span>
        <span className="toc-major-n">{mi + 1}.</span>
        <span className="toc-major-name">{m.name}</span>
        {m.blind && <span className="toc-blind">⚠</span>}
        <span className="toc-major-count">{count}개</span>
      </button>
      {open && count > 0 && (
        <div className="toc-major-body">
          {m.leaves.map((l) => {
            const isHold = l.kind === "hold";
            const selected = l.id === selectedRuleId;
            return (
              <button
                key={l.id}
                className={"toc-leaf" + (selected ? " selected" : "")}
                onClick={() => onSelect && onSelect(l.id)}
                type="button"
              >
                <span
                  className="toc-dot"
                  style={{
                    background: isHold ? "transparent" : KIND_COLOR[l.kind],
                    borderStyle: isHold ? "dashed" : "solid",
                    borderColor: isHold ? KIND_COLOR.hold : "var(--ink)",
                  }}
                />
                <span className="toc-leaf-name">{l.judgment}</span>
              </button>
            );
          })}
        </div>
      )}
      {open && count === 0 && !isUncategorized && (
        <div className="toc-major-empty">
          이 카테고리엔 아직 판단이 없어요.
        </div>
      )}
    </div>
  );
}

function EmptyCategories({ onOpenSetup }) {
  return (
    <div className="toc-empty-cat">
      <div className="toc-empty-cat-title">카테고리가 아직 없습니다</div>
      <div className="toc-empty-cat-desc">
        먼저 판단을 분류할 큰 틀을 정해주세요.
      </div>
      <button className="toc-empty-cat-btn" onClick={onOpenSetup}>
        카테고리 설정
      </button>
    </div>
  );
}
