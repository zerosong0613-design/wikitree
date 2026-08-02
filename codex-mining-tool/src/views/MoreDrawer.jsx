import { useState } from "react";
import MiningEntry from "../entries/MiningEntry.jsx";

// "…더보기" 드로어 (CLAUDE.md v0.4 10.9).
// 무거운 유틸(계약 마이닝·검토 추출·렌즈·인터뷰). 수동 폼은 상단 [지식 넣기]로 흡수됨.
// 평상시 편집은 룰 페이지 안 EditableField로 (원칙 9).
const TABS = [
  { id: "mining", label: "계약 마이닝", desc: "대량 · 초기 부트스트랩용", disabled: false },
  { id: "review-extract", label: "검토 추출 4단계", desc: "준비 중 — 나중 조각", disabled: true },
  { id: "review-lens", label: "검토 렌즈", desc: "준비 중 — 나중 조각", disabled: true },
  { id: "interview", label: "인터뷰 채굴", desc: "준비 중 — 나중", disabled: true },
];

export default function MoreDrawer({ open, onClose, apiKey, onInjected, onOpenSettings, categoriesDoc }) {
  const [tab, setTab] = useState("mining");
  if (!open) return null;

  const current = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <div className="more-drawer-backdrop" onClick={onClose}>
      <aside className="more-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="more-drawer-head">
          <div>
            <div className="more-drawer-title">…더보기</div>
            <div style={{ fontSize: 11.5, color: "var(--sub)", marginTop: 2 }}>
              무거운 편집·렌즈 · 평상시엔 위키 안 인라인을 씁니다
            </div>
          </div>
          <button className="more-drawer-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="more-drawer-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={
                "more-drawer-tab " +
                (tab === t.id ? "on " : "") +
                (t.disabled ? "off" : "")
              }
              onClick={() => !t.disabled && setTab(t.id)}
              disabled={t.disabled}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="more-drawer-body">
          <p className="more-drawer-hint">{current.desc}</p>

          {tab === "mining" && (
            <>
              {!apiKey && (
                <div className="keyless-banner" style={{ marginBottom: 12 }}>
                  API 키를 먼저 넣어야 마이닝이 됩니다.
                  <button className="link-btn" onClick={onOpenSettings}>
                    ⚙ 설정 열기
                  </button>
                </div>
              )}
              <MiningEntry
                apiKey={apiKey}
                onInjected={onInjected}
                categoriesDoc={categoriesDoc}
              />
            </>
          )}

          {tab === "review-extract" && (
            <div className="more-drawer-disabled">
              <div>검토 추출 4단계 워크플로우.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                계약 한 건 → AI 조항별 추출 → 사람이 넣기/수정/빼기 → 출처와 함께 저장.
              </div>
              <span className="more-drawer-disabled-tag">조각 5에서 실체</span>
            </div>
          )}

          {tab === "review-lens" && (
            <div className="more-drawer-disabled">
              <div>검토 렌즈.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                새 입력을 트리에 비춰 위반/해당/보류/무관 판정.
              </div>
              <span className="more-drawer-disabled-tag">조각 5에서 실체</span>
            </div>
          )}

          {tab === "interview" && (
            <div className="more-drawer-disabled">
              <div>인터뷰 채굴.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                AI가 상황을 묻고 사람이 답해 룰로 정규화. 문서에 없는 암묵지용.
              </div>
              <span className="more-drawer-disabled-tag">나중 조각</span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
