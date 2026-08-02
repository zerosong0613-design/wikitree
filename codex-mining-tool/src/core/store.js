// ============================================================
// 코어 — 저장·병합 (CLAUDE.md 4장). 불가침.
// localStorage 키 codex_tree 에 룰 평면 배열로 저장. 트리는 뷰(여기 아님).
// 같은 path 의 룰은 병합한다 — held/total 합산, note·badge·strength_label 최신 갱신.
// 코어 코드는 입구/렌즈 추가에도 바뀌지 않는다.
// ============================================================
import { normalizeRule, pathKey } from "./schema.js";

export const TREE_KEY = "codex_tree";

export function loadTree() {
  try {
    const raw = localStorage.getItem(TREE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map((r, i) => normalizeRule(r, i)) : [];
  } catch {
    return [];
  }
}

export function saveTree(rules) {
  localStorage.setItem(TREE_KEY, JSON.stringify(rules));
}

export function clearTree() {
  localStorage.removeItem(TREE_KEY);
}

function nowStamp() {
  // 브라우저 런타임 — Date 사용 OK.
  return new Date().toISOString();
}

// 새 룰들을 기존 트리에 병합해 반환한다(저장까지). 순수 병합 로직은 아래 merge().
export function addRules(incoming) {
  const merged = merge(loadTree(), incoming);
  saveTree(merged);
  return merged;
}

// 병합: 같은 path 있으면 숫자 합산 + 최신값 갱신, 없으면 추가.
// v0.3: history·authors 는 누적(덮어쓰지 않는다). CLAUDE.md 5장.
// → 같은 대상을 다시 넣어도 중복 가지가 안 생기고 숫자만 커지고, 편집 이력은 남는다.
export function merge(existing, incoming) {
  const out = existing.map((r) => ({ ...r }));
  const index = new Map(out.map((r, i) => [pathKey(r.path), i]));

  for (const raw of incoming || []) {
    const r = normalizeRule(raw, out.length);
    const key = pathKey(r.path);
    if (index.has(key)) {
      const cur = out[index.get(key)];
      const held = (cur.held || 0) + (r.held || 0);
      const total = (cur.total || 0) + (r.total || 0);
      out[index.get(key)] = {
        ...cur,
        // 숫자 합산
        held,
        total,
        // 최신값 갱신
        note: r.note || cur.note,
        // 숫자 카운트가 있으면 합산값으로 배지 갱신(35/35). 없으면(hold·neu 등) 최신 텍스트 배지 유지.
        badge: total > 0 ? `관철 ${held}/${total}` : r.badge || cur.badge,
        strength_label: r.strength_label || cur.strength_label,
        kind: r.kind || cur.kind,
        review_trigger: mergeTrigger(cur.review_trigger, r.review_trigger),
        // 승인 상태는 한쪽이라도 approved면 유지
        status: cur.status === "approved" || r.status === "approved" ? "approved" : "candidate",
        // v0.3 신규: history는 concat, authors는 이름 단위 dedupe(최신 role 유지),
        // provenance는 새 값 우선 · 없으면 기존 유지.
        history: [...(cur.history || []), ...(r.history || [])],
        authors: mergeAuthors(cur.authors, r.authors),
        provenance: r.provenance || cur.provenance || null,
      };
    } else {
      out.push({ ...r, created_at: r.created_at || nowStamp() });
      index.set(key, out.length - 1);
    }
  }
  return out;
}

function mergeTrigger(a = {}, b = {}) {
  const keywords = Array.from(new Set([...(a.keywords || []), ...(b.keywords || [])]));
  return {
    keywords,
    law_group: b.law_group || a.law_group || null,
    test: b.test || a.test || "",
  };
}

// authors 병합: 이름 단위 dedupe, 최신 role/at 유지 (뒤 항목이 이김).
// "누가 주인인가"의 현재 상태만 잡고, 전체 이력은 history에서 본다.
function mergeAuthors(a = [], b = []) {
  const byName = new Map();
  for (const author of [...(a || []), ...(b || [])]) {
    if (!author?.name) continue;
    byName.set(author.name, author);
  }
  return Array.from(byName.values());
}

// 승인/삭제 (선택적 편의 — 코어 스키마 status만 건드림)
export function setStatus(rules, id, status) {
  const out = rules.map((r) => (r.id === id ? { ...r, status } : r));
  saveTree(out);
  return out;
}
