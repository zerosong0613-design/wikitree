import { useState } from "react";
import { normalizeRule, KIND_ORDER, DEFAULT_LABEL } from "../core/schema.js";
import { addRules } from "../core/store.js";
import { stampAuthoring, NoAuthorError } from "../core/authoring.js";

// 6.2 수동 폼 (v0.2 "수동 입력" 개칭) — 인라인이 부족할 때 신중히 세팅.
// path + 판단문 + kind + note → 4장 스키마로 코어에 주입.
// v0.3: 저장 직전 stampAuthoring 통과 → authors·history 자동 stamp.
export default function ManualEntry({ onInjected }) {
  const [major, setMajor] = useState("");
  const [minor, setMinor] = useState("");
  const [item, setItem] = useState("");
  const [judgment, setJudgment] = useState("");
  const [kind, setKind] = useState("soft");
  const [note, setNote] = useState("");
  const [held, setHeld] = useState("");
  const [total, setTotal] = useState("");
  const [flash, setFlash] = useState("");

  const canAdd = major.trim() && judgment.trim();

  function add() {
    if (!canAdd) return;
    const path = [major, minor, item].map((s) => s.trim()).filter(Boolean);
    const h = parseInt(held, 10);
    const t = parseInt(total, 10);
    const rule = normalizeRule({
      path,
      judgment: judgment.trim(),
      kind,
      note: note.trim(),
      held: Number.isFinite(h) ? h : 0,
      total: Number.isFinite(t) ? t : 0,
      badge: Number.isFinite(h) && Number.isFinite(t) && t > 0 ? `관철 ${h}/${t}` : "",
      origin: "수동 폼", // v0.3: "수동 입력" → "수동 폼" 개칭
      status: "candidate",
    });

    try {
      const stamped = stampAuthoring(rule, "수동 폼으로 등재");
      const tree = addRules([stamped]);
      onInjected(tree);
      setFlash(`트리에 추가: ${path.join(" / ")}`);
      setJudgment("");
      setItem("");
      setNote("");
      setHeld("");
      setTotal("");
    } catch (err) {
      if (err instanceof NoAuthorError) {
        setFlash("⚙ 설정에서 내 이름을 먼저 넣어주세요.");
      } else {
        setFlash("저장 실패: " + (err?.message || String(err)));
      }
    }
  }

  return (
    <div className="entry-manual">
      <div className="path-row">
        <input className="field" placeholder="대분류 *" value={major} onChange={(e) => setMajor(e.target.value)} />
        <span className="sep">/</span>
        <input className="field" placeholder="중분류" value={minor} onChange={(e) => setMinor(e.target.value)} />
        <span className="sep">/</span>
        <input className="field" placeholder="항목" value={item} onChange={(e) => setItem(e.target.value)} />
      </div>
      <textarea
        className="field area"
        placeholder="판단 한 문장 * (예: 배상 상한은 계약 총액 이내로 묶는다)"
        value={judgment}
        onChange={(e) => setJudgment(e.target.value)}
      />
      <div className="manual-row">
        <div className="kind-pick">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              className={"kind-btn " + (kind === k ? "on" : "") + " k-" + k}
              onClick={() => setKind(k)}
              type="button"
            >
              {DEFAULT_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="num-pick">
          <input className="field num" placeholder="관철" value={held} onChange={(e) => setHeld(e.target.value)} inputMode="numeric" />
          <span className="sep">/</span>
          <input className="field num" placeholder="총" value={total} onChange={(e) => setTotal(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      <input className="field" placeholder="근거·양보 이력 한 줄 (선택)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="mine-btn" onClick={add} disabled={!canAdd}>
        + 트리에 심기
      </button>
      {flash ? <div className="flash">✓ {flash}</div> : null}
    </div>
  );
}
