// ============================================================
// 코어 — 카테고리 저장소 (CLAUDE.md v0.4 4.6장 · 원칙 11).
// 사용자가 대·중분류를 미리 정한다. AI·입구는 이 안에서만 분류.
// 안 맞으면 "미분류". 하드코딩 아님(원칙 4) — 이 파일은 저장소 API만.
// ============================================================

export const CATEGORIES_KEY = "codex_categories";
export const UNCATEGORIZED = "미분류";

// 프리셋 "법무 기본 카테고리" 시드. 코드 상수지만 자동 심어지지 않는다 —
// 사용자가 [카테고리 설정]에서 "불러오기" 버튼을 눌러야 저장소로 들어감.
// 이후 편집·삭제 자유. 하드코딩 아님(하드코딩 = 코드가 강제하는 것).
export const PRESET_LEGAL = [
  { name: "정보통제", subs: ["비밀유지", "목적 외 이용", "데이터 활용"] },
  { name: "책임·분쟁", subs: ["손해배상", "면책", "관할"] },
  { name: "절차·기한", subs: ["통지", "갱신"] },
  { name: "규제 대응", subs: ["개인정보", "공정거래"] },
  { name: "계약 일반", subs: ["서명", "수정"] },
  { name: "분쟁 해결", subs: ["중재", "화해"] },
];

// 저장소 load — 항상 정규화된 문서 반환.
export function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return { version: 1, categories: [] };
    return normalizeCategoriesDoc(JSON.parse(raw));
  } catch {
    return { version: 1, categories: [] };
  }
}

export function saveCategories(doc) {
  const clean = normalizeCategoriesDoc(doc);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(clean));
  return clean;
}

export function clearCategories() {
  localStorage.removeItem(CATEGORIES_KEY);
}

// 프리셋을 저장소에 심는다. 이미 카테고리가 있으면 덮어쓰지 않고 병합할지 여부는
// UI에서 결정(현재 UI는 "비었을 때만" 프리셋 버튼을 노출).
export function loadPresetLegal() {
  return saveCategories({
    version: 1,
    categories: PRESET_LEGAL.map((c) => ({ name: c.name, subs: [...c.subs] })),
  });
}

// path 유효성 검증 → 안 맞으면 미분류 경로로 교체.
// - 카테고리 문서가 비어 있으면(초기) 그대로 통과(검증 skip).
// - 대분류가 카테고리에 없으면 path[0]을 "미분류"로 교체(원 path[1..]는 유지).
// - 대분류는 있는데 중분류가 그 대분류의 subs에 없으면 중분류를 빈 값으로.
export function enforcePath(path, doc) {
  const cats = doc?.categories || [];
  if (cats.length === 0) return Array.isArray(path) ? path : [];
  const arr = Array.isArray(path) ? path.slice() : [];
  const major = arr[0];
  if (!major) return [UNCATEGORIZED];
  if (major === UNCATEGORIZED) return arr;
  const majorNode = cats.find((c) => c.name === major);
  if (!majorNode) {
    // 대분류 실종 → 미분류로. 원 major는 참고를 위해 note에 남길 수도 있으나 여기선 단순.
    return [UNCATEGORIZED, ...arr.slice(1)];
  }
  const minor = arr[1];
  if (minor && !majorNode.subs.includes(minor)) {
    // 중분류 유효 안함 → 대분류만 유지, 중분류 비움
    return [major, "", ...arr.slice(2)];
  }
  return arr;
}

// 대분류 이름이 카테고리 문서에 있는지.
export function isMajorValid(major, doc) {
  if (major === UNCATEGORIZED) return true;
  return (doc?.categories || []).some((c) => c.name === major);
}

// 목차 렌더용 그룹화 — 카테고리 순서대로 (빈 카테고리도 포함) + 맨 아래 "미분류".
// { categorized: [{ name, leaves, holds, blind }], uncategorized: {...} | null }
export function groupByCategories(rules, doc) {
  const cats = doc?.categories || [];
  const catNames = new Set(cats.map((c) => c.name));

  // 대분류별 leaves
  const bucketed = new Map(); // major → { leaves, holds }
  for (const r of rules || []) {
    const major = r?.path?.[0] || UNCATEGORIZED;
    if (!bucketed.has(major)) bucketed.set(major, { leaves: [], holds: 0 });
    const b = bucketed.get(major);
    b.leaves.push(r);
    if (r.kind === "hold") b.holds++;
  }

  // 카테고리 순서대로 (빈 카테고리도 표시)
  const categorized = cats.map((c) => {
    const b = bucketed.get(c.name) || { leaves: [], holds: 0 };
    return {
      name: c.name,
      leaves: b.leaves,
      holds: b.holds,
      blind:
        b.holds > 0 &&
        b.leaves.length > 0 &&
        b.holds >= Math.ceil(b.leaves.length / 2),
    };
  });

  // 카테고리 밖 (미분류 포함) → 하단으로
  const uncatLeaves = [];
  let uncatHolds = 0;
  for (const [major, b] of bucketed) {
    if (!catNames.has(major)) {
      uncatLeaves.push(...b.leaves);
      uncatHolds += b.holds;
    }
  }
  const uncategorized =
    uncatLeaves.length > 0
      ? {
          name: UNCATEGORIZED,
          leaves: uncatLeaves,
          holds: uncatHolds,
          blind:
            uncatHolds > 0 && uncatHolds >= Math.ceil(uncatLeaves.length / 2),
        }
      : null;

  return { categorized, uncategorized };
}

// 대분류별 규칙 수 요약 — 카테고리 삭제 경고용 ({ [name]: count }).
export function countRulesByMajor(rules) {
  const out = {};
  for (const r of rules || []) {
    const m = r?.path?.[0] || UNCATEGORIZED;
    out[m] = (out[m] || 0) + 1;
  }
  return out;
}

function normalizeCategoriesDoc(doc) {
  if (!doc || typeof doc !== "object") return { version: 1, categories: [] };
  const seen = new Set();
  const clean = (Array.isArray(doc.categories) ? doc.categories : [])
    .map((c) => ({
      name: String(c?.name || "").trim(),
      subs: Array.isArray(c?.subs)
        ? Array.from(
            new Set(
              c.subs
                .map((s) => String(s || "").trim())
                .filter(Boolean)
            )
          )
        : [],
    }))
    .filter((c) => {
      if (!c.name) return false;
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  return { version: 1, categories: clean };
}
