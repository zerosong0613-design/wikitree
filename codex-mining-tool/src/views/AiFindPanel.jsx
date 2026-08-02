import { useEffect, useState } from "react";
import { KIND_COLOR, KIND_FG } from "../core/schema.js";
import { askAi, friendlyError } from "../api.js";
import { buildAiFindPrompt } from "../prompt.js";

// 우측 AI 찾기 (CLAUDE.md 7.2 · 10.1).
// - 트리를 근거로 답. 근거 룰 링크 + 저작자 밝힘.
// - 트리에 근거 없으면 verdict="hold" → "확정 기준 없음(보류)".
// - 상단 검색바 엔터 → aiQuery/aiTrigger로 승격 → 자동 실행.
export default function AiFindPanel({
  apiKey,
  rules,
  aiQuery,
  aiTrigger,
  onSelectRule,
  onOpenSettings,
}) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("idle"); // idle | asking | answered | hold | error
  const [answer, setAnswer] = useState("");
  const [basis, setBasis] = useState([]); // [{rule_id, why}]
  const [error, setError] = useState(null); // {title, msg} | null

  // 검색바에서 승격된 질문 → 자동 실행
  useEffect(() => {
    if (!aiTrigger) return;
    const q = (aiQuery || "").trim();
    if (!q) return;
    setQuestion(q);
    // rules/apiKey는 ask() 안에서 다시 참조 — 아래 함수 정의 이후 setTimeout으로 실행 순서 보장
    setTimeout(() => runAsk(q), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTrigger]);

  async function runAsk(q) {
    const query = (q || "").trim();
    if (!query) return;
    setError(null);
    if (!apiKey) {
      setError({
        title: "API 키가 필요해요",
        msg: "AI 찾기는 Anthropic API 키가 필요합니다. ⚙ 설정에서 넣어주세요.",
      });
      setStatus("error");
      return;
    }
    if (!rules?.length) {
      setError({
        title: "근거가 없어요",
        msg: "심어진 판단이 없어 답할 근거가 없어요. 목차의 + 새 판단으로 시작해보세요.",
      });
      setStatus("error");
      return;
    }
    setStatus("asking");
    setAnswer("");
    setBasis([]);
    try {
      const prompt = buildAiFindPrompt(query, rules);
      const raw = await askAi({ apiKey, prompt });
      const gotAnswer = String(raw?.answer || "").trim() || "(답이 비어 있어요)";
      const gotBasis = Array.isArray(raw?.basis) ? raw.basis : [];
      // 안전장치: AI가 없는 rule_id를 지어내면 필터
      const knownIds = new Set(rules.map((r) => r.id));
      const safeBasis = gotBasis.filter((b) => b?.rule_id && knownIds.has(b.rule_id));
      const verdict = raw?.verdict === "answered" && safeBasis.length > 0 ? "answered" : "hold";
      setAnswer(gotAnswer);
      setBasis(safeBasis);
      setStatus(verdict);
    } catch (err) {
      setError(friendlyError(err));
      setStatus("error");
    }
  }

  function submit() {
    runAsk(question);
  }

  function onKey(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  }

  const rulesById = new Map(rules?.map((r) => [r.id, r]) || []);

  return (
    <aside className="ai-find-panel">
      <div className="ai-find-head">
        <span className="ai-find-title">AI 찾기</span>
        <span className="ai-find-status">
          {status === "asking" && "묻는 중…"}
          {status === "answered" && `근거 ${basis.length}`}
          {status === "hold" && "보류"}
          {status === "error" && "오류"}
          {status === "idle" && "대기"}
        </span>
      </div>

      <div className="af-ask">
        <textarea
          className="field af-q"
          placeholder="트리를 근거로 물어봐요.  (Ctrl+Enter 전송)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKey}
          rows={3}
        />
        <button
          className="af-send"
          onClick={submit}
          disabled={status === "asking" || !question.trim()}
        >
          {status === "asking" ? "…" : "묻기"}
        </button>
      </div>

      {error && (
        <div className="af-error">
          <div className="af-error-title">{error.title}</div>
          <div className="af-error-msg">{error.msg}</div>
          {error.title?.includes("API") && (
            <button className="link-btn" onClick={onOpenSettings}>
              ⚙ 설정 열기
            </button>
          )}
        </div>
      )}

      {status === "asking" && (
        <div className="af-loading">
          <div className="af-loading-dot" />
          <span>트리를 근거로 답을 정리 중…</span>
        </div>
      )}

      {(status === "answered" || status === "hold") && (
        <div className="af-result">
          {status === "hold" && (
            <div className="af-hold-banner">
              확정 기준 없음 <b>(보류)</b> — 트리에 이 질문의 답이 될 확실한 근거가 없어요.
            </div>
          )}
          <div className="af-answer">{answer}</div>

          {basis.length > 0 && (
            <div className="af-basis">
              <div className="af-basis-label">근거 · {basis.length}개</div>
              {basis.map((b, i) => {
                const rule = rulesById.get(b.rule_id);
                if (!rule) return null;
                const isHold = rule.kind === "hold";
                const color = KIND_COLOR[rule.kind];
                const fg = KIND_FG[rule.kind];
                const authorNames = (rule.authors || [])
                  .map((a) => a.name)
                  .filter(Boolean);
                return (
                  <button
                    key={b.rule_id + i}
                    className="af-basis-card"
                    onClick={() => onSelectRule && onSelectRule(rule.id)}
                    title="클릭 → 중앙 룰 페이지"
                  >
                    <div className="af-basis-top">
                      <span
                        className="af-basis-kind"
                        style={{
                          background: color,
                          color: fg,
                          borderStyle: isHold ? "dashed" : "solid",
                        }}
                      >
                        {rule.strength_label}
                      </span>
                      <span className="af-basis-path">
                        {rule.path.join(" › ")}
                      </span>
                    </div>
                    <div className="af-basis-judgment">{rule.judgment}</div>
                    <div className="af-basis-why">→ {b.why}</div>
                    {authorNames.length > 0 && (
                      <div className="af-basis-authors">
                        {authorNames.join(", ")}이(가) 정한 기준
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {status === "idle" && (
        <div className="af-idle-hint">
          예: "우리 배상 상한 방침?" · "AI 학습 데이터 조항은?"<br />
          <span style={{ color: "var(--hold)" }}>
            트리 근거로만 답합니다. 없는 건 <b>보류</b>로.
          </span>
        </div>
      )}
    </aside>
  );
}
