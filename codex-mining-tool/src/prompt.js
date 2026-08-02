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
