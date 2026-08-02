// ============================================================
// 코어 — 카테고리 저장소 v2 (CLAUDE.md v0.5 4.6장 · 원칙 11·12).
// 사용자가 3개 닫힌 축(판단·원천·의뢰부서)을 미리 정한다.
// AI·입구는 이 안에서만 분류. 안 맞으면 "미분류"(판단) 또는 null(원천·부서).
// 하드코딩 아님(원칙 4) — 프리셋은 시드일 뿐, 사용자가 편집·삭제 가능.
// ============================================================

export const CATEGORIES_KEY = "codex_categories";
export const UNCATEGORIZED = "미분류";

// v0.4에서 유지. "법무 기본" 판단 축 프리셋.
export const PRESET_LEGAL = [
  { name: "정보통제", subs: ["비밀유지", "목적 외 이용", "데이터 활용"] },
  { name: "책임·분쟁", subs: ["손해배상", "면책", "관할"] },
  { name: "절차·기한", subs: ["통지", "갱신"] },
  { name: "규제 대응", subs: ["개인정보", "공정거래"] },
  { name: "계약 일반", subs: ["서명", "수정"] },
  { name: "분쟁 해결", subs: ["중재", "화해"] },
];

// v0.5 신규 — 원천 축 프리셋. 지식이 어디서 나왔나 (계약·자문·회의·사고·규제·내부규정).
export const PRESET_ORIGIN = [
  { name: "계약" },
  { name: "자문" },
  { name: "회의·의사결정" },
  { name: "사고·분쟁대응" },
  { name: "규제·법령대응" },
  { name: "내부규정" },
];

// v0.5 신규 — 의뢰부서 축 프리셋. 판단을 요청한 부서.
export const PRESET_DEPARTMENT = [
  { name: "법무" },
  { name: "인사" },
  { name: "재무·세무" },
  { name: "구매·조달" },
  { name: "영업" },
  { name: "연구개발" },
  { name: "IT" },
  { name: "경영지원" },
];

// v0.5 저장소 형식(v2):
// { version: 2, 판단: [{name, subs?}], 원천: [{name}], 의뢰부서: [{name}] }
// v1 문서(version:1, categories:[...])는 로드 시 자동 v2로 마이그레이션.

export function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return emptyDoc();
    return migrateAndNormalize(JSON.parse(raw));
  } catch {
    return emptyDoc();
  }
}

export function saveCategories(doc) {
  const clean = migrateAndNormalize(doc);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(clean));
  return clean;
}

export function clearCategories() {
  localStorage.removeItem(CATEGORIES_KEY);
}

// 판단 축 프리셋을 심음 — 원천·의뢰부서는 기존 그대로.
export function loadPresetLegal() {
  const cur = loadCategories();
  return saveCategories({
    ...cur,
    "판단": PRESET_LEGAL.map((c) => ({ name: c.name, subs: [...c.subs] })),
  });
}

// v0.5 신규 — 원천 축 프리셋.
export function loadPresetOrigin() {
  const cur = loadCategories();
  return saveCategories({
    ...cur,
    "원천": PRESET_ORIGIN.map((c) => ({ name: c.name })),
  });
}

// v0.5 신규 — 의뢰부서 축 프리셋.
export function loadPresetDepartment() {
  const cur = loadCategories();
  return saveCategories({
    ...cur,
    "의뢰부서": PRESET_DEPARTMENT.map((c) => ({ name: c.name })),
  });
}

// path 유효성 검증 → 안 맞으면 미분류 경로로 교체 (판단 축).
export function enforcePath(path, doc) {
  const cats = doc?.["판단"] || [];
  if (cats.length === 0) return Array.isArray(path) ? path : [];
  const arr = Array.isArray(path) ? path.slice() : [];
  const major = arr[0];
  if (!major) return [UNCATEGORIZED];
  if (major === UNCATEGORIZED) return arr;
  const majorNode = cats.find((c) => c.name === major);
  if (!majorNode) return [UNCATEGORIZED, ...arr.slice(1)];
  const minor = arr[1];
  if (minor && !majorNode.subs.includes(minor)) {
    return [major, "", ...arr.slice(2)];
  }
  return arr;
}

