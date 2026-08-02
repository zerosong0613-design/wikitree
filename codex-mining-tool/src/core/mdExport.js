// ============================================================
// 코어 — md 내보내기 (CLAUDE.md 7장). 핵심 산출물.
// 헤딩 트리(사람) + 말미 ```json 전체 룰 배열(기계). 한 장에 둘 다.
// "앱이 없어져도 지식은 남는다"의 물증.
// ============================================================
import { groupByPath, countKinds, DEFAULT_LABEL } from "./schema.js";

const KIND_TAG = { hard: "마지노선", soft: "협상 여지", neu: "신규·미확정", hold: "사람 확인" };

export function buildMarkdown(rules, dateStr) {
  const c = countKinds(rules);
  const majors = groupByPath(rules);
  const lines = [];

  lines.push("# CODEX 위키트리");
  lines.push("");
  lines.push(
    `> 총 규칙 ${rules.length}개 · 마지노선 ${c.hard} / 협상 여지 ${c.soft} / 신규 ${c.neu} / 사람 확인 ${c.hold}`
  );
  lines.push(`> 생성 ${dateStr}`);
  lines.push("");

  majors.forEach((m, mi) => {
    const warn = m.blind ? "  ⚠ 표준 미확정" : "";
    lines.push(`## ${mi + 1}. ${m.name}${warn}`);
    lines.push("");
    m.subs.forEach((sub) => {
      if (sub.name) {
        lines.push(`### ${sub.name}`);
        lines.push("");
      }
      sub.leaves.forEach((r) => {
        const tag = (KIND_TAG[r.kind] || DEFAULT_LABEL[r.kind] || "").toUpperCase();
        const badge = r.badge ? ` \`${r.badge}\`` : "";
        lines.push(`- **[${tag}] ${r.judgment}**${badge}`);
        if (r.note) lines.push(`  - 근거: ${r.note}`);
        lines.push(`  - origin: ${r.origin} · status: ${r.status}`);
        if (r.source) lines.push(`  - 근거 위치: ${r.source}`);
        if (r.review_trigger && r.review_trigger.keywords.length)
          lines.push(`  - 검토 트리거: ${r.review_trigger.keywords.join(", ")}`);
        if (r.renew_trigger) lines.push(`  - 재검토(RADAR): ${r.renew_trigger}`);
      });
      lines.push("");
    });
  });

  lines.push("---");
  lines.push("");
  lines.push("## 기계 판독용 데이터");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(rules, null, 2));
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

// codex_wikitree_YYYY-MM-DD.md 다운로드
export function downloadWikitreeMd(rules) {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10);
  const md = buildMarkdown(rules, d.toISOString().slice(0, 19).replace("T", " "));
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codex_wikitree_${dateStr}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
