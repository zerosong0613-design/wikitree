# CODEX Mining Tool

계약(서명본) 텍스트를 붙여넣으면, Claude가 반복되는 **판단 규칙**을 실제로 추출·분류해 CODEX 서랍에 쌓는 **로컬 웹 도구**. 스크립트된 데모가 아니라 진짜로 API를 호출해 동작한다.

## 실행

```bash
npm install
npm run dev
```

`http://localhost:5173` 이 열린다. 백엔드 없음 — 순수 브라우저 SPA.

## 쓰는 법

1. 우상단 **⚙ 설정** → Anthropic API 키 입력 → **저장**. (새로고침해도 유지됨)
2. 왼쪽 패널
   - **표준안**(선택): 우리 회사 표준 계약 조항.
   - **서명본**(필수): 실제 서명된 계약 여러 건을 `---` 로 구분해 붙여넣기.
3. **⛏ 채굴 시작** → 실제 Claude API 호출 → 룰 카드가 CODEX 서랍에 하나씩 꽂힌다.

## 동작 원리

- **강도(hard/soft)와 등장 빈도를 절대 뒤섞지 않는다.**
  - `마지노선(hard)`: 표준안이 한 번도 양보되지 않은 조항.
  - `협상 여지(soft)`: 자주 제시하지만 양보 이력이 있는 조항.
  - `신규·미확정(neu)`: 표본이 적거나 최근 등장한 쟁점.
  - `사람 확인(hold)`: 팀 판단이 갈린 조항 → **별도 '사람 확인' 큐**로 분리(확정과 안 섞음).
- 표준안이 있으면 관철/양보를 세고, 없으면 서명본들의 일관성으로 추정한다.

## API 키 안전

- 키는 **브라우저 `localStorage`(`codex_api_key`)** 에만 저장된다.
- 코드·레포·`.env` 어디에도 하드코딩하지 않으며 커밋하지 않는다.
- 브라우저에서 `https://api.anthropic.com/v1/messages` 를 직접 호출한다
  (CORS용 `anthropic-dangerous-direct-browser-access: true` 헤더 사용).

## 모델

`src/api.js` 상단 `MODEL` 상수. 기본값 `claude-sonnet-4-6`.
최신 Sonnet(`claude-sonnet-5`)으로 바꾸려면 이 상수만 교체하면 된다.

## 스택

Vite + React 18. 외부 호스팅 안 함.
