// 코디 — 헤드램프 두더지 도슨트. 데모 SVG 재사용.
// state: "idle" | "mining" | "done" | "error"
export default function Cody({ state = "idle", line, width = 132 }) {
  const digging = state === "mining";
  const done = state === "done";
  const worried = state === "error";
  const pickAnim = digging ? "cx-dig 900ms ease-in-out infinite" : "none";
  const bodyAnim = digging ? "cx-dig 1400ms ease-in-out infinite" : "none";

  return (
    <div className="cody-row">
      <div className="cody-svg" style={{ width, animation: bodyAnim, transformOrigin: "75px 120px" }}>
        <svg viewBox="0 0 150 132" style={{ width: width + 20, height: (width + 20) * 0.88, display: "block", overflow: "visible" }}>
          {/* 흙더미 */}
          <path d="M6 120 C4 100 26 88 44 94 C54 78 96 78 106 94 C126 88 146 100 144 120 Z" fill="#E3CBA4" stroke="#14171C" strokeWidth="3.4" strokeLinejoin="round" />
          {/* 몸통 */}
          <path d="M34 108 C28 58 48 30 75 30 C102 30 122 58 116 108 Z" fill="#7A5A44" stroke="#14171C" strokeWidth="3.4" strokeLinejoin="round" />
          {/* 수염 */}
          <g stroke="#14171C" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M40 80 L14 74 M40 88 L12 88 M42 96 L16 102" />
            <path d="M110 80 L136 74 M110 88 L138 88 M108 96 L134 102" />
          </g>
          {/* 헤드램프 밴드 */}
          <g stroke="#14171C" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M46 46 C58 30 92 30 104 46" />
          </g>
          {/* 램프 */}
          <circle cx="75" cy="28" r="10" fill="#C8871F" stroke="#14171C" strokeWidth="3" />
          <circle cx="75" cy="28" r="3.4" fill="#F5F6F3" />
          {/* 고글 */}
          <g fill="none" stroke="#14171C" strokeWidth="2.6">
            <circle cx="60" cy="70" r="11" fill="rgba(245,246,243,.28)" />
            <circle cx="90" cy="70" r="11" fill="rgba(245,246,243,.28)" />
            <path d="M71 70 h8" />
            {done && <path d="M55 70 q5 -5 10 0 M85 70 q5 -5 10 0" strokeWidth="2.4" />}
          </g>
          {!done && (
            <>
              <ellipse cx="60" cy="70" rx="3.4" ry="4.6" fill="#14171C" />
              <ellipse cx="90" cy="70" rx="3.4" ry="4.6" fill="#14171C" />
            </>
          )}
          {/* 코 */}
          <ellipse cx="75" cy="85" rx="6" ry="4.6" fill="#9E3524" stroke="#14171C" strokeWidth="2.4" />
          {/* 볼 */}
          <circle cx="67" cy="94" r="9.5" fill="#F5F6F3" stroke="#14171C" strokeWidth="2.6" />
          <circle cx="83" cy="94" r="9.5" fill="#F5F6F3" stroke="#14171C" strokeWidth="2.6" />
          {/* 손 */}
          <path d="M40 100 C30 100 26 112 34 120 C42 124 52 118 52 110 Z" fill="#6B4C39" stroke="#14171C" strokeWidth="3.2" strokeLinejoin="round" />
          <path d="M110 100 C120 100 124 112 116 120 C108 124 98 118 98 110 Z" fill="#6B4C39" stroke="#14171C" strokeWidth="3.2" strokeLinejoin="round" />
          {/* 곡괭이 (채굴 중 흔들림) */}
          <g style={{ transformOrigin: "116px 108px", animation: pickAnim }}>
            <path d="M116 108 L132 66" stroke="#7A5A44" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M123 66 q10 -9 18 4" stroke="#14171C" strokeWidth="3.4" strokeLinecap="round" fill="#C8871F" />
          </g>
          {/* 땀 (채굴 중) */}
          {digging && <path d="M116 44 q5 8 0 12 q-6 -4 0 -12" fill="#2FA97F" stroke="#14171C" strokeWidth="2" />}
          {/* 물음표 (에러/보류 느낌) */}
          {worried && (
            <text x="120" y="34" fontFamily="IBM Plex Mono, monospace" fontSize="26" fontWeight="600" fill="#8A9086">?</text>
          )}
        </svg>
      </div>
      <div className="cody-bubble">
        {line}
        <div className="tail" />
      </div>
    </div>
  );
}
