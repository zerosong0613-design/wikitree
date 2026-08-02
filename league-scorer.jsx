import React, { useState } from "react";

const LEAGUES = {
  idea: {
    key: "idea",
    name: "AI Idea 리그",
    accent: "#2FA97F",
    subject: "이미 활용 중인 사례와 그 결과물 (2026년 제작분)",
    axes: [
      { id: "supex", label: "SUPEX 추구", desc: "문제 해결을 통해 달성한 Biz. Impact 또는 기존 방식의 개선 정도" },
      { id: "second", label: "확장 가능성", desc: "다른 멤버사나 조직에서도 쉽게 이해하고 의미있게 활용할 수 있도록 기술되었는가" },
      { id: "novel", label: "혁신성", desc: "문제 해결 과정 및 접근방식의 혁신성" },
    ],
    guard: "이미 만들어 쓰고 있는 것만 낼 수 있다. 아직 안 만든 구상은 이 리그 대상이 아니다.",
  },
  solution: {
    key: "solution",
    name: "AI Solution 리그",
    accent: "#4C5BD4",
    subject: "대회 과정에서 직접 만든 에이전트 또는 서비스",
    axes: [
      { id: "supex", label: "SUPEX 추구", desc: "문제 해결을 통해 달성하고자 하는 Biz. Impact 또는 기존 방식의 개선 정도" },
      { id: "second", label: "구현 가능성", desc: "문제해결 방향과 실행계획의 현실성과 구체성" },
      { id: "novel", label: "혁신성", desc: "문제 해결 과정 및 접근방식의 혁신성" },
    ],
    guard: "대회 기간에 새로 만드는 것만 낼 수 있다. 이미 완성해 쓰고 있는 도구는 이 리그 대상이 아니다.",
  },
};

const buildPrompt = (league, title, body) => {
  const L = LEAGUES[league];
  return `당신은 2026 SK AI 해커톤 ${L.name}의 심사위원이다. 대기업 사내 심사 맥락이며, 심사위원 다수는 해당 도메인 밖의 사람이다.

[이 리그의 심사 대상]
${L.subject}
제외 규칙: ${L.guard}

[평가 축 — 각 0~10점]
${L.axes.map((a) => `- ${a.label}: ${a.desc}`).join("\n")}

[채점 시 반드시 반영할 실제 심사 경향]
- 정량 수치(시간, 건수, 비율, 리드타임)가 없으면 SUPEX 축은 6점을 넘길 수 없다.
- 대시보드나 정리 문서가 아니라 스스로 동작하는 에이전트·서비스 형태일수록 높다.
- 제출자만 쓸 수 있는 구조면 확장 축이 깎인다.
- 실패 경험이나 제약 조건이 구체적으로 적혀 있으면 구현 축이 올라간다.
- 시중 상용 제품으로 이미 해결되는 문제면 혁신 축이 깎인다.

[제출물]
이름: ${title || "(이름 없음)"}
내용: ${body}

아래 JSON만 출력한다. 마크다운 코드펜스, 설명, 접두어 없이 JSON 하나만.
{
  "eligible": true 또는 false,
  "eligibility_note": "리그 대상에 맞는지 한 문장. 어긋나면 어느 리그로 가야 하는지까지",
  "scores": [
    {"id": "supex", "score": 0-10 정수, "why": "이 점수인 이유 한 문장", "lift": "1점 올리려면 무엇을 더해야 하는지 한 문장"},
    {"id": "second", "score": 0-10 정수, "why": "...", "lift": "..."},
    {"id": "novel", "score": 0-10 정수, "why": "...", "lift": "..."}
  ],
  "killer_question": "심사장에서 나올 가장 아픈 질문 하나",
  "verdict": "총평 두 문장 이내. 통과 가능성을 솔직하게."
}`;
};

const callClaude = async (prompt) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
};