// v0.5 신규 — 원천 값 검증. 목록에 있으면 그대로, 없으면 null.
// UNCATEGORIZED는 원천에서는 통용되지 않음 (미지정 = null이면 충분).
export function enforceOrigin(value, doc) {
  if (!value) return null;
  const cats = doc?.["원천"] || [];
  if (cats.length === 0) return value; // 축이 비어있으면 통과(초기 상태)
  return cats.some((c) => c.name === value) ? value : null;
}

// v0.5 신규 — 의뢰부서 값 검증.
export function enforceDepartment(value, doc) {
  if (!value) return null;
  const cats = doc?.["의뢰부서"] || [];
  if (cats.length === 0) return value;
  return cats.some((c) => c.name === value) ? value : null;
}

// 판단 축이 있는지.
export function isMajorValid(major, doc) {
  if (major === UNCATEGORIZED) return true;
  return (doc?.["판단"] || []).some((c) => c.name === major);
}

// 목차 렌더용 그룹화 — 판단 축 기준 (v0.4 동일 유지).
// { categorized: [{ name, leaves, holds, blind }], uncategorized: {...} | null }
export function groupByCategories(rules, doc) {
  const cats = doc?.["판단"] || [];
  const catNames = new Set(cats.map((c) => c.name));

  const bucketed = new Map();
  for (const r of rules || []) {
    const major = r?.path?.[0] || UNCATEGORIZED;
    if (!bucketed.has(major)) bucketed.set(major, { leaves: [], holds: 0 });
    const b = bucketed.get(major);
    b.leaves.push(r);
    if (r.kind === "hold") b.holds++;
  }

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

// v0.5 신규 — 축별 그룹화 (판단/계약서/부서/원천).
// axis: "판단" | "계약서" | "부서" | "원천"
// 반환은 축별로 살짝 다름. 최소 { categorized: [{name, leaves, holds?, blind?, subgroups?}], uncategorized: {...}|null, kind }.
// kind: "flat"(리프 나열) | "nested"(2단 nested — 계약서별)
export function groupByAxis(rules, axis, doc) {
  if (axis === "판단" || !axis) {
    const r = groupByCategories(rules, doc);
    return { ...r, kind: "flat", axis: "판단" };
  }
  if (axis === "부서") return groupByTagAxis(rules, "의뢰부서", doc?.["의뢰부서"] || []);
  if (axis === "원천") return groupByTagAxis(rules, "원천", doc?.["원천"] || []);
  if (axis === "계약서") return groupByContract(rules);
  return { categorized: [], uncategorized: null, kind: "flat", axis };
}

// tags[tagKey](단일 값)로 그룹핑. 목록(orderedCats) 순서대로, 없는 값은 미지정 하단.
function groupByTagAxis(rules, tagKey, orderedCats) {
  const catNames = new Set(orderedCats.map((c) => c.name));
  const bucketed = new Map();
  for (const r of rules || []) {
    const v = r?.tags?.[tagKey] || null;
    const key = v || null; // null이면 미지정
    if (!bucketed.has(key)) bucketed.set(key, { leaves: [], holds: 0 });
    const b = bucketed.get(key);
    b.leaves.push(r);
    if (r.kind === "hold") b.holds++;
  }

  const categorized = orderedCats.map((c) => {
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

  // 카테고리 밖 (혹은 null=미지정)
  const uncatLeaves = [];
  let uncatHolds = 0;
  for (const [key, b] of bucketed) {
    if (key === null || !catNames.has(key)) {
      uncatLeaves.push(...b.leaves);
      uncatHolds += b.holds;
    }
  }
  const uncategorized =
    uncatLeaves.length > 0
      ? {
          name: "미지정",
          leaves: uncatLeaves,
          holds: uncatHolds,
          blind:
            uncatHolds > 0 && uncatHolds >= Math.ceil(uncatLeaves.length / 2),
        }
      : null;

  return { categorized, uncategorized, kind: "flat", axis: tagKey };
}

// 계약서별 — 원천="계약" 룰만 · contract_group > contract_type > (article 순 leaves).
// 2단 nested 반환. categorized: [{name, subgroups: [{name, leaves}]}].
function groupByContract(rules) {
  const contractRules = (rules || []).filter((r) => r?.tags?.["원천"] === "계약");
  if (contractRules.length === 0) {
    return { categorized: [], uncategorized: null, kind: "nested", axis: "계약서" };
  }

  // group by contract_group → contract_type
  const grouped = new Map(); // group → Map(type → leaves)
  for (const r of contractRules) {
    const group = r.contract_view?.contract_group || "(미분류 계약군)";
    const type = r.contract_view?.contract_type || "(미분류 계약)";
    if (!grouped.has(group)) grouped.set(group, new Map());
    const g = grouped.get(group);
    if (!g.has(type)) g.set(type, []);
    g.get(type).push(r);
  }

  // article 순 정렬 (있으면)
  const articleSort = (a, b) => {
    const an = extractArticleNum(a.contract_view?.article);
    const bn = extractArticleNum(b.contract_view?.article);
    if (an != null && bn != null) return an - bn;
    return String(a.contract_view?.article || "").localeCompare(String(b.contract_view?.article || ""));
  };

  const categorized = [];
  for (const [group, typeMap] of grouped) {
    const subgroups = [];
    let holds = 0;
    let leaves = 0;
    for (const [type, arr] of typeMap) {
      arr.sort(articleSort);
      subgroups.push({ name: type, leaves: arr });
      leaves += arr.length;
      holds += arr.filter((r) => r.kind === "hold").length;
    }
    categorized.push({ name: group, subgroups, holds, blind: false });
  }

  return { categorized, uncategorized: null, kind: "nested", axis: "계약서" };
}

function extractArticleNum(s) {
  if (!s) return null;
  const m = String(s).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// 대분류별 규칙 수 요약 — 판단 축.
export function countRulesByMajor(rules) {
  const out = {};
  for (const r of rules || []) {
    const m = r?.path?.[0] || UNCATEGORIZED;
    out[m] = (out[m] || 0) + 1;
  }
  return out;
}

// ────────────────────────────────────────────
// 내부: 마이그레이션·정규화
// ────────────────────────────────────────────

function emptyDoc() {
  return { version: 2, "판단": [], "원천": [], "의뢰부서": [] };
}

// v1({version:1, categories}) → v2({version:2, 판단, 원천, 의뢰부서}) 마이그레이션.
// 이미 v2면 그대로 정규화.
function migrateAndNormalize(doc) {
  if (!doc || typeof doc !== "object") return emptyDoc();

  // v1 → v2
  if (doc.categories && !doc["판단"]) {
    return normalizeV2({
      version: 2,
      "판단": doc.categories,
      "원천": [],
      "의뢰부서": [],
    });
  }
  return normalizeV2(doc);
}

function normalizeV2(doc) {
  return {
    version: 2,
    "판단": normalizeAxisList(doc["판단"], true), // subs 있음
    "원천": normalizeAxisList(doc["원천"], false),
    "의뢰부서": normalizeAxisList(doc["의뢰부서"], false),
  };
}

function normalizeAxisList(arr, withSubs) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const c of arr) {
    const name = String(c?.name || "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (withSubs) {
      const subs = Array.isArray(c?.subs)
        ? Array.from(
            new Set(
              c.subs
                .map((s) => String(s || "").trim())
                .filter(Boolean)
            )
          )
        : [];
      out.push({ name, subs });
    } else {
      out.push({ name });
    }
  }
  return out;
}
