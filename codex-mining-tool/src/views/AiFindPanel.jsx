// 우측 AI 찾기 자리 (CLAUDE.md 7.2, 10.1).
// 조각 2에선 자리만. 실체는 조각 4에서.
export default function AiFindPanel() {
  return (
    <aside className="ai-find-panel">
      <div className="ai-find-head">
        <span className="ai-find-title">AI 찾기</span>
        <span className="ai-find-tag">조각 4</span>
      </div>
      <div className="ai-find-empty">
        <MiniMole />
        <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.55 }}>
          여기서 트리를 근거로<br />질문에 답합니다.
        </div>
        <div style={{ fontSize: 11.5, color: "var(--hold)", lineHeight: 1.5 }}>
          답에는 <b>근거 룰</b>과<br /><b>저작자</b>가 함께 붙어요.<br />조각 4에서 실체가 됩니다.
        </div>
      </div>
    </aside>
  );
}

function MiniMole() {
  return (
    <svg viewBox="0 0 150 132" style={{ width: 96, height: 84, opacity: 0.7 }}>
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
