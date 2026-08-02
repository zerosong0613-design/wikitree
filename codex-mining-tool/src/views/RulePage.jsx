import { useState } from "react";
import { KIND_COLOR, KIND_FG } from "../core/schema.js";

// 중앙 룰 페이지 (CLAUDE.md 10.1).
// ★ 진짜 위키식 표시 — 본문은 "판단 그 자체"(콘텐츠)만 흐른다.
//    "누가·언제·어디서"(저작·이력·출처)는 본문에 박지 않고 [역사] 토글 뒤로 숨긴다.
//    (나무위키/위키피디아의 [편집]·역사와 같은 방식. CLAUDE.md 2장은 '기록'을 요구하지
//     '본문 노출'을 요구하지 않는다 — 기록은 유지, 표시만 역사 뒤로.)
export default function RulePage({ rule }) {
  const [showHistory, setShowHistory] = useState(false);

  if (!rule) {
    return (
      <main className="rule-page">
        <div className="rule-page-empty">
          <MiniMole />
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            왼쪽 목차에서 룰을 선택하세요.
          </div>
          <div style={{ fontSize: 12.5, color: "var(--hold)", lineHeight: 1.55 }}>
            아직 룰이 없다면 상단 <b>"…더보기"</b>에서<br />첫 판단을 심어보세요.
          </div>
        </div>
      </main>
    );
  }

  const color = KIND_COLOR[rule.kind];
  const fg = KIND_FG[rule.kind];
  const isHold = rule.kind === "hold";
  const historyDesc = [...(rule.history || [])].reverse(); // 최근 위
  const authorCount = rule.authors?.length || 0;
  const editCount = rule.history?.length || 0;

  return (
    <main className="rule-page">
      {/* 상단: breadcrumb(경로) + [역사] 토글 — 나무위키의 [편집]/역사처럼 */}
      <div className="rp-top">
        <div className="rp-breadcrumb">
          {rule.path.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="rp-breadcrumb-sep"> › </span>}
              {p}
            </span>
          ))}
        </div>
        <button
          className={"rp-hist-toggle" + (showHistory ? " on" : "")}
          onClick={() => setShowHistory((v) => !v)}
          title="이 판단의 저작·편집 이력·출처"
        >
          {showHistory ? "역사 닫기" : "[역사]"}
        </button>
      </div>

      {/* ── 본문(콘텐츠) — 판단 그 자체만 ── */}

      {/* 판단 */}
      <h1 className="rp-judgment">{rule.judgment}</h1>

      {/* 강도 + badge */}
      <div className="rp-strength-row">
        <span
          className="rp-strength"
          style={{
            background: color,
            color: fg,
            border: isHold ? "2px dashed " + color : "2px solid " + color,
          }}
        >
          {rule.strength_label}
        </span>
        {rule.badge ? <span className="rp-badge">{rule.badge}</span> : null}
      </div>

      {/* note (근거·양보 이력) */}
      {rule.note ? <p className="rp-note">{rule.note}</p> : null}

      {/* hold이면 사각지대 안내 */}
      {isHold && (
        <div className="rp-hold-note">
          팀 판단이 갈린 조항입니다. 이 자리는 <b>사각지대</b>로 남겨져 있어요 —
          기준이 확정될 때까지 억지로 규칙화하지 않습니다.
        </div>
      )}

      {/* 재검토 트리거 (콘텐츠 — 이 판단이 언제 걸리는가) */}
      {(rule.review_trigger?.keywords?.length > 0 ||
        rule.review_trigger?.test ||
        rule.renew_trigger) && (
        <section className="rp-section">
          <div className="rp-section-label">재검토 트리거</div>
          {rule.review_trigger?.keywords?.length > 0 && (
            <div className="rp-triggers">
              {rule.review_trigger.keywords.map((k, i) => (
                <span key={i} className="rp-trigger-chip">
                  {k}
                </span>
              ))}
            </div>
          )}
          {rule.review_trigger?.test && (
            <div className="rp-trigger-test">테스트: {rule.review_trigger.test}</div>
          )}
          {rule.renew_trigger && (
            <div className="rp-trigger-test">RADAR: {rule.renew_trigger}</div>
          )}
        </section>
      )}

      {/* ── [역사] 뒤 — 누가·언제·어디서 (기본 접힘) ── */}
      {showHistory && (
        <div className="rp-history-drawer">
          <div className="rp-history-drawer-head">
            판단 자체가 아니라 <b>이 문서가 어떻게 왔는가</b>입니다 — 저작 {authorCount} · 편집 {editCount}
          </div>

          {/* 저작 (authors) */}
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

          {/* 이력 (history) — 최근 순 */}
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

          {/* 출처 (provenance) — 있으면 (검토 추출·계약 마이닝 온 룰만) */}
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

          {/* 메타 */}
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
