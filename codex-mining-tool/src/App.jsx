import { useMemo, useState } from "react";
import Settings from "./components/Settings.jsx";
import InputPanel from "./components/InputPanel.jsx";
import MiningFloor from "./components/MiningFloor.jsx";
import CodexDrawer from "./components/CodexDrawer.jsx";
import RuleCard from "./components/RuleCard.jsx";
import SummaryBar from "./components/SummaryBar.jsx";
import { buildMiningPrompt } from "./prompt.js";
import { mineRules, friendlyError, MODEL } from "./api.js";
import { normalizeRule } from "./kinds.js";

const KEY_STORAGE = "codex_api_key";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || "");
  const [showSettings, setShowSettings] = useState(false);
  const [standardText, setStandardText] = useState("");
  const [signedText, setSignedText] = useState("");

  const [status, setStatus] = useState("idle"); // idle | mining | done | error
  const [result, setResult] = useState(null); // { rules:[], summary:{} }
  const [error, setError] = useState(null); // { title, msg }

  // --- 서명본 --- 구분 카운트
  const signedCount = useMemo(() => {
    const parts = signedText
      .split(/^\s*---\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length;
  }, [signedText]);

  const saveKey = (k) => {
    localStorage.setItem(KEY_STORAGE, k);
    setApiKey(k);
    setShowSettings(false);
  };
  const deleteKey = () => {
    localStorage.removeItem(KEY_STORAGE);
    setApiKey("");
  };

  async function handleMine() {
    if (!apiKey || !signedText.trim()) return;
    setStatus("mining");
    setError(null);
    try {
      const prompt = buildMiningPrompt(signedText, standardText);
      const raw = await mineRules({ apiKey, prompt });
      const rules = Array.isArray(raw?.rules) ? raw.rules.map(normalizeRule) : [];
      setResult({ rules, summary: raw?.summary || null });
      setStatus("done");
    } catch (err) {
      setError(friendlyError(err));
      setStatus("error");
    }
  }

  const rules = result?.rules || [];
  const confirmed = rules.filter((r) => r.kind !== "hold");
  const holds = rules.filter((r) => r.kind === "hold");
  const hasStandard = standardText.trim().length > 0;

  return (
    <div className="app-wrap">
      <div className="app">
        {/* 헤더 */}
        <header className="masthead">
          <div>
            <span className="brand-kicker">CODEX / clause mining</span>
            <h1 className="brand-title">계약에서 판단을 캐다</h1>
          </div>
          <div className="masthead-right">
            <span className="model-tag">{MODEL}</span>
            <button className="gear-btn" onClick={() => setShowSettings(true)}>
              <span className={"gear-dot " + (apiKey ? "on" : "off")} />⚙ 설정
            </button>
          </div>
        </header>

        {/* 3열: 입력 · 채굴현장 · CODEX */}
        <div className="floor-grid">
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
          <MiningFloor
            status={status}
            signedCount={signedCount}
            result={result}
            error={error}
            onRetry={handleMine}
          />
          <CodexDrawer confirmed={confirmed} hasStandard={hasStandard} />
        </div>

        {/* 사람 확인 큐 — 확정 규칙과 절대 섞지 않는다 */}
        {holds.length > 0 && (
          <div className="hold-queue">
            <div className="hold-head">
              <span className="lbl">needs human · 사람 확인 큐</span>
              <span className="k">{holds.length}</span>
              <span className="why">팀 판단이 갈린 조항 — 모르는 걸 모른다고 남깁니다</span>
            </div>
            <div className="hold-grid">
              {holds.map((r, i) => (
                <RuleCard key={r.id + i} rule={r} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* 하단 숫자판 */}
        {status === "done" && result && (
          <SummaryBar
            summary={result.summary}
            confirmedCount={confirmed.length}
            holdCount={holds.length}
            rulesLen={rules.length}
          />
        )}

        <footer className="foot">
          <span>{MODEL} · direct browser call</span>
          <span>cody · mole docent</span>
        </footer>
      </div>

      <Settings
        open={showSettings}
        currentKey={apiKey}
        onSave={saveKey}
        onDelete={deleteKey}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
