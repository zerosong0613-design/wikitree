import { useMemo, useState } from "react";
import { KIND_COLOR, countKinds } from "../core/schema.js";
import { groupByAxis } from "../core/categories.js";

// 좌측 목차 (CLAUDE.md v0.5 10.3) — 순수 지도 + 축 토글.
// - 상단 축 토글: [판단별] [계약서별] [부서별] [원천별]. 기본 판단별.
// - 축별 그룹핑은 core/categories.js:groupByAxis. 데이터 불변, 뷰만 재계산.
// - 기본 접힘 · 대분류 헤더 sticky · 강도 dot은 잎(항목)에만 · 미지정/미분류 하단.
// - 편집 자리(`+`) 없음 — 편집은 룰 페이지에서만.
const AXIS_TABS = [
  { key: "판단", label: "판단별" },
  { key: "계약서", label: "계약서별" },
  { key: "부서", label: "부서별" },
  { key: "원천", label: "원천별" },
];

export default function TocPanel({
  rules,
  categoriesDoc,
  selectedRuleId,
  onSelect,
  onOpenCategorySetup,
  axis = "판단",
  onAxisChange,
}) {
  const [openMap, setOpenMap] = useState({});

  const grouped = useMemo(
    () => groupByAxis(rules, axis, categoriesDoc),
    [rules, axis, categoriesDoc]
  );
  const counts = useMemo(() => countKinds(rules), [rules]);
  const total = rules.length;
  const hasCategories = (categoriesDoc?.["판단"] || []).length > 0;

  // 축 바뀌면 open 상태 리셋 (다른 축이니 그룹 이름이 달라짐)
  const openKeyPrefix = axis + ":";
  const isOpen = (name) => openMap[openKeyPrefix + name] === true;
  const toggle = (name) =>
    setOpenMap((m) => ({ ...m, [openKeyPrefix + name]: !(m[openKeyPrefix + name] === true) }));

  // 선택된 룰의 부모 그룹 자동 open (해당 축 기준)
  const selectedRule = rules.find((r) => r.id === selectedRuleId);
  const forceOpenName = deriveForceOpen(selectedRule, axis);
  const isOpenFinal = (name) => name === forceOpenName || isOpen(name);

  const flex = {
    hard: counts.hard || 0.001,
    soft: counts.soft || 0.001,
    neu: counts.neu || 0.001,
    hold: counts.hold || 0.001,
  };

  const isNested = grouped.kind === "nested"; // 계약서별
  const emptyContract =
    axis === "계약서" && grouped.categorized.length === 0 && !grouped.uncategorized;

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

        {/* v0.5 축 토글 */}
        <div className="toc-axis-tabs">
          {AXIS_TABS.map((t) => (
            <button
              key={t.key}
              className={"toc-axis-tab" + (axis === t.key ? " on" : "")}
              onClick={() => onAxisChange && onAxisChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {hasCategories && total > 0 && axis === "판단" && (
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
        ) : emptyContract ? (
          <div className="toc-empty-cat">
            <div className="toc-empty-cat-title">아직 계약에서 추출한 판단이 없어요</div>
            <div className="toc-empty-cat-desc">
              [지식 넣기]에서 원천을 "계약"으로 설정하고 넣거나<br />
              다른 축으로 전환해 보세요.
            </div>
          </div>
        ) : isNested ? (
          <NestedGroups
            grouped={grouped}
            selectedRuleId={selectedRuleId}
            onSelect={onSelect}
            isOpen={isOpenFinal}
            toggle={toggle}
          />
        ) : (
          <FlatGroups
            grouped={grouped}
            selectedRuleId={selectedRuleId}
            onSelect={onSelect}
            isOpen={isOpenFinal}
            toggle={toggle}
          />
        )}
      </div>
    </aside>
  );
}

// 선택된 룰이 현재 축의 어느 그룹에 속하는지 → 자동 open key.
function deriveForceOpen(rule, axis) {
  if (!rule) return null;
  if (axis === "판단") return rule.path?.[0] || null;
  if (axis === "부서") return rule.tags?.["의뢰부서"] || "미지정";
  if (axis === "원천") return rule.tags?.["원천"] || "미지정";
  if (axis === "계약서") return rule.contract_view?.contract_group || null;
  return null;
}

// 판단·부서·원천별 (flat)
function FlatGroups({ grouped, selectedRuleId, onSelect, isOpen, toggle }) {
  return (
    <>
      {grouped.categorized.map((m, mi) => (
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
      {grouped.uncategorized && (
        <MajorBlock
          m={grouped.uncategorized}
          mi={grouped.categorized.length}
          open={isOpen(grouped.uncategorized.name)}
          onToggle={() => toggle(grouped.uncategorized.name)}
          selectedRuleId={selectedRuleId}
          onSelect={onSelect}
          isUncategorized
        />
      )}
    </>
  );
}

// 계약서별 (nested — 계약군 > 계약종류 > 조항)
function NestedGroups({ grouped, selectedRuleId, onSelect, isOpen, toggle }) {
  return (
    <>
      {grouped.categorized.map((g, gi) => (
        <div key={g.name} className="toc-major">
          <button
            className={"toc-major-head" + (isOpen(g.name) ? " open" : "")}
            onClick={() => toggle(g.name)}
            type="button"
          >
            <span className="toc-major-caret">{isOpen(g.name) ? "▾" : "▸"}</span>
            <span className="toc-major-n">{gi + 1}.</span>
            <span className="toc-major-name">{g.name}</span>
            <span className="toc-major-count">
              {g.subgroups.reduce((n, s) => n + s.leaves.length, 0)}개
            </span>
          </button>
          {isOpen(g.name) && (
            <div className="toc-major-body">
              {g.subgroups.map((sg, sgi) => (
                <div key={sg.name + sgi} className="toc-subgroup">
                  <div className="toc-subgroup-head">
                    <span className="toc-subgroup-n">{gi + 1}.{sgi + 1}</span>
                    <span className="toc-subgroup-name">{sg.name}</span>
                    <span className="toc-major-count">{sg.leaves.length}개</span>
                  </div>
                  {sg.leaves.map((l) => (
                    <ContractLeaf
                      key={l.id}
                      rule={l}
                      selected={l.id === selectedRuleId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
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
          이 자리엔 아직 판단이 없어요.
        </div>
      )}
    </div>
  );
}

// 계약서별 리프 — 조항 정보를 앞에 표시
function ContractLeaf({ rule, selected, onSelect }) {
  const isHold = rule.kind === "hold";
  const art = rule.contract_view?.article || "";
  return (
    <button
      className={"toc-leaf" + (selected ? " selected" : "")}
      onClick={() => onSelect && onSelect(rule.id)}
      type="button"
      style={{ paddingLeft: 46 }}
    >
      <span
        className="toc-dot"
        style={{
          background: isHold ? "transparent" : KIND_COLOR[rule.kind],
          borderStyle: isHold ? "dashed" : "solid",
          borderColor: isHold ? KIND_COLOR.hold : "var(--ink)",
        }}
      />
      {art && <span className="toc-leaf-article">{art}</span>}
      <span className="toc-leaf-name">{rule.judgment}</span>
    </button>
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
