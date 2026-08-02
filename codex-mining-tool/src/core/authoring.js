// ============================================================
// 코어 — 저작자 자동 stamp (CLAUDE.md 2장·5장·10.5).
// 어떤 편집 UI든 저장 직전에 stampAuthoring(rule, action) 한 줄만 통과시키면
// authors·history에 누가·언제·무엇을이 자동으로 박힌다.
// UI는 저작자 로직을 몰라도 된다 — 재사용 가능성이 이 파일의 값이다.
// ============================================================

export const AUTHOR_KEY = "codex_author_name";

export function getAuthorName() {
  try {
    return (localStorage.getItem(AUTHOR_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function setAuthorName(name) {
  const clean = String(name || "").trim();
  if (clean) localStorage.setItem(AUTHOR_KEY, clean);
  else localStorage.removeItem(AUTHOR_KEY);
}

export function clearAuthorName() {
  localStorage.removeItem(AUTHOR_KEY);
}

// 이름 없음을 UI가 잡을 수 있게 에러 클래스로 분리.
// UI는 이걸 catch해서 "⚙ 설정에서 내 이름을 먼저" 안내를 띄운다.
export class NoAuthorError extends Error {
  constructor() {
    super("저작자 이름이 필요합니다. ⚙ 설정에서 내 이름을 먼저 넣어주세요.");
    this.name = "NoAuthorError";
  }
}

// 액션 어휘 → role 매핑 (5장 액션 어휘 최소 고정).
// 새 액션이 필요하면 여기 먼저 등록한다. 임의 문자열도 통과하되 role은 "편집"으로 fallback.
const ACTION_ROLE = {
  "인라인 편집으로 등재": "편집",
  "수동 폼으로 등재": "편집",
  "검토 추출로 등재": "검토·추출",
  "계약 마이닝으로 등재": "초안",
  "판단문 수정": "수정",
  "path 이동": "수정",
  "kind 변경": "수정",
  "note 수정": "수정",
  "승인": "승인",
  "삭제": "삭제",
};

export function actionToRole(action) {
  return ACTION_ROLE[action] || "편집";
}

// 룰에 저작자·history를 자동 stamp해서 반환.
// - 저장자 이름은 localStorage에서 자동 읽음. 없으면 NoAuthorError.
// - authors·history는 append (덮어쓰지 않음). 병합 시 dedup은 store.merge가 담당.
// - action은 위 ACTION_ROLE 어휘 중 하나가 이상적이나 임의 문자열도 허용.
export function stampAuthoring(rule, action) {
  const name = getAuthorName();
  if (!name) throw new NoAuthorError();

  const at = new Date().toISOString();
  const role = actionToRole(action);

  return {
    ...rule,
    authors: [
      ...(Array.isArray(rule?.authors) ? rule.authors : []),
      { name, role, at },
    ],
    history: [
      ...(Array.isArray(rule?.history) ? rule.history : []),
      { who: name, action, at },
    ],
  };
}
