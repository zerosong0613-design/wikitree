// 채굴 프롬프트. 강도(hard/soft)를 등장 빈도와 절대 뒤섞지 않는 게 핵심이다.
// 코어(3장 스키마)에 맞춰 각 룰에 path 와 review_trigger 를 부여하게 한다.
// 주의: 예시 JSON에는 // 주석이나 '정수' 같은 플레이스홀더를 넣지 않는다
//       — 모델이 그대로 흉내 내면 JSON 파싱이 깨진다. 설명은 본문 산문으로.

export function buildMiningPrompt(signedText, standardText) {
  const standard = standardText && standardText.trim() ? standardText.trim() : "없음";
  return `당신은 기업 법무의 '계약 판단 채굴기'다. 아래 서명된 계약들을 읽고, 이 팀이 반복적으로 내리는 판단을 규칙으로 뽑아낸다. 규칙을 지어내지 말고, 실제 텍스트에서 반복되는 것만 뽑는다.

[강도 판정 — 등장 횟수와 혼동하지 말 것]
- 마지노선(hard): 우리 표준안이 한 번도 양보되지 않은 조항.
- 협상 여지(soft): 표준안을 자주 제시하지만 양보한 이력이 있는 조항. 양보 이력 자체가 협상 카드라는 증거다.
- 신규·미확정(neu): 표본이 적거나(예: 3건 미만) 최근에야 등장한 쟁점.
- 사람 확인(hold): 팀 판단이 서로 갈리는 조항. 우리안과 상대안이 엇비슷하게 나타나거나 모순되면 여기로. 억지로 규칙을 만들지 말고 갈렸다고 정직하게 표시한다.

[표준안 유무]
- 표준안이 주어지면: 각 조항이 서명본에서 몇 번 관철/양보됐는지 센다.
- 표준안이 없으면: 반복 등장한 판단과 그 일관성으로 추정하고, 양보 수치는 만들지 마라.

[각 필드 설명]
- path: [대분류, 중분류, 항목]. 성격으로 묶는다(예: 정보통제 / 절차·기한 / 책임·분쟁 / 신기술·AI). 같은 성격은 같은 대분류·중분류로 모은다.
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
      "path": ["책임·분쟁", "배상", "배상 상한"],
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
// 트리 룰의 "최소 표현"만 컨텍스트로 넘긴다. review_trigger·history 등은 답에 불필요.
// 반환은 반드시 JSON: {answer, basis: [{rule_id, why}], verdict: "answered"|"hold"}.
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

// v0.3 조각 5 — AI path 제안 프롬프트 (CLAUDE.md 4.5 · 3장-10).
// 기존 트리의 축(대·중분류 + count)만 넘긴다. 개별 판단문은 안 넘겨 토큰 절약.
// 반환: {suggestions: [{path: [...], reason: "...", is_new_major: bool}, ...]}
export function buildPathSuggestPrompt(judgment, rules, initialPath = []) {
  const taxonomy = summarizeTaxonomy(rules);
  const initHint = (initialPath || []).filter(Boolean).join(" > ") || "없음";
  return `당신은 이 팀의 판단 위키 taxonomy 도우미다.
사용자가 새로 심으려는 판단문을 보고, 기존 트리에 어울리는 path 3개를 제안한다.

[출력 규칙]
- JSON만 출력. 마크다운·주석·설명 문장 없음.
- 정확히 3개의 제안. 각 제안은 path(대분류·중분류·항목 3단 배열) + reason(왜 이 자리인가 한 줄) + is_new_major(bool, 기존에 없는 새 대분류이면 true).
- 기존 대분류에 잘 맞으면 그 안으로. 안 맞으면 새 대분류를 제안하되 왜 새로 필요한지 이유 필수.
- 판단의 "성격"으로 묶어라. 문서 종류·계약 종류·거래처로 나누지 마라 — 그건 provenance에 남는다(CLAUDE.md 4.5).
- initialPath가 주어졌으면 그 시작 경로를 존중하되(예: 대분류 고정) 그 안에서 다양한 위치를 제안.
- path의 세 번째 단계(항목)는 판단의 구체 소재(예: "배상 상한", "면책 범위") 정도로 짧게.

[출력 형식]
{
  "suggestions": [
    { "path": ["대분류", "중분류", "항목"], "reason": "...", "is_new_major": false },
    { "path": ["대분류", "중분류", "항목"], "reason": "...", "is_new_major": false },
    { "path": ["대분류", "중분류", "항목"], "reason": "...", "is_new_major": true }
  ]
}

[새 판단]
${String(judgment || "").trim()}

[초기 경로 (있으면 존중)]
${initHint}

[기존 트리의 축들 (성격으로 묶기 참고용)]
${taxonomy || "(비어 있음)"}`;
}

// 트리의 대분류·중분류를 count와 함께 요약. 프롬프트 컨텍스트용.
// 예: "책임·분쟁 (12) > 배상 (5), 면책 (3), 준거법 (4) | 정보·기밀 (8) > 비밀유지 (5), 개인정보 (3)"
function summarizeTaxonomy(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return "";
  const majors = new Map(); // major → Map(minor → count)
  for (const r of rules) {
    const major = r?.path?.[0] || "미분류";
    const minor = r?.path?.[1] || "";
    if (!majors.has(major)) majors.set(major, new Map());
    const minors = majors.get(major);
    minors.set(minor, (minors.get(minor) || 0) + 1);
  }
  const parts = [];
  for (const [major, minors] of majors) {
    const majorCount = Array.from(minors.values()).reduce((a, b) => a + b, 0);
    const minorList = Array.from(minors.entries())
      .filter(([m]) => m)
      .map(([m, c]) => `${m} (${c})`)
      .join(", ");
    parts.push(`${major} (${majorCount})${minorList ? " > " + minorList : ""}`);
  }
  return parts.join(" | ");
}