function Meter({ value, accent }) {
  return (
    <div className="flex gap-[2px] items-end h-7" aria-label={`${value} / 10`}>
      {Array.from({ length: 10 }).map((_, i) => {
        const on = i < value;
        const isThreshold = i === 6;
        return (
          <div
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: on ? `${40 + i * 6}%` : "22%",
              background: on ? accent : "#C9CCC6",
              opacity: on ? 1 : 0.55,
              outline: isThreshold ? "1px dashed #8A9086" : "none",
              outlineOffset: "1px",
              transition: "height 320ms cubic-bezier(.2,.8,.3,1)",
            }}
          />
        );
      })}
    </div>
  );
}

export default function LeagueScorer() {
  const [league, setLeague] = useState("solution");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [entries, setEntries] = useState([]);

  const L = LEAGUES[league];

  const score = async () => {
    if (!body.trim()) {
      setErr("아이디어 내용을 적어야 채점할 수 있습니다.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await callClaude(buildPrompt(league, title, body));
      const total = r.scores.reduce((s, x) => s + x.score, 0);
      setEntries((prev) => [
        { id: Date.now(), league, title: title || "이름 없음", body, ...r, total },
        ...prev,
      ]);
      setTitle("");
      setBody("");
    } catch (e) {
      setErr("채점에 실패했습니다. 내용을 조금 줄여서 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  const ranked = [...entries].sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen w-full" style={{ background: "#E9EBE6", color: "#14171C" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap');
        .ls-root, .ls-root input, .ls-root textarea, .ls-root button { font-family: Pretendard, -apple-system, BlinkMacSystemFont, sans-serif; }
        .ls-num { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
        .ls-field:focus { outline: 2px solid #14171C; outline-offset: 1px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div className="ls-root max-w-5xl mx-auto px-5 py-8">
        <header className="border-b-2 pb-4 mb-6" style={{ borderColor: "#14171C" }}>
          <p className="ls-num text-[11px] tracking-[0.18em] uppercase" style={{ color: "#5E665C" }}>
            2026 SK AI 해커톤 · 사전 채점
          </p>
          <h1 className="text-[26px] leading-tight font-bold mt-1">심사표를 미리 받아본다</h1>
          <p className="text-sm mt-2" style={{ color: "#4B534A" }}>
            같은 아이디어라도 리그가 다르면 점수가 달라집니다. 두 기준에 각각 걸어보세요.
          </p>
        </header>

        <div className="flex gap-2 mb-5">
          {Object.values(LEAGUES).map((x) => {
            const on = x.key === league;
            return (
              <button
                key={x.key}
                onClick={() => setLeague(x.key)}
                className="px-4 py-2 text-sm font-semibold rounded-sm border-2"
                style={{
                  borderColor: on ? x.accent : "#C2C6BF",
                  background: on ? x.accent : "transparent",
                  color: on ? "#fff" : "#5E665C",
                }}
              >
                {x.name}
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <section>
            <div
              className="border-2 p-4"
              style={{ borderColor: "#14171C", background: "#F5F6F3" }}
            >
              <label className="block text-xs font-semibold mb-1">이름</label>
              <input
                className="ls-field w-full border px-3 py-2 text-sm mb-4 bg-white"
                style={{ borderColor: "#B9BEB6" }}
                placeholder="예: RADAR"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <label className="block text-xs font-semibold mb-1">
                무슨 문제를 어떻게 푸는지
              </label>
              <textarea
                className="ls-field w-full border px-3 py-2 text-sm bg-white"
                style={{ borderColor: "#B9BEB6", minHeight: 190 }}
                placeholder={
                  "문제 / 지금은 어떻게 하고 있는지 / 무엇을 만들 것인지 / 숫자로 잴 수 있는 결과\n\n숫자와 제약 조건을 적을수록 점수가 정확해집니다."
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={score}
                  disabled={busy}
                  className="px-5 py-2.5 text-sm font-bold text-white rounded-sm"
                  style={{ background: busy ? "#8A9086" : "#14171C" }}
                >
                  {busy ? "채점 중" : "채점하기"}
                </button>
                {err && (
                  <span className="text-xs font-medium" style={{ color: "#B23A2A" }}>
                    {err}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 text-xs leading-relaxed p-3 border-l-2" style={{ borderColor: L.accent, color: "#4B534A", background: "#F5F6F3" }}>
              <strong className="block mb-1" style={{ color: "#14171C" }}>{L.name} 심사 대상</strong>
              {L.subject}
              <br />
              {L.guard}
            </div>
          </section>

          <section>
            {entries.length === 0 ? (
              <div
                className="border-2 border-dashed h-full flex items-center justify-center p-8 text-center text-sm"
                style={{ borderColor: "#B9BEB6", color: "#6B7268", minHeight: 260 }}
              >
                채점한 아이디어가 여기 쌓입니다.
                <br />
                여러 개를 넣으면 아래에서 순위가 매겨집니다.
              </div>
            ) : (
              <div className="space-y-4">
                {entries.slice(0, 3).map((e) => {
                  const EL = LEAGUES[e.league];
                  return (
                    <article key={e.id} className="border-2 p-4" style={{ borderColor: "#14171C", background: "#F5F6F3" }}>
                      <div className="flex items-baseline justify-between gap-3 mb-3">
                        <div>
                          <p className="ls-num text-[10px] tracking-[0.16em] uppercase" style={{ color: EL.accent }}>
                            {EL.name}
                          </p>
                          <h2 className="text-lg font-bold leading-tight">{e.title}</h2>
                        </div>
                        <div className="text-right">
                          <span className="ls-num text-3xl font-semibold">{e.total}</span>
                          <span className="ls-num text-sm" style={{ color: "#6B7268" }}>/30</span>
                        </div>
                      </div>

                      {!e.eligible && (
                        <p
                          className="text-xs font-semibold mb-3 px-2 py-1.5"
                          style={{ background: "#F6E2DE", color: "#9E3524" }}
                        >
                          리그 불일치 · {e.eligibility_note}
                        </p>
                      )}

                      <div className="space-y-3">
                        {EL.axes.map((ax) => {
                          const s = e.scores.find((x) => x.id === ax.id);
                          if (!s) return null;
                          return (
                            <div key={ax.id}>
                              <div className="flex items-baseline justify-between mb-1">
                                <span className="text-[13px] font-semibold">{ax.label}</span>
                                <span className="ls-num text-sm">{s.score}</span>
                              </div>
                              <Meter value={s.score} accent={EL.accent} />
                              <p className="text-xs mt-1.5 leading-snug" style={{ color: "#4B534A" }}>
                                {s.why}
                              </p>
                              <p className="text-xs mt-1 leading-snug" style={{ color: "#14171C" }}>
                                <strong>+1 조건 </strong>
                                {s.lift}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-3 border-t" style={{ borderColor: "#C9CCC6" }}>
                        <p className="text-xs font-semibold mb-1">심사장에서 나올 질문</p>
                        <p className="text-sm leading-snug mb-3">{e.killer_question}</p>
                        <p className="text-xs leading-relaxed" style={{ color: "#4B534A" }}>
                          {e.verdict}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {entries.length > 1 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold mb-2 pb-2 border-b-2" style={{ borderColor: "#14171C" }}>
              지금까지 채점한 {entries.length}건
            </h2>
            <div className="divide-y" style={{ borderColor: "#C9CCC6" }}>
              {ranked.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="ls-num text-xs w-6" style={{ color: "#6B7268" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: LEAGUES[e.league].accent }}
                  />
                  <span className="text-sm font-semibold flex-1 truncate">{e.title}</span>
                  <span className="text-[11px] shrink-0" style={{ color: "#6B7268" }}>
                    {LEAGUES[e.league].name}
                  </span>
                  <span className="ls-num text-sm font-semibold w-10 text-right">{e.total}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
