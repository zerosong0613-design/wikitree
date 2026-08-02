import { useEffect, useRef, useState } from "react";
import { normalizeRule } from "../core/schema.js";
import { addRules } from "../core/store.js";
import { stampAuthoring, NoAuthorError } from "../core/authoring.js";
import { UNCATEGORIZED } from "../core/categories.js";
import { suggestPath, friendlyError } from "../api.js";
import { buildTagsSuggestPrompt } from "../prompt.js";
import KindPicker from "./inline/KindPicker.jsx";

// 새 판단 만들기 폼 (CLAUDE.md v0.5 6.2 · 10.7).
// v0.5: 판단(path) + 원천·의뢰부서 드롭다운 + 주제 pills + contract_view(원천=계약).
// AI 축 제안이 4축 모두 제안.
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

  // v0.5 조각 7e — 태그 다축
  const [origin, setOrigin] = useState("");
  const [dept, setDept] = useState("");
  const [topics, setTopics] = useState([]);
  const [topicDraft, setTopicDraft] = useState("");
  const [contractType, setContractType] = useState("");
  const [contractGroup, setContractGroup] = useState("");
  const [article, setArticle] = useState("");
  const [articleTitle, setArticleTitle] = useState("");

  // AI 제안
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestError, setSuggestError] = useState("");

  const judgmentRef = useRef(null);
  useEffect(() => {
    if (judgmentRef.current) judgmentRef.current.focus();
  }, []);

  const 판단 = categoriesDoc?.["판단"] || [];
  const 원천Cats = categoriesDoc?.["원천"] || [];
  const 부서Cats = categoriesDoc?.["의뢰부서"] || [];
  const hasCats = 판단.length > 0;
  const majorNode = 판단.find((c) => c.name === major);
  const availableMinors = majorNode?.subs || [];

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
            새 판단을 심으려면 판단 축 카테고리가 필요합니다.<br />
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
    const node = 판단.find((c) => c.name === v);
    if (!node || !node.subs.includes(minor)) setMinor("");
  }

  function onChangeOrigin(v) {
    setOrigin(v);
    // 원천이 "계약"이 아니게 되면 contract_view 필드도 자동 비움
    if (v !== "계약") {
      setContractType("");
      setContractGroup("");
      setArticle("");
      setArticleTitle("");
    }
  }

  function addTopic() {
    const v = topicDraft.trim();
    if (!v) return;
    if (topics.includes(v)) {
      setTopicDraft("");
      return;
    }
    setTopics([...topics, v]);
    setTopicDraft("");
  }

  function removeTopic(t) {
    setTopics(topics.filter((x) => x !== t));
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
      const initialTags = { 원천: origin || null, 의뢰부서: dept || null, 주제: topics };
      const prompt = buildTagsSuggestPrompt(judgment, categoriesDoc, initialPath, initialTags);
      const raw = await suggestPath({ apiKey, prompt });
      const list = Array.isArray(raw?.suggestions) ? raw.suggestions : [];
      const validMajors = new Set([UNCATEGORIZED, ...판단.map((c) => c.name)]);
      const validOrigins = new Set(원천Cats.map((c) => c.name));
      const validDepts = new Set(부서Cats.map((c) => c.name));
      const safe = list
        .filter((s) => Array.isArray(s?.path) && s.path.length >= 1)
        .map((s) => {
          const path = s.path.map((p) => String(p || "").trim()).filter(Boolean);
          const t = s.tags || {};
          const 원천 = t["원천"] && validOrigins.has(t["원천"]) ? t["원천"] : null;
          const 의뢰부서 = t["의뢰부서"] && validDepts.has(t["의뢰부서"]) ? t["의뢰부서"] : null;
          const 주제 = Array.isArray(t["주제"])
            ? t["주제"].map((x) => String(x || "").trim()).filter(Boolean)
            : [];
          const cv = 원천 === "계약" ? s.contract_view || null : null;
          return {
            path,
            tags: { 원천, 의뢰부서, 주제 },
            contract_view: cv,
            reason: String(s.reason || "").trim(),
          };
        })
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
    setOrigin(s.tags?.["원천"] || "");
    setDept(s.tags?.["의뢰부서"] || "");
    setTopics(Array.isArray(s.tags?.["주제"]) ? s.tags["주제"] : []);
    if (s.tags?.["원천"] === "계약" && s.contract_view) {
      setContractType(s.contract_view.contract_type || "");
      setContractGroup(s.contract_view.contract_group || "");
      setArticle(s.contract_view.article || "");
      setArticleTitle(s.contract_view.article_title || "");
    } else {
      setContractType("");
      setContractGroup("");
      setArticle("");
      setArticleTitle("");
    }
    setSuggestions(null);
  }

  function submit() {
    if (!canSave) return;
    setError("");
    const path = [major, minor, item].map((s) => s.trim()).filter(Boolean);
    const tags = {
      원천: origin.trim() || null,
      의뢰부서: dept.trim() || null,
      주제: topics,
    };
    let contract_view = null;
    if (origin === "계약") {
      const ct = contractType.trim();
      const cg = contractGroup.trim();
      const ar = article.trim();
      const at = articleTitle.trim();
      if (ct || cg || ar || at) {
        contract_view = {
          contract_type: ct || null,
          contract_group: cg || null,
          article: ar || null,
          article_title: at || null,
        };
      }
    }
    const raw = normalizeRule({
      path,
      judgment: judgment.trim(),
      kind,
      note: note.trim(),
      summary: summary.trim(),
      origin: "새 룰",
      status: "candidate",
      tags,
      contract_view,
    });
    try {
      const stamped = stampAuthoring(raw, "새 룰 등재");
      const newTree = addRules([stamped], categoriesDoc);
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
          <label className="nrf-label">판단 카테고리 *</label>
          <div className="nrf-path-selects">
            <select
              className="rp-path-select"
              value={major}
              onChange={(e) => onChangeMajor(e.target.value)}
            >
              <option value="">대분류…</option>
              {판단.map((c) => (
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

        {/* v0.5 조각 7e — AI 축 제안 (4축 전부) */}
        <div className="inr-suggest-row nrf-suggest-row">
          <button
            type="button"
            className="inr-suggest-btn"
            onClick={askSuggest}
            disabled={!canSuggest || suggesting}
            title={suggestDisabledHint || "AI가 카테고리 안에서 4축(판단·원천·부서·주제)을 제안"}
          >
            {suggesting ? "제안 중…" : "✨ AI에 축 제안받기"}
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
                {(s.tags?.["원천"] || s.tags?.["의뢰부서"] || s.tags?.["주제"]?.length > 0) && (
                  <div className="inr-suggest-tags">
                    {s.tags?.["원천"] && <span className="inr-suggest-tag">원천: {s.tags["원천"]}</span>}
                    {s.tags?.["의뢰부서"] && <span className="inr-suggest-tag">부서: {s.tags["의뢰부서"]}</span>}
                    {s.tags?.["주제"]?.length > 0 && (
                      <span className="inr-suggest-tag">주제: {s.tags["주제"].join(", ")}</span>
                    )}
                  </div>
                )}
                {s.reason && <div className="inr-suggest-reason">→ {s.reason}</div>}
              </button>
            ))}
          </div>
        )}

        <div className="nrf-row">
          <label className="nrf-label">강도</label>
          <KindPicker value={kind} onChange={setKind} />
        </div>

        {/* v0.5 신규 — 원천 · 의뢰부서 */}
        <div className="nrf-row nrf-two-col">
          <div>
            <label className="nrf-label">원천</label>
            <select
              className="rp-path-select nrf-full"
              value={origin}
              onChange={(e) => onChangeOrigin(e.target.value)}
            >
              <option value="">(미지정)</option>
              {원천Cats.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="nrf-label">의뢰부서</label>
            <select
              className="rp-path-select nrf-full"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="">(미지정)</option>
              {부서Cats.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 주제 (열린 축) */}
        <div className="nrf-row">
          <label className="nrf-label">주제 (자유)</label>
          <div className="rp-topics">
            {topics.map((t) => (
              <span key={t} className="rp-topic-pill">
                {t}
                <button className="rp-topic-remove" onClick={() => removeTopic(t)}>×</button>
              </span>
            ))}
            <input
              className="rp-topic-input"
              placeholder="+ 주제 (엔터로 추가)"
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic();
                }
              }}
            />
          </div>
        </div>

        {/* contract_view — 원천=계약일 때만 */}
        {origin === "계약" && (
          <div className="nrf-row">
            <label className="nrf-label">계약 자세 (원천=계약)</label>
            <div className="nrf-cv-grid">
              <input
                className="rp-path-input"
                placeholder="계약 종류 (예: NDA(국문))"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
              />
              <input
                className="rp-path-input"
                placeholder="계약 그룹 (예: 정보보호 계약)"
                value={contractGroup}
                onChange={(e) => setContractGroup(e.target.value)}
              />
              <input
                className="rp-path-input"
                placeholder="조항 (예: 제7조)"
                value={article}
                onChange={(e) => setArticle(e.target.value)}
              />
              <input
                className="rp-path-input"
                placeholder="조항 제목 (예: 손해배상)"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
              />
            </div>
          </div>
        )}

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
