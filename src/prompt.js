// 채굴 프롬프트. 강도(hard/soft)를 등장 빈도와 절대 뒤섞지 않는 게 핵심이다.
// 스펙에 명시된 프롬프트를 그대로 사용한다.

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

아래 JSON만 출력한다. 마크다운·설명 없이 JSON 하나만.
{
  "rules": [
    {
      "id": "RULE-001",
      "judgment": "규칙 한 문장",
      "kind": "hard|soft|neu|hold",
      "strength_label": "마지노선|협상 여지|신규·미확정|사람 확인",
      "held": 정수, "total": 정수,          // 미터용. 표준안 없으면 등장/표본으로.
      "badge": "관철 30/30" 또는 "등장 7건" 또는 "14 : 16 갈림",
      "note": "양보 이력이나 근거 한 줄",
      "origin": "diff 채굴|사례 역추출|인터뷰 채굴"
    }
  ],
  "summary": {
    "candidates": 정수,   // 뽑힌 후보 총수
    "confirmed": 정수,    // hold 아닌 확정 규칙 수
    "needs_human": 정수,  // hold 수
    "distribution": {"hard": 정수, "soft": 정수, "neu": 정수}
  }
}

[서명된 계약들]
${signedText}
[표준안]
${standard}`;
}
