// 프롬프트 모음. v0.4에서 카테고리 제약 도입 (CLAUDE.md 4.6 · 원칙 10·11).
// - 계약 마이닝·AI path 제안: codex_categories 안에서만 분류. 새 대분류 발명 금지.
// - 안 맞으면 "미분류"로. 코어(store.enforcePath)가 최종 방어.
// 주의: 예시 JSON에 // 주석·플레이스홀더 넣지 않는다 — 모델이 흉내 내면 파싱이 깨진다.

// v0.4 조각 6e — 계약 마이닝 프롬프트 (categoriesDoc 주입).
export function buildMiningPrompt(signedText, standardText, categoriesDoc) {
  const standard = standardText && standardText.trim() ? standardText.trim() : "없음";
  const catBlock = categoriesBlockForPrompt(categoriesDoc);
  return `당신은 기업 법무의 '계약 판단 채굴기'다. 아래 서명된 계약들을 읽고, 이 팀이 반복적으로 내리는 판단을 규칙으로 뽑아낸다. 규칙을 지어내지 말고, 실제 텍스트에서 반복되는 것만 뽑는다.

[강도 판정 — 등장 횟수와 혼동하지 말 것]
- 마지노선(hard): 우리 표준안이 한 번도 양보되지 않은 조항.
- 협상 여지(soft): 표준안을 자주 제시하지만 양보한 이력이 있는 조항. 양보 이력 자체가 협상 카드라는 증거다.
- 신규·미확정(neu): 표본이 적거나(예: 3건 미만) 최근에야 등장한 쟁점.
- 사람 확인(hold): 팀 판단이 서로 갈리는 조항. 우리안과 상대안이 엇비슷하게 나타나거나 모순되면 여기로. 억지로 규칙을 만들지 말고 갈렸다고 정직하게 표시한다.

[표준안 유무]
- 표준안이 주어지면: 각 조항이 서명본에서 몇 번 관철/양보됐는지 센다.
- 표준안이 없으면: 반복 등장한 판단과 그 일관성으로 추정하고, 양보 수치는 만들지 마라.

${catBlock}

[각 필드 설명]
- path: [대분류, 중분류, 항목]. **대·중분류는 반드시 위 [카테고리] 목록에서 고른다** (새 대분류·중분류 발명 금지). 항목(3단)만 판단의 구체 소재로 짧게. 어디에도 안 맞으면 대분류를 "미분류"로 두고 이유를 note에 남긴다.
- kind: hard | soft | neu | hold 중 하나.
- strength_label: 마지노선 | 협상 여지 | 신규·미확정 | 사람 확인 중 하나.
- held / total: 미터용 정수. 표준안이 없으면 등장 횟수/표본 수로. 세지 못하면 둘 다 0.
- badge: "관철 30/30" 또는 "등장 7건" 또는 "14 : 16 갈림" 같은 짧은 문자열.
- origin: "계약 마이닝(diff)" 로 둔다.
- review_trigger.keywords: 이 신호가 새 입력에 있으면 이 노드가 후보. 3~6개.
- review_trigger.law_group: 규제와 얽힌 노드만 채우고, 아니면 null.
- review_trigger.test: 애매할 때 판정하는 한 문장.

아래 형태의 유효한 JSON 하나만 출력한다. 마크다운·주석·설명 문장 없이 JSON만. 모든 숫자는 실제 정수로 채운다.
{
  "rules": [
    {
      "id": "RULE-001",
      "path": ["책임·분쟁", "손해배상", "배상 상한"],
      "judgment": "배상 상한은 계약 총액 이내로 묶는다",
      "kind": "hard",
      "strength_label": "마지노선",
      "held": 30,
      "total": 30,
      "badge": "관철 30/30",
      "note": "양보 0 · 한 번도 안 내줌",
      "origin": "계약 마이닝(diff)",
      "review_trigger": {
        "keywords": ["배상", "손해", "한도"],
        "law_group": null,
        "test": "입력에 배상 상한 조항이 있는가"
      }
    }
  ],
  "summary": {
    "candidates": 1,
    "confirmed": 1,
    "needs_human": 0,
    "distribution": { "hard": 1, "soft": 0, "neu": 0 }
  }
}

[서명된 계약들]
${signedText}
[표준안]
${standard}`;
}

