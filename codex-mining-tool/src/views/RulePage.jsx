import { useMemo, useState } from "react";
import { KIND_COLOR, KIND_FG, DEFAULT_LABEL } from "../core/schema.js";
import { updateRule } from "../core/store.js";
import { stampAuthoring, NoAuthorError } from "../core/authoring.js";
import { UNCATEGORIZED } from "../core/categories.js";
import EditableField from "./inline/EditableField.jsx";
import KindPicker from "./inline/KindPicker.jsx";

// 중앙 룰 페이지 (CLAUDE.md v0.4 10.4).
// 위→아래: breadcrumb → 판단 → credit → 강도+badge → 요약 카드 → note → hold 안내 → 재검토 → 관련 판단.
// 편집은 여기서만 (10.8) — 판단문·note·kind·summary·path 모두 마우스오버 편집.
// 저작·이력·출처는 [역사] 토글 뒤(2장·10.4).
export default function RulePage({
  rule,
  rules,
  categoriesDoc,
  onSelectRule,
  onTreeChange,
  onRequireAuthor,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [kindPickerOpen, setKindPickerOpen] = useState(false);
  const [pathEditOpen, setPathEditOpen] = useState(false);

  const rulesById = useMemo(
    () => new Map((rules || []).map((r) => [r.id, r])),
    [rules]
  );

  if (!rule) {
    return (
      <main className="rule-page">
        <div className="rule-page-empty">
          <MiniMole />
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            왼쪽 목차에서 룰을 선택하세요.
          </div>
          <div style={{ fontSize: 12.5, color: "var(--hold)", lineHeight: 1.55 }}>
            아직 룰이 없다면 상단 <b>[지식 넣기]</b>에서<br />첫 판단을 심어보세요.
          </div>
        </div>
      </main>
    );
  }

  const color = KIND_COLOR[rule.kind];
  const fg = KIND_FG[rule.kind];
  const isHold = rule.kind === "hold";
  const historyDesc = [...(rule.history || [])].reverse();
  const authorCount = rule.authors?.length || 0;
  const editCount = rule.history?.length || 0;

  // 편집 헬퍼 — patch를 rule에 덮고 stampAuthoring 통과, updateRule 저장.
  function commitPatch(patch, action) {
    const stamped = stampAuthoring({ ...rule, ...patch }, action);
    const newTree = updateRule(rule.id, stamped, categoriesDoc);
    onTreeChange && onTreeChange(newTree);
  }

  async function saveJudgment(newValue) {
    try {
      commitPatch({ judgment: newValue }, "판단문 수정");
    } catch (err) {
      if (err instanceof NoAuthorError) onRequireAuthor && onRequireAuthor();
      throw err;
    }
  }
  async function saveNote(newValue) {
    try {
      commitPatch({ note: newValue }, "note 수정");
    } catch (err) {
      if (err instanceof NoAuthorError) onRequireAuthor && onRequireAuthor();
      throw err;
    }
  }
  async function saveSummary(newValue) {
    try {
      commitPatch({ summary: newValue }, "summary 수정");
    } catch (err) {
      if (err instanceof NoAuthorError) onRequireAuthor && onRequireAuthor();
      throw err;
    }
  }
  function saveKind(newKind) {
    if (newKind === rule.kind) {
      setKindPickerOpen(false);
      return;
    }
    try {
      commitPatch({ kind: newKind, strength_label: DEFAULT_LABEL[newKind] }, "kind 변경");
      setKindPickerOpen(false);
    } catch (err) {
      if (err instanceof NoAuthorError) {
        onRequireAuthor && onRequireAuthor();
        setKindPickerOpen(false);
      } else {
        console.error(err);
      }
    }
  }
  function savePath(newPath) {
    try {
      commitPatch({ path: newPath }, "path 이동");
      setPathEditOpen(false);
    } catch (err) {
      if (err instanceof NoAuthorError) {
        onRequireAuthor && onRequireAuthor();
      } else {
        console.error(err);
      }
    }
  }

  const credit = creditLine(rule);
  const hasReviewTrigger =
    (rule.review_trigger?.keywords?.length || 0) > 0 ||
    !!rule.review_trigger?.test ||
    !!rule.renew_trigger;
  const relatedRules = (rule.related || [])
    .map((id) => rulesById.get(id))
    .filter(Boolean);

  return (
    <main className="rule-page">
      {/* 상단: breadcrumb + 우측 액션 */}
      <div className="rp-top">
        <div className="rp-breadcrumb">
          <span>판단 찾기</span>
          {rule.path.map((p, i) => (
            <span key={i}>
              <span className="rp-breadcrumb-sep"> › </span>
              <span className={i === rule.path.length - 1 ? "rp-breadcrumb-last" : ""}>{p}</span>
            </span>
          ))}
        </div>
        <div className="rp-top-actions">
          <button
            className={"rp-path-btn" + (pathEditOpen ? " on" : "")}
            onClick={() => setPathEditOpen((v) => !v)}
            title="이 판단을 다른 카테고리로"
          >
            카테고리 이동
          </button>
          <button
            className={"rp-hist-toggle" + (showHistory ? " on" : "")}
            onClick={() => setShowHistory((v) => !v)}
            title="이 판단의 저작·편집 이력·출처"
          >
            {showHistory ? "역사 닫기" : "[역사]"}
          </button>
        </div>
      </div>

      {/* Path 이동 폼 (조건부) */}
      {pathEditOpen && (
        <PathEditForm
          value={rule.path}
          categoriesDoc={categoriesDoc}
          onSave={savePath}
          onCancel={() => setPathEditOpen(false)}
        />
      )}

      {/* 판단 (제목) */}
      <EditableField
        value={rule.judgment}
        multiline
        placeholder="판단 한 문장 · 클릭해서 편집"
        displayClassName="rp-judgment"
        editingClassName="rp-judgment-editing"
        onSave={saveJudgment}
        onRequireAuthor={onRequireAuthor}
      />

      {/* Credit 한 줄 */}
      {credit && <div className="rp-credit">{credit}</div>}

      {/* 강도 pill + badge + KindPicker 팝오버 */}
      <div className="rp-strength-row">
        <div className="rp-strength-wrap">
          <button
            className="rp-strength"
            style={{
              background: color,
              color: fg,
              border: isHold ? "2px dashed " + color : "2px solid " + color,
              cursor: "pointer",
            }}
            onClick={() => setKindPickerOpen((v) => !v)}
            title="클릭해서 강도 변경"
          >
            {rule.strength_label} ▾
          </button>
          {kindPickerOpen && (
            <>
              <div
                className="rp-kind-popover-backdrop"
                onClick={() => setKindPickerOpen(false)}
              />
              <div className="rp-kind-popover">
                <KindPicker value={rule.kind} onChange={saveKind} />
              </div>
            </>
          )}
        </div>
        {rule.badge ? <span className="rp-badge">{rule.badge}</span> : null}
      </div>

      {/* 요약 카드 */}
      <section className="rp-summary-card">
        <span className="rp-summary-label">요약</span>
        <EditableField
          value={rule.summary}
          multiline
          placeholder="여기에 이 판단의 배경·논리를 요약해 두면 나중 검토가 쉬워져요."
          displayClassName="rp-summary-text"
          editingClassName="rp-summary-editing"
          onSave={saveSummary}
          onRequireAuthor={onRequireAuthor}
        />
      </section>

      {/* note (근거·양보 이력 한 줄) */}
      <EditableField
        value={rule.note}
        placeholder="+ 근거·양보 이력 한 줄 (선택)"
        displayClassName="rp-note"
        editingClassName="rp-note-editing"
        onSave={saveNote}
        onRequireAuthor={onRequireAuthor}
      />

      {/* hold 안내 카드 (조건부) */}
      {isHold && (
        <div className="rp-hold-card">
          <div className="rp-hold-head">
            <span>⚠</span> 팀 판단이 갈린 자리 · 사람 확인 필요
          </div>
          <div className="rp-hold-body">
            {rule.note ||
              "기준이 확정될 때까지 억지로 규칙화하지 않습니다. 담당자를 정해 한 줄로 확정해야 합니다."}
          </div>
          <div className="rp-hold-actions">
            <button className="rp-placeholder-btn" disabled title="아직 준비 중">
              토론 열기
            </button>
            <button className="rp-placeholder-btn" disabled title="아직 준비 중">
              담당자 지정
            </button>
          </div>
        </div>
      )}

      {/* 재검토 카드 */}
      {hasReviewTrigger && (
        <div className="rp-recheck-card">
          <div className="rp-recheck-info">
            <span className="rp-recheck-label">재검토</span>
            <div className="rp-recheck-triggers">
              {rule.review_trigger?.keywords?.length > 0 && (
                <div className="rp-triggers">
                  {rule.review_trigger.keywords.map((k, i) => (
                    <span key={i} className="rp-trigger-chip">{k}</span>
                  ))}
                </div>
              )}
              {rule.review_trigger?.test && (
                <div className="rp-trigger-test">테스트: {rule.review_trigger.test}</div>
              )}
              {rule.renew_trigger && (
                <div className="rp-trigger-test">RADAR: {rule.renew_trigger}</div>
              )}
            </div>
          </div>
          <button className="rp-placeholder-btn primary" disabled title="아직 준비 중">
            재검토 요청
          </button>
        </div>
      )}

      {/* 관련 판단 pills */}
      {relatedRules.length > 0 && (
        <div className="rp-related">
          <span className="rp-related-label">관련 판단</span>
          <div className="rp-related-pills">
            {relatedRules.map((r) => (
              <button
                key={r.id}
                className="rp-related-pill"
                onClick={() => onSelectRule && onSelectRule(r.id)}
                title={r.path.join(" › ")}
              >
                {r.judgment}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* [역사] 뒤 */}
      {showHistory && (
        <div className="rp-history-drawer">
          <div className="rp-history-drawer-head">
            판단 자체가 아니라 <b>이 문서가 어떻게 왔는가</b>입니다 — 저작 {authorCount} · 편집 {editCount}
          </div>

          <section className="rp-section">
            <div className="rp-section-label">저작 · 이 룰의 주인</div>
            {authorCount > 0 ? (
              <div className="rp-authors">
                {rule.authors.map((a, i) => (
                  <div key={a.name + i} className="rp-author-card">
                    <span className="rp-author-name">{a.name}</span>
                    <span className="rp-author-role">{a.role}</span>
                    <span className="rp-author-at">{fmtDate(a.at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rp-author-missing">
                ⚠ 저작자 없음 (v0.1 룰이거나 자동 stamp 이전)
              </div>
            )}
          </section>

          {historyDesc.length > 0 && (
            <section className="rp-section">
              <div className="rp-section-label">이력 · 편집 기록 (최근 순)</div>
              <div className="rp-history">
                {historyDesc.map((h, i) => (
                  <div key={i} className="rp-history-row">
                    <span className="rp-history-at">{fmtDate(h.at)}</span>
                    <span className="rp-history-who">{h.who}</span>
                    <span className="rp-history-action">— {h.action}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {rule.provenance && (
            <section className="rp-section">
              <div className="rp-section-label">출처 · 어디서 왔나</div>
              <div className="rp-provenance">
                {rule.provenance.source_contract && (
                  <div className="rp-provenance-row">
                    <span className="rp-provenance-k">계약</span>
                    <span>{rule.provenance.source_contract}</span>
                  </div>
                )}
                {rule.provenance.reviewed_by && (
                  <div className="rp-provenance-row">
                    <span className="rp-provenance-k">검토자</span>
                    <span>{rule.provenance.reviewed_by}</span>
                  </div>
                )}
                {rule.provenance.extracted_at && (
                  <div className="rp-provenance-row">
                    <span className="rp-provenance-k">추출일</span>
                    <span>{rule.provenance.extracted_at}</span>
                  </div>
                )}
                {rule.provenance.source_article && (
                  <div className="rp-provenance-row">
                    <span className="rp-provenance-k">조항</span>
                    <span>{rule.provenance.source_article}</span>
                  </div>
                )}
                {rule.provenance.extraction_method && (
                  <div className="rp-provenance-row">
                    <span className="rp-provenance-k">방법</span>
                    <span>{rule.provenance.extraction_method}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="rp-meta">
            <span className="rp-meta-item">origin: {rule.origin}</span>
            <span className="rp-meta-item">status: {rule.status}</span>
            {rule.source ? <span className="rp-meta-item">근거 위치: {rule.source}</span> : null}
            <span className="rp-meta-item">id: {rule.id}</span>
          </div>
        </div>
      )}
    </main>
  );
}

// ────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────

function PathEditForm({ value, categoriesDoc, onSave, onCancel }) {
  const cats = categoriesDoc?.categories || [];
  const [major, setMajor] = useState(value?.[0] || "");
  const [minor, setMinor] = useState(value?.[1] || "");
  const [item, setItem] = useState(value?.[2] || "");

  const majorNode = cats.find((c) => c.name === major);
  const availableMinors = majorNode?.subs || [];

  // 대분류 변경 시 유효하지 않은 중분류는 초기화
  function onChangeMajor(v) {
    setMajor(v);
    const node = cats.find((c) => c.name === v);
    if (!node || !node.subs.includes(minor)) setMinor("");
  }

  function submit() {
    if (!major) return;
    const newPath = [major, minor, item].map((s) => s.trim()).filter(Boolean);
    if (newPath.length === 0) return;
    onSave(newPath);
  }

  return (
    <div className="rp-path-edit">
      <select
        className="rp-path-select"
        value={major}
        onChange={(e) => onChangeMajor(e.target.value)}
      >
        <option value="">대분류…</option>
        {cats.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
        <option value={UNCATEGORIZED}>{UNCATEGORIZED}</option>
      </select>
      <span className="rp-path-sep">›</span>
      <select
        className="rp-path-select"
        value={minor}
        onChange={(e) => setMinor(e.target.value)}
        disabled={!majorNode}
      >
        <option value="">(중분류 없음)</option>
        {availableMinors.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span className="rp-path-sep">›</span>
      <input
        className="rp-path-input"
        type="text"
        placeholder="항목"
        value={item}
        onChange={(e) => setItem(e.target.value)}
      />
      <div className="rp-path-actions">
        <button className="rp-path-cancel" onClick={onCancel}>취소</button>
        <button className="rp-path-save" onClick={submit} disabled={!major}>
          이동
        </button>
      </div>
    </div>
  );
}

// Credit 한 줄 합성: "이름가 · 출처에서 · 날짜 (등재|추출)"
function creditLine(rule) {
  const author = rule.authors?.[0]?.name || "";
  const at =
    rule.provenance?.extracted_at ||
    rule.authors?.[0]?.at ||
    rule.created_at ||
    "";
  const source = rule.provenance?.source_contract
    ? `${rule.provenance.source_contract}에서`
    : originToHuman(rule.origin);
  const when = at ? fmtDateShort(at) : "";
  const verb = rule.provenance?.source_contract ? "추출" : "등재";
  const parts = [];
  if (author) parts.push(`${author}가`);
  if (source) parts.push(source);
  if (when) parts.push(`${when} ${verb}`);
  return parts.join(" · ");
}

function originToHuman(o) {
  const m = {
    "인라인 편집": "인라인 편집으로",
    "룰 페이지 편집": "룰 페이지 편집으로",
    "수동 폼": "수동 폼으로",
    "새 룰": "새 룰 만들기로",
    "검토 추출": "검토 추출로",
    "계약 마이닝(diff)": "계약 마이닝으로",
    "계약서 마이닝(diff)": "계약 마이닝으로",
    "인터뷰 채굴": "인터뷰로",
  };
  return m[o] || (o ? `${o}으로` : "");
}

function fmtDate(iso) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const d = new Date(t);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function fmtDateShort(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const d = new Date(t);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function MiniMole() {
  return (
    <svg viewBox="0 0 150 132" style={{ width: 110, height: 96, opacity: 0.6 }}>
      <path d="M6 120 C4 100 26 88 44 94 C54 78 96 78 106 94 C126 88 146 100 144 120 Z" fill="#E3CBA4" stroke="#14171C" strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M34 108 C28 58 48 30 75 30 C102 30 122 58 116 108 Z" fill="#7A5A44" stroke="#14171C" strokeWidth="3.4" strokeLinejoin="round" />
      <g stroke="#14171C" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M40 80 L14 74 M40 88 L12 88 M110 80 L136 74 M110 88 L138 88" />
        <path d="M46 46 C58 30 92 30 104 46" strokeWidth="3" />
      </g>
      <circle cx="75" cy="28" r="10" fill="#C8871F" stroke="#14171C" strokeWidth="3" />
      <circle cx="75" cy="28" r="3.4" fill="#F5F6F3" />
      <g fill="none" stroke="#14171C" strokeWidth="2.6">
        <circle cx="60" cy="70" r="11" fill="rgba(245,246,243,.28)" />
        <circle cx="90" cy="70" r="11" fill="rgba(245,246,243,.28)" />
        <path d="M71 70 h8" />
      </g>
      <ellipse cx="60" cy="70" rx="3.4" ry="4.6" fill="#14171C" />
      <ellipse cx="90" cy="70" rx="3.4" ry="4.6" fill="#14171C" />
    </svg>
  );
}
