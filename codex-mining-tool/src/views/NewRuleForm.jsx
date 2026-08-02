import { useEffect, useRef, useState } from "react";
import { normalizeRule } from "../core/schema.js";
import { addRules } from "../core/store.js";
import { stampAuthoring, NoAuthorError } from "../core/authoring.js";
import { UNCATEGORIZED } from "../core/categories.js";
import { suggestPath, friendlyError } from "../api.js";
import { buildPathSuggestPrompt } from "../prompt.js";
import KindPicker from "./inline/KindPicker.jsx";

// 새 판단 만들기 폼 (CLAUDE.md v0.4 6.2 · 10.7).
// 상단 nav [지식 넣기] → 룰 페이지 자리에 이 폼이 뜬다.
// 카테고리(대·중분류)는 codex_categories에서만 선택 — 자유 발명 금지(원칙 11).
export default function NewRuleForm({
  categoriesDoc,
  apiKey,
  onSaved,
  onCancel,
  onOpenCategorySetup,
  onRequireAuthor,
}) {
  const [major, setMajor] = useState("");
  const [minor, setMinor] = useState("");
  const [item, setItem] = useState("");
  const [judgment, setJudgment] = useState("");
  const [kind, setKind] = useState("soft");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  // v0.4 조각 6e — AI path 제안 (카테고리 안에서만)
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestError, setSuggestError] = useState("");

  const judgmentRef = useRef(null);
  useEffect(() => {
    if (judgmentRef.current) judgmentRef.current.focus();
  }, []);

  const cats = categoriesDoc?.categories || [];
  const hasCats = cats.length > 0;
  const majorNode = cats.find((c) => c.name === major);
  const availableMinors = majorNode?.subs || [];

  // 카테고리 없음 → 시작 발판 유도
  if (!hasCats) {
    return (
      <main className="rule-page nrf">
        <div className="nrf-head">
          <h2 className="nrf-title">새 판단 만들기</h2>
          <button className="nrf-cancel" onClick={onCancel}>
            취소
          </button>
        </div>
        <div className="nrf-empty">
          <div className="nrf-empty-title">먼저 카테고리를 정하세요</div>
          <div className="nrf-empty-desc">
            새 판단을 심으려면 대·중분류 카테고리가 필요합니다.<br />
            [카테고리 설정]에서 시작 발판을 불러오거나 직접 만들어보세요.
          </div>
          <button className="nrf-empty-btn" onClick={onOpenCategorySetup}>
            카테고리 설정
          </button>
        </div>
      </main>
    );
  }

  function onChangeMajor(v) {
    setMajor(v);
    const node = cats.find((c) => c.name === v);
    if (!node || !node.subs.includes(minor)) setMinor("");
  }

  const canSave = major.trim() && judgment.trim();
  const canSuggest = !!judgment.trim() && !!apiKey && hasCats;
  const suggestDisabledHint = !judgment.trim()
    ? "판단문을 먼저 써주세요"
    : !apiKey
    ? "⚙ 설정에서 API 키를 넣어주세요"
    : !hasCats
    ? "카테고리를 먼저 정하세요"
    : "";

  async function askSuggest() {
    if (!canSuggest || suggesting) return;
    setSuggesting(true);
    setSuggestError("");
    setSuggestions(null);
    try {
      const initialPath = [major, minor, item].filter(Boolean);
      const prompt = buildPathSuggestPrompt(judgment, categoriesDoc, initialPath);
      const raw = await suggestPath({ apiKey, prompt });
      const list = Array.isArray(raw?.suggestions) ? raw.suggestions : [];
      // 카테고리 안에 있는 대분류만 통과 (안전장치). 미분류도 통과.
      const validMajors = new Set([UNCATEGORIZED, ...cats.map((c) => c.name)]);
      const safe = list
        .filter((s) => Array.isArray(s?.path) && s.path.length >= 1)
        .map((s) => ({
          path: s.path.map((p) => String(p || "").trim()).filter(Boolean),
          reason: String(s.reason || "").trim(),
        }))
        .filter((s) => s.path.length >= 1 && validMajors.has(s.path[0]))
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
      note: note.trim(),
      summary: summary.trim(),
      origin: "새 룰",
      status: "candidate",
    });
    try {
      const stamped = stampAuthoring(raw, "새 룰 등재");
      const newTree = addRules([stamped], categoriesDoc);
      // 저장된 룰을 찾아 selectedRule로 세팅(merge에 의해 id·path가 살아있는 것)
      const stored =
        newTree.find(
          (r) => r.judgment === stamped.judgment && r.path.join("␟") === stamped.path.join("␟")
        ) || stamped;
      onSaved && onSaved(newTree, stored);
    } catch (err) {
      if (err instanceof NoAuthorError) {
        setError("⚙ 설정에서 내 이름을 먼저 넣어주세요.");
        onRequireAuthor && onRequireAuthor();
      } else {
        setError("저장 실패: " + (err?.message || String(err)));
      }
    }
  }

  return (
    <main className="rule-page nrf">
      <div className="nrf-head">
        <h2 className="nrf-title">새 판단 만들기</h2>
        <button className="nrf-cancel" onClick={onCancel}>
          취소
        </button>
      </div>

      <div className="nrf-form">
        <div className="nrf-row">
          <label className="nrf-label">카테고리 *</label>
          <div className="nrf-path-selects">
            <select
              className="rp-path-select"
              value={major}
              onChange={(e) => onChangeMajor(e.target.value)}
            >
              <option value="">대분류…</option>
              {cats.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
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
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="rp-path-sep">›</span>
            <input
              className="rp-path-input"
              type="text"
              placeholder="항목 (선택)"
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </div>
        </div>

        <div className="nrf-row">
          <label className="nrf-label">판단 *</label>
          <textarea
            ref={judgmentRef}
            className="nrf-judgment"
            placeholder="한 문장으로 · 예: 배상 상한은 계약 총액 이내로 묶는다"
            value={judgment}
            onChange={(e) => setJudgment(e.target.value)}
            rows={3}
          />
        </div>

        {/* v0.4 조각 6e — AI path 제안 (카테고리 안에서만) */}
        <div className="inr-suggest-row nrf-suggest-row">
          <button
            type="button"
            className="inr-suggest-btn"
            onClick={askSuggest}
            disabled={!canSuggest || suggesting}
            title={suggestDisabledHint || "AI가 카테고리 안에서 path 3개를 제안"}
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

        <div className="nrf-row">
          <label className="nrf-label">강도</label>
          <KindPicker value={kind} onChange={setKind} />
        </div>

        <div className="nrf-row">
          <label className="nrf-label">근거·양보 이력 (선택)</label>
          <input
            className="nrf-note"
            type="text"
            placeholder="한 줄 · 예: 양보 0 · 한 번도 안 내줌"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="nrf-row">
          <label className="nrf-label">요약 (선택)</label>
          <textarea
            className="nrf-summary"
            placeholder="배경·논리를 여러 줄로. 나중 검토에 쓰여요."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
          />
        </div>

        {error && <div className="nrf-error">{error}</div>}

        <div className="nrf-actions">
          <button className="nrf-cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button className="nrf-save" onClick={submit} disabled={!canSave}>
            + 트리에 심기
          </button>
        </div>
      </div>
    </main>
  );
}