// v0.3 조각 4 — AI 찾기 프롬프트 (CLAUDE.md 7.2 · 미탐 우선 · 인용하지 창작 안 함).
export function buildAiFindPrompt(question, rules) {
  const minimal = (rules || []).map((r) => ({
    id: r.id,
    path: r.path,
    judgment: r.judgment,
    kind: r.kind,
    strength_label: r.strength_label,
    note: r.note || "",
    authors: Array.isArray(r.authors) ? r.authors.map((a) => a.name).filter(Boolean) : [],
    source_contract: r?.provenance?.source_contract || null,
  }));

  return `당신은 이 팀이 위키에 쌓아 온 판단 기준을 근거로 답하는 도우미다.
아래 [트리 룰]에 있는 판단만을 근거로 사용자 질문에 답한다.
없는 것을 지어내지 말라. 확실치 않으면 무관이 아니라 '보류'다 — 놓치는 게 틀리는 것보다 안전하다.

[출력 규칙]
- JSON만 출력. 마크다운·주석·설명 문장 없음.
- answer: 사용자 질문에 대한 요지 답변(1~3문장, 존댓말). 근거가 있으면 그 근거를 요약해 말한다.
- basis: 실제로 근거가 된 룰의 배열. 각 원소는 rule_id(반드시 [트리 룰]에 존재하는 id)와 why(왜 이게 근거인가 한 줄).
  - basis가 비어 있으면 verdict는 반드시 "hold".
- verdict:
  - "answered": 트리 안에 명확한 근거가 있어 답한다.
  - "hold": 트리에 확정된 기준이 없거나 관련 룰들이 서로 갈린다(hold 판단이 다수 등). answer는 "확정 기준 없음"으로 시작한다.
- 없는 rule_id를 지어내지 말 것. 있는 것만.

[출력 형식]
{
  "answer": "...",
  "basis": [{ "rule_id": "RULE-XXXX", "why": "..." }],
  "verdict": "answered"
}

[질문]
${String(question || "").trim()}

[트리 룰 — 근거로 쓸 수 있는 유일한 소스]
${JSON.stringify(minimal, null, 2)}`;
}

// v0.4 조각 6e — AI path 제안 프롬프트 (재작성).
// v0.3의 rules 인자·is_new_major 필드 제거. codex_categories 안에서만 제안.
// 반환: {suggestions: [{path, reason}, ...]}
export function buildPathSuggestPrompt(judgment, categoriesDoc, initialPath = []) {
  const catBlock = categoriesBlockForPrompt(categoriesDoc);
  const initHint = (initialPath || []).filter(Boolean).join(" > ") || "없음";
  return `당신은 이 팀의 판단 위키 taxonomy 도우미다.
사용자가 새로 심으려는 판단문을 보고, 아래 [카테고리] 안에서 path 3개를 제안한다.

[출력 규칙]
- JSON만 출력. 마크다운·주석·설명 문장 없음.
- 정확히 3개의 제안. 각 제안은 path(대분류·중분류·항목 3단 배열) + reason(왜 이 자리인가 한 줄).
- **대·중분류는 반드시 아래 [카테고리]에서 고른다.** 새 대분류·중분류 발명 금지 (원칙 10·11).
- 항목(path[2])만 판단문의 성격으로 새로 만든다. 짧게(예: "배상 상한", "면책 범위").
- 어디에도 안 맞으면 대분류 "미분류"로. 이 경우에도 reason에 왜 안 맞는지 한 줄.
- initialPath가 주어졌으면 그 시작 경로를 존중.
- 판단의 "성격"으로 묶어라. 문서 종류·계약 종류로 나누지 마라 — 그건 provenance에.

[출력 형식]
{
  "suggestions": [
    { "path": ["대분류", "중분류", "항목"], "reason": "..." },
    { "path": ["대분류", "중분류", "항목"], "reason": "..." },
    { "path": ["대분류", "중분류", "항목"], "reason": "..." }
  ]
}

${catBlock}

[새 판단]
${String(judgment || "").trim()}

[초기 경로 (있으면 존중)]
${initHint}`;
}

// v0.4 조각 6e — 카테고리 블록 헬퍼 (프롬프트 컨텍스트용).
// 형식: "- 대분류 (중분류1, 중분류2)" 여러 줄.
function categoriesBlockForPrompt(doc) {
  const cats = doc?.categories || [];
  if (cats.length === 0) {
    return `[카테고리]
(설정되지 않음 — 이 경우 대분류를 "미분류"로 통일하라. 코어가 최종 검증한다.)`;
  }
  const lines = cats.map(
    (c) => `- ${c.name}${c.subs.length ? ` (${c.subs.join(", ")})` : ""}`
  );
  return `[카테고리 — v0.4 필수 제약]
${lines.join("\n")}`;
}
