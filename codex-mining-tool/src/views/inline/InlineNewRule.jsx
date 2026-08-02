import { useEffect, useRef, useState } from "react";
import { normalizeRule } from "../../core/schema.js";
import { addRules } from "../../core/store.js";
import { stampAuthoring, NoAuthorError } from "../../core/authoring.js";
import { suggestPath, friendlyError } from "../../api.js";
import { buildPathSuggestPrompt } from "../../prompt.js";
import KindPicker from "./KindPicker.jsx";

// 인라인 새 룰 입력창 (v0.3 조각 3, CLAUDE.md 6.1).
// - initialPath 길이에 따라 대·중·항목 입력이 채워짐/편집 가능.
// - 판단문 하나 필수. 엔터 = 저장, Esc = 취소.
// - 저장 실패(NoAuthorError) → onRequireAuthor() 호출, 입력창은 열린 채 유지.
// - v0.3 조각 5: 판단문 입력 후 [✨ AI에 path 제안받기] 버튼 → 3개 후보 카드.
//   API 키·트리 없으면 비활성. taxonomy 진화의 엔진(CLAUDE.md 4.5).
export default function InlineNewRule({
  initialPath = [],
  onSaved,
  onCancel,
  onRequireAuthor,
  apiKey,
  treeRules = [],
}) {
  const [major, setMajor] = useState(initialPath[0] || "");
  const [minor, setMinor] = useState(initialPath[1] || "");
  const [item, setItem] = useState(initialPath[2] || "");
  const [judgment, setJudgment] = useState("");
  const [kind, setKind] = useState("soft");
  const [error, setError] = useState("");

  // AI 제안 상태
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null); // null | [{path, reason, is_new_major}]
  const [suggestError, setSuggestError] = useState("");

  const judgmentRef = useRef(null);
  const majorRef = useRef(null);

  useEffect(() => {
    if (!initialPath.length && majorRef.current) majorRef.current.focus();
    else if (judgmentRef.current) judgmentRef.current.focus();
  }, [initialPath.length]);

  // initialPath에 값이 있으면 "자동 채움 힌트"로 표시(fixed 스타일)만 하고,
  // 편집은 열어둔다 — 위키의 성질(3장-9): 자동으로 채워졌더라도 사람이 override 가능.
  const majorAuto = initialPath.length >= 1;
  const minorAuto = initialPath.length >= 2;
  const canSave = major.trim() && judgment.trim();

  // 제안 버튼 활성 조건
  const canSuggest =
    !!judgment.trim() && !!apiKey && Array.isArray(treeRules) && treeRules.length > 0;
  const suggestDisabledHint = !judgment.trim()
    ? "판단문을 먼저 써주세요"
    : !apiKey
    ? "⚙ 설정에서 API 키를 넣어주세요"
    : !treeRules?.length
    ? "기존 트리가 있어야 제안 가능 — 첫 판단은 축을 직접 잡아주세요"
    : "";

  async function askSuggest() {
    if (!canSuggest || suggesting) return;
    setSuggesting(true);
    setSuggestError("");
    setSuggestions(null);
    try {
      const prompt = buildPathSuggestPrompt(judgment, treeRules, initialPath);
      const raw = await suggestPath({ apiKey, prompt });
      const list = Array.isArray(raw?.suggestions) ? raw.suggestions : [];
      // 안전장치: path가 배열이고 최소 1단 이상인 것만
      const safe = list
        .filter((s) => Array.isArray(s?.path) && s.path.length >= 1)
        .map((s) => ({
          path: s.path.map((p) => String(p || "").trim()).filter(Boolean),
          reason: String(s.reason || "").trim(),
          is_new_major: !!s.is_new_major,
        }))
        .filter((s) => s.path.length >= 1)
        .slice(0, 3);
      setSuggestions(safe);
      if (safe.length === 0) setSuggestError("제안이 비어 있어요. 직접 입력해 주세요.");
    } catch (err) {
      const f = friendlyError(err);
      setSuggestError(f?.title ? `${f.title} — ${f.msg}` : String(err));
    } finally {
      setSuggesting(false);
    }
  }

  function acceptSuggestion(s) {
    // 자동채움된 값이 있어도 override 허용. AI 제안은 새 값을 그대로 반영한다.
    setMajor(s.path[0] || "");
    setMinor(s.path[1] || "");
    setItem(s.path[2] || "");
    setSuggestions(null);
  }

  function submit() {
    if (!canSave) return;
    setError("");
    const path = [major, minor, item].map((s) => s.trim()).filter(Boolean);
    const raw = normalizeRule({
      path,
      judgment: judgment.trim(),
      kind,
      origin: "인라인 편집",
      status: "candidate",
    });
    try {
      const stamped = stampAuthoring(raw, "인라인 편집으로 등재");
      const newTree = addRules([stamped]);
      onSaved && onSaved(newTree, stamped);
    } catch (err) {
      if (err instanceof NoAuthorError) {
        setError("⚙ 설정에서 내 이름을 먼저 넣어주세요.");
        onRequireAuthor && onRequireAuthor();
      } else {
        setError("저장 실패: " + (err?.message || String(err)));
      }
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel && onCancel();
    }
  }

  return (
    <div className="inline-new-rule" onKeyDown={handleKey}>
      <div className="inr-path-row">
        <input
          ref={majorRef}
          className={"field inr-path" + (majorAuto ? " auto" : "")}
          placeholder="대분류 *"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          title={majorAuto ? "자동 채움 · 클릭해서 override 가능" : ""}
        />
        <span className="sep">/</span>
        <input
          className={"field inr-path" + (minorAuto ? " auto" : "")}
          placeholder="중분류"
          value={minor}
          onChange={(e) => setMinor(e.target.value)}
          title={minorAuto ? "자동 채움 · 클릭해서 override 가능" : ""}
        />
        <span className="sep">/</span>
        <input
          className="field inr-path"
          placeholder="항목"
          value={item}
          onChange={(e) => setItem(e.target.value)}
        />
      </div>
      <input
        ref={judgmentRef}
        className="field inr-judgment"
        placeholder="판단 한 문장 · 엔터로 심기"
        value={judgment}
        onChange={(e) => setJudgment(e.target.value)}
      />

      {/* v0.3 조각 5 — AI path 제안 */}
      <div className="inr-suggest-row">
        <button
          type="button"
          className="inr-suggest-btn"
          onClick={askSuggest}
          disabled={!canSuggest || suggesting}
          title={suggestDisabledHint || "AI가 트리 근거로 path 3개를 제안"}
        >
          {suggesting ? "제안 중…" : "✨ AI에 path 제안받기"}
        </button>
        {!canSuggest && suggestDisabledHint && (
          <span className="inr-suggest-hint">{suggestDisabledHint}</span>
        )}
      </div>

      {suggestError && <div className="inr-suggest-error">{suggestError}</div>}

      {Array.isArray(suggestions) && suggestions.length > 0 && (
        <div className="inr-suggestions">
          <div className="inr-suggestions-label">
            AI 제안 · 클릭해서 채우기 (수정 가능)
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="inr-suggest-card"
              onClick={() => acceptSuggestion(s)}
            >
              {s.is_new_major && (
                <span className="inr-suggest-badge">★ 새 대분류</span>
              )}
              <div className="inr-suggest-path">
                {s.path.map((p, pi) => (
                  <span key={pi}>
                    {pi > 0 && <span className="inr-suggest-sep"> › </span>}
                    <span className={pi === 0 ? "inr-suggest-major" : ""}>{p}</span>
                  </span>
                ))}
              </div>
              {s.reason && <div className="inr-suggest-reason">→ {s.reason}</div>}
            </button>
          ))}
        </div>
      )}

      <div className="inr-bottom">
        <KindPicker value={kind} onChange={setKind} />
        <div className="inr-actions">
          <button type="button" className="inr-btn ghost" onClick={onCancel}>
            취소 (Esc)
          </button>
          <button type="button" className="inr-btn primary" onClick={submit} disabled={!canSave}>
            심기 (Enter)
          </button>
        </div>
      </div>
      {error ? <div className="inr-error">{error}</div> : null}
    </div>
  );
}
