import { useEffect, useMemo, useRef, useState } from "react";
import { KIND_COLOR } from "../core/schema.js";
import { askAi, friendlyError } from "../api.js";
import { buildAiFindPrompt } from "../prompt.js";

// 우측 AI 찾기 (CLAUDE.md v0.4 7.2 · 10.5).
// 채팅 버블 흐름 — 사용자/AI 대화 이력. 답 안에 근거 pill(색 dot + 짧은 이름 + credit).
// 근거 없으면 회색 hold 배너. 하단 Cody가 상태별 안내.
// 미탐 우선 · 인용하지 창작 안 함.
export default function AiFindPanel({
  apiKey,
  rules,
  aiQuery,
  aiTrigger,
  onSelectRule,
  onOpenSettings,
}) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("idle"); // idle | asking | error
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]); // 세션 대화 이력
  const messagesEndRef = useRef(null);

  const rulesById = useMemo(
    () => new Map((rules || []).map((r) => [r.id, r])),
    [rules]
  );

  // 검색바 승격 자동 실행
  useEffect(() => {
    if (!aiTrigger) return;
    const q = (aiQuery || "").trim();
    if (!q) return;
    setTimeout(() => runAsk(q), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTrigger]);

  // 새 메시지 or 상태 변화 시 하단으로 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, status]);

  async function runAsk(q) {
    const query = (q || "").trim();
    if (!query) return;
    setError(null);
    if (!apiKey) {
      setError({
        title: "API 키가 필요해요",
        msg: "AI 찾기는 Anthropic API 키가 필요합니다. ⚙ 설정에서 넣어주세요.",
      });
      return;
    }
    if (!rules?.length) {
      setError({
        title: "근거가 없어요",
        msg: "심어진 판단이 없어 답할 근거가 없어요. 상단 [지식 넣기]로 시작해보세요.",
      });
      return;
    }

    // 사용자 메시지 추가
    const now = Date.now();
    setMessages((m) => [
      ...m,
      { id: "msg-" + now + "-u", role: "user", text: query, at: new Date().toISOString() },
    ]);
    setStatus("asking");

    try {
      const prompt = buildAiFindPrompt(query, rules);
      const raw = await askAi({ apiKey, prompt });
      const gotAnswer = String(raw?.answer || "").trim() || "(답이 비어 있어요)";
      const gotBasis = Array.isArray(raw?.basis) ? raw.basis : [];
      const knownIds = new Set(rules.map((r) => r.id));
      const safeBasis = gotBasis.filter((b) => b?.rule_id && knownIds.has(b.rule_id));
      const verdict =
        raw?.verdict === "answered" && safeBasis.length > 0 ? "answered" : "hold";
      setMessages((m) => [
        ...m,
        {
          id: "msg-" + Date.now() + "-a",
          role: "ai",
          text: gotAnswer,
          basis: safeBasis,
          verdict,
          at: new Date().toISOString(),
        },
      ]);
      setStatus("idle");
    } catch (err) {
      const f = friendlyError(err);
      setMessages((m) => [
        ...m,
        {
          id: "msg-" + Date.now() + "-a",
          role: "ai",
          text: `${f.title || "오류"} — ${f.msg || String(err)}`,
          error: true,
          at: new Date().toISOString(),
        },
      ]);
      setStatus("error");
    }
  }

  function submit() {
    const q = question.trim();
    if (!q) return;
    runAsk(q);
    setQuestion("");
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const codyLine = pickCodyLine(status, messages);

  return (
    <aside className="ai-find-panel">
      <div className="af-head af-head-v2">
        <span className="af-title">AI 찾기</span>
        <span className="af-sub">우리 판단에서만 답을 찾습니다</span>
      </div>

      <div className="af-search-input">
        <input
          type="text"
          className="af-search-inner"
          placeholder="무엇을 확인할까요?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKey}
        />
        <span className="af-enter-hint">↵</span>
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

      <div className="af-messages">
        {messages.length === 0 && status === "idle" && !error && (
          <div className="af-empty-hint">
            예: <b>"우리 배상 상한 방침?"</b><br />
            <span style={{ color: "var(--hold)" }}>
              트리 근거로만 답합니다. 없는 건 <b>보류</b>로.
            </span>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <UserBubble key={m.id} msg={m} />
          ) : (
            <AiBubble
              key={m.id}
              msg={m}
              rulesById={rulesById}
              onSelectRule={onSelectRule}
            />
          )
        )}

        {status === "asking" && <LoadingBubble />}

        <div ref={messagesEndRef} />
      </div>

      <div className="af-cody-row">
        <MiniMole />
        <div className="af-cody-bubble">{codyLine}</div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────
// 서브 컴포넌트
// ────────────────────────────────────────────

function UserBubble({ msg }) {
  return <div className="af-bubble af-bubble-user">{msg.text}</div>;
}

function AiBubble({ msg, rulesById, onSelectRule }) {
  const isHold = msg.verdict === "hold" || !(msg.basis?.length);
  return (
    <div
      className={"af-bubble af-bubble-ai" + (msg.error ? " error" : "")}
    >
      <div className="af-bubble-text">{msg.text}</div>
      {isHold && !msg.error && (
        <div className="af-hold-inline">⚠ 확정 기준 없음 · 사람 확인 필요</div>
      )}
      {msg.basis?.length > 0 && (
        <div className="af-basis-inline">
          <span className="af-basis-label">근거 :</span>
          {msg.basis.map((b, i) => {
            const rule = rulesById.get(b.rule_id);
            if (!rule) return null;
            const color = KIND_COLOR[rule.kind];
            const originTag = rule?.tags?.["원천"];
            const deptTag = rule?.tags?.["의뢰부서"];
            const tagLabel = [originTag, deptTag].filter(Boolean).join(" · ");
            return (
              <button
                key={b.rule_id + i}
                className="af-basis-pill"
                style={{ borderColor: color }}
                onClick={() => onSelectRule && onSelectRule(rule.id)}
                title={b.why || rule.judgment}
              >
                <span
                  className="af-basis-dot"
                  style={{
                    background: rule.kind === "hold" ? "transparent" : color,
                    borderColor: color,
                    borderStyle: rule.kind === "hold" ? "dashed" : "solid",
                  }}
                />
                <span className="af-basis-name">{ruleShort(rule)}</span>
                <span className="af-basis-credit">{formatCredit(rule)}</span>
                {tagLabel && <span className="af-basis-tag">{tagLabel}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="af-bubble af-bubble-ai af-loading-bubble">
      <span className="af-loading-dot" />
      <span>트리를 근거로 답을 정리 중…</span>
    </div>
  );
}

function pickCodyLine(status, messages) {
  if (status === "error") return "잠깐 문제가 있어요";
  if (status === "asking") return "트리를 근거로 찾고 있어요…";
  const last = messages[messages.length - 1];
  if (last?.role === "ai" && last.verdict === "hold")
    return "확정 기준이 없어요 — 사람 확인이 필요해요";
  if (last?.role === "ai") return "근거가 있는 것만 답해요. 없으면 없다고 말할게요 🔦";
  return "무엇이 궁금하세요? 우리 판단에서만 찾을게요";
}

function ruleShort(rule) {
  return (
    rule.path?.[2] ||
    rule.path?.[1] ||
    rule.path?.[0] ||
    (rule.judgment || "").slice(0, 18)
  );
}

function formatCredit(rule) {
  const author = rule.authors?.[0]?.name || "";
  const at =
    rule.provenance?.extracted_at ||
    rule.authors?.[0]?.at ||
    rule.created_at ||
    "";
  if (!at) return author;
  const t = Date.parse(at);
  if (Number.isNaN(t)) return author;
  const m = new Date(t).getMonth() + 1;
  return author ? `${author}, ${m}월` : `${m}월`;
}

function MiniMole() {
  return (
    <svg viewBox="0 0 150 132" style={{ width: 60, height: 53, flex: "none" }}>
      <path d="M6 120 C4 100 26 88 44 94 C54 78 96 78 106 94 C126 88 146 100 144 120 Z" fill="#E3CBA4" stroke="#14171C" strokeWidth="3.6" strokeLinejoin="round" />
      <path d="M34 108 C28 58 48 30 75 30 C102 30 122 58 116 108 Z" fill="#7A5A44" stroke="#14171C" strokeWidth="3.6" strokeLinejoin="round" />
      <g stroke="#14171C" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M40 80 L14 74 M40 88 L12 88 M110 80 L136 74 M110 88 L138 88" />
        <path d="M46 46 C58 30 92 30 104 46" strokeWidth="3" />
      </g>
      <circle cx="75" cy="28" r="10" fill="#C8871F" stroke="#14171C" strokeWidth="3" />
      <circle cx="75" cy="28" r="3.4" fill="#F5F6F3" />
      <g fill="none" stroke="#14171C" strokeWidth="2.8">
        <circle cx="60" cy="70" r="11" fill="rgba(245,246,243,.28)" />
        <circle cx="90" cy="70" r="11" fill="rgba(245,246,243,.28)" />
        <path d="M71 70 h8" />
      </g>
      <ellipse cx="60" cy="72" rx="3.4" ry="4.6" fill="#14171C" />
      <ellipse cx="90" cy="72" rx="3.4" ry="4.6" fill="#14171C" />
      <ellipse cx="75" cy="85" rx="6" ry="4.6" fill="#9E3524" stroke="#14171C" strokeWidth="2.6" />
    </svg>
  );
}
