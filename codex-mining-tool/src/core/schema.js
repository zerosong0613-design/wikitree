// ============================================================
// 코어 — 공통 룰 스키마 (CLAUDE.md 3장). 불가침.
// 모든 입구가 이 형태로만 만들고, 모든 화면·내보내기가 이 형태를 읽는다.
// 코어는 입구/렌즈와 독립이다. 여기에 편의 필드를 임의로 늘리지 않는다.
// ============================================================

// 강도(kind)별 색·틴트·배지 글자색 (9장 비주얼 규약)
export const KIND_COLOR = { hard: "#9e3524", soft: "#c8871f", neu: "#2fa97f", hold: "#8a9086" };
export const KIND_TINT = {
  hard: "rgba(158,53,36,.08)",
  soft: "rgba(200,135,31,.10)",
  neu: "rgba(47,169,127,.10)",
  hold: "rgba(138,144,134,.12)",
};
export const KIND_FG = { hard: "#f5f6f3", soft: "#14171c", neu: "#14171c", hold: "#14171c" };
export const DEFAULT_LABEL = {
  hard: "마지노선",
  soft: "협상 여지",
  neu: "신규·미확정",
  hold: "사람 확인",
};
export const KIND_ORDER = ["hard", "soft", "neu", "hold"];

// path 를 안정적인 병합 키로. 같은 path = 같은 룰(4장 병합 규칙).
export function pathKey(path) {
  return (Array.isArray(path) ? path : [])
    .map((s) => String(s || "").trim())
    .join("␟");
}

// authors/history/provenance 정규화 (v0.3 신규 3필드, CLAUDE.md 4장).
// 폴백: 없으면 각각 [], [], null. v0.1 룰 호환.
function normalizeAuthor(a) {
  if (!a || typeof a !== "object") return null;
  const name = String(a.name || "").trim();
  if (!name) return null;
  return {
    name,
    role: String(a.role || "편집"),
    at: String(a.at || ""),
  };
}

function normalizeHistoryEntry(h) {
  if (!h || typeof h !== "object") return null;
  const who = String(h.who || "").trim();
  const action = String(h.action || "").trim();
  if (!who || !action) return null;
  return { who, action, at: String(h.at || "") };
}

function normalizeProvenance(p) {
  if (!p || typeof p !== "object") return null;
  const source_contract = String(p.source_contract || "").trim();
  const reviewed_by = String(p.reviewed_by || "").trim();
  // 최소 계약명 또는 검토자 중 하나는 있어야 provenance로 취급, 아니면 null.
  if (!source_contract && !reviewed_by) return null;
  return {
    source_contract: source_contract || null,
    reviewed_by: reviewed_by || null,
    extracted_at: String(p.extracted_at || ""),
    source_article: p.source_article ? String(p.source_article) : null,
    extraction_method: p.extraction_method ? String(p.extraction_method) : null,
  };
}

// 모델/폼이 만든 룰 하나를 4장 스키마로 방어적 정규화한다.
export function normalizeRule(r, i = 0) {
  const kind = KIND_ORDER.includes(r?.kind) ? r.kind : "neu";
  const held = Number.isFinite(+r?.held) ? Math.max(0, +r.held) : 0;
  const total = Number.isFinite(+r?.total) && +r.total > 0 ? +r.total : 0;
  const path = Array.isArray(r?.path)
    ? r.path.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  // 최소 한 단계는 보장 (가지 생성용). 비면 '미분류'.
  const safePath = path.length ? path : ["미분류"];

  const rt = r?.review_trigger || {};
  const review_trigger = {
    keywords: Array.isArray(rt.keywords)
      ? rt.keywords.map((k) => String(k || "").trim()).filter(Boolean)
      : [],
    law_group: rt.law_group ? String(rt.law_group) : null,
    test: rt.test ? String(rt.test) : "",
  };

  // v0.3 신규 3필드 — 없으면 빈 배열/null 폴백 (v0.1 룰 호환).
  const authors = Array.isArray(r?.authors)
    ? r.authors.map(normalizeAuthor).filter(Boolean)
    : [];
  const history = Array.isArray(r?.history)
    ? r.history.map(normalizeHistoryEntry).filter(Boolean)
    : [];
  const provenance = normalizeProvenance(r?.provenance);

  return {
    id: r?.id || `RULE-${String(i + 1).padStart(4, "0")}`,
    path: safePath,
    judgment: r?.judgment || "(판단 문장 없음)",
    kind,
    strength_label: r?.strength_label || DEFAULT_LABEL[kind],
    held,
    total,
    badge: r?.badge || (total ? `${held}/${total}` : ""),
    note: r?.note || "",
    // v0.3: 기본 origin은 "수동 폼"(v0.2 "수동 입력" 개칭). 다른 값은 그대로 통과.
    origin: r?.origin || "수동 폼",
    source: r?.source ? String(r.source) : null,
    status: r?.status === "approved" ? "approved" : "candidate",
    review_trigger,
    renew_trigger: r?.renew_trigger ? String(r.renew_trigger) : null,
    created_at: r?.created_at || "",
    // v0.3 신규 3필드 (CLAUDE.md 4장)
    authors,
    history,
    provenance,
  };
}

// 평면 배열 → 대분류(대) > 중분류(중) > 리프 트리. 저장이 아니라 뷰(구조 원칙 3).
// 가지는 여기서 path로 생성한다(하드코딩 금지 — 구조 원칙 4).
export function groupByPath(rules) {
  const majors = [];
  const majorIndex = new Map();

  for (const r of rules) {
    const major = r.path[0] || "미분류";
    const minor = r.path[1] || "";
    if (!majorIndex.has(major)) {
      const node = { name: major, subs: [], subIndex: new Map(), leaves: [], holds: 0 };
      majorIndex.set(major, node);
      majors.push(node);
    }
    const mnode = majorIndex.get(major);
    mnode.leaves.push(r);
    if (r.kind === "hold") mnode.holds++;

    if (!mnode.subIndex.has(minor)) {
      const sub = { name: minor, leaves: [] };
      mnode.subIndex.set(minor, sub);
      mnode.subs.push(sub);
    }
    mnode.subIndex.get(minor).leaves.push(r);
  }

  // 다수 hold 가지 = 사각지대(⚠). holds >= ceil(leaves/2)
  for (const m of majors) {
    m.blind = m.holds > 0 && m.holds >= Math.ceil(m.leaves.length / 2);
    delete m.subIndex;
  }
  return majors;
}

// 강도 분포 카운트
export function countKinds(rules) {
  const c = { hard: 0, soft: 0, neu: 0, hold: 0 };
  for (const r of rules) c[r.kind] = (c[r.kind] || 0) + 1;
  return c;
}
