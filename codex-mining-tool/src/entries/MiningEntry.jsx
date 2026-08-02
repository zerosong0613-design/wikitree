import { useMemo, useState } from "react";
import InputPanel from "../components/InputPanel.jsx";
import MiningFloor from "../components/MiningFloor.jsx";
import RuleCard from "../components/RuleCard.jsx";
import { buildMiningPrompt } from "../prompt.js";
import { mineRules, friendlyError } from "../api.js";
import { normalizeRule } from "../core/schema.js";
import { addRules } from "../core/store.js";
import { stampAuthoring, NoAuthorError, getAuthorName } from "../core/authoring.js";

// 6.4 계약 마이닝 (대량, 초기 부트스트랩용). 코어에 candidate로 주입한다.
// v0.3: 채굴한 각 룰은 사용자 본인 이름 + role="초안"으로 stamp된다
//       ("이 사람이 이 마이닝을 돌렸다"는 의미. CLAUDE.md 6.4·2장).
export default function MiningEntry({ apiKey, onInjected }) {
  const [standardText, setStandardText] = useState("");
  const [signedText, setSignedText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | mining | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [added, setAdded] = useState([]); // 이번 채굴로 트리에 들어간 룰(정규화)

  const signedCount = useMemo(
    () => signedText.split(/^\s*---\s*$/m).map((s) => s.trim()).filter(Boolean).length,
    [signedText]
  );

  async function handleMine() {
    if (!apiKey || !signedText.trim()) return;
    // v0.3: 저작자 없이 마이닝하지 않는다. API 호출 전 미리 막는다.
    if (!getAuthorName()) {
      setError({
        title: "이름이 필요해요",
        msg: "⚙ 설정에서 내 이름을 먼저 넣어주세요. 마이닝한 룰의 저작자(초안)로 자동으로 박힙니다.",
      });
      setStatus("error");
      return;
    }
    setStatus("mining");
    setError(null);
    try {
      const prompt = buildMiningPrompt(signedText, standardText);
      const raw = await mineRules({ apiKey, prompt });
      const rules = Array.isArray(raw?.rules)
        ? raw.rules.map((r, i) => normalizeRule({ ...r, origin: r.origin || "계약 마이닝(diff)", status: "candidate" }, i))
        : [];
      // v0.3: 채굴 결과 각 룰에 저작자·history 자동 stamp (role="초안").
      const stamped = rules.map((r) => stampAuthoring(r, "계약 마이닝으로 등재"));
      const tree = addRules(stamped); // 코어에 병합 주입
      onInjected(tree);
      setAdded(stamped);
      setResult({ rules: stamped, summary: raw?.summary || null });
      setStatus("done");
    } catch (err) {
      if (err instanceof NoAuthorError) {
        setError({ title: "이름이 필요해요", msg: err.message });
      } else {
        setError(friendlyError(err));
      }
      setStatus("error");
    }
  }

  const confirmed = added.filter((r) => r.kind !== "hold");
  const holds = added.filter((r) => r.kind === "hold");

  return (
    <div className="entry-mining">
      <div className="mining-grid">
        <InputPanel
          standardText={standardText}
          signedText={signedText}
          signedCount={signedCount}
          onStandardChange={setStandardText}
          onSignedChange={setSignedText}
          hasKey={!!apiKey}
          mining={status === "mining"}
          onMine={handleMine}
        />
        <MiningFloor status={status} signedCount={signedCount} result={result} error={error} onRetry={handleMine} />
        <section className="panel">
          <div className="drawer-head">
            <span className="panel-label">이번 채굴 → 트리 주입</span>
            <span className="drawer-count">{String(confirmed.length).padStart(2, "0")}</span>
          </div>
          <p className="drawer-hint">
            채굴 결과는 <b>candidate</b>로 트리에 병합됩니다. 같은 path는 숫자만 커져요. 전체는 [위키트리] 탭에서 확인.
          </p>
          {confirmed.length === 0 ? (
            <div className="empty-state">
              <span className="mono">empty</span>
              <span style={{ fontSize: 13 }}>아직 채굴 결과가 없어요</span>
            </div>
          ) : (
            <div className="rule-list">
              {confirmed.map((r, i) => (
                <RuleCard key={r.id + i} rule={r} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>

      {holds.length > 0 && (
        <div className="hold-queue">
          <div className="hold-head">
            <span className="lbl">needs human · 사람 확인 큐</span>
            <span className="k">{holds.length}</span>
            <span className="why">팀 판단이 갈린 조항 — 트리엔 들어갔지만 사각지대로 표시됩니다</span>
          </div>
          <div className="hold-grid">
            {holds.map((r, i) => (
              <RuleCard key={r.id + i} rule={r} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
