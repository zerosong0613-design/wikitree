// 강도(kind)별 색·틴트·배지 텍스트색. 데모 팔레트 그대로.
export const KIND_COLOR = {
  hard: "#9e3524",
  soft: "#c8871f",
  neu: "#2fa97f",
  hold: "#8a9086",
};

export const KIND_TINT = {
  hard: "rgba(158,53,36,.10)",
  soft: "rgba(200,135,31,.12)",
  neu: "rgba(47,169,127,.12)",
  hold: "rgba(138,144,134,.12)",
};

// hard 배지는 밝은 글자, 나머지는 잉크 글자.
export const KIND_FG = {
  hard: "#f5f6f3",
  soft: "#14171c",
  neu: "#14171c",
  hold: "#14171c",
};

export const DEFAULT_LABEL = {
  hard: "마지노선",
  soft: "협상 여지",
  neu: "신규·미확정",
  hold: "사람 확인",
};

// 모델 응답 rule 하나를 방어적으로 정규화한다.
export function normalizeRule(r, i) {
  const kind = ["hard", "soft", "neu", "hold"].includes(r?.kind) ? r.kind : "neu";
  const held = Number.isFinite(+r?.held) ? Math.max(0, +r.held) : 0;
  const total = Number.isFinite(+r?.total) && +r.total > 0 ? +r.total : 0;
  return {
    id: r?.id || `RULE-${String(i + 1).padStart(3, "0")}`,
    judgment: r?.judgment || "(판단 문장 없음)",
    kind,
    strength_label: r?.strength_label || DEFAULT_LABEL[kind],
    held,
    total,
    badge: r?.badge || (total ? `${held}/${total}` : ""),
    note: r?.note || "",
    origin: r?.origin || "diff 채굴",
  };
}
