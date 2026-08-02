import { useEffect, useState } from "react";
import { getAuthorName, setAuthorName, clearAuthorName } from "../core/authoring.js";

// ⚙ 설정 — API 키 + 내 이름(저작자).
// - API 키: localStorage(codex_api_key)에만 저장. App.jsx에서 상태 소유.
// - 내 이름: localStorage(codex_author_name)에만 저장. authoring.js에서 소유.
//   편집 시 자동으로 룰의 authors·history에 박힌다. (CLAUDE.md 2장·10.5)
export default function Settings({ open, currentKey, onSave, onDelete, onClose }) {
  const [val, setVal] = useState(currentKey || "");
  const [nameVal, setNameVal] = useState("");
  const [savedName, setSavedName] = useState("");
  const [nameFlash, setNameFlash] = useState("");

  useEffect(() => {
    if (open) {
      setVal(currentKey || "");
      const n = getAuthorName();
      setNameVal(n);
      setSavedName(n);
      setNameFlash("");
    }
  }, [open, currentKey]);

  if (!open) return null;

  const masked = currentKey
    ? currentKey.slice(0, 10) + "…" + currentKey.slice(-4)
    : null;

  function saveName() {
    const clean = nameVal.trim();
    if (!clean) return;
    setAuthorName(clean);
    setSavedName(clean);
    setNameFlash("이름 저장됨");
    setTimeout(() => setNameFlash(""), 1500);
  }

  function deleteName() {
    clearAuthorName();
    setNameVal("");
    setSavedName("");
    setNameFlash("이름 삭제됨");
    setTimeout(() => setNameFlash(""), 1500);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>⚙ 설정</h2>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        {/* API 키 섹션 */}
        <h3 style={{ margin: "8px 0 6px", fontSize: 14 }}>API 키</h3>
        <p>
          Anthropic API 키를 넣어주세요. 키는 이 브라우저의 <b>localStorage</b>(
          <code>codex_api_key</code>)에만 저장되고, 코드·레포·서버 어디에도 남지 않아요.
        </p>
        <div className={"key-status" + (masked ? " on" : "")}>
          {masked ? `저장된 키: ${masked}` : "저장된 키 없음"}
        </div>
        <input
          className="key-input"
          type="password"
          placeholder="sk-ant-..."
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="modal-actions">
          <button
            className="btn primary"
            onClick={() => onSave(val.trim())}
            disabled={!val.trim()}
          >
            저장
          </button>
          <button className="btn ghost" onClick={onDelete} disabled={!currentKey}>
            삭제
          </button>
        </div>

        {/* 구분선 */}
        <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid rgba(20,23,28,0.12)" }} />

        {/* 내 이름 (저작자) 섹션 — v0.3 */}
        <h3 style={{ margin: "8px 0 6px", fontSize: 14 }}>내 이름 (저작자)</h3>
        <p>
          편집 시 자동으로 룰의 <b>저작자·이력</b>에 이 이름이 박힙니다. 로컬(
          <code>codex_author_name</code>)에만 저장돼요.
        </p>
        <div className={"key-status" + (savedName ? " on" : "")}>
          {savedName ? `저장된 이름: ${savedName}` : "저장된 이름 없음"}
        </div>
        <input
          className="key-input"
          type="text"
          placeholder="예: 김변호사"
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          style={{ letterSpacing: "normal" }}
        />
        <div className="modal-actions">
          <button className="btn primary" onClick={saveName} disabled={!nameVal.trim()}>
            저장
          </button>
          <button className="btn ghost" onClick={deleteName} disabled={!savedName}>
            삭제
          </button>
        </div>
        {nameFlash ? (
          <div className="flash" style={{ marginTop: 8 }}>✓ {nameFlash}</div>
        ) : null}
      </div>
    </div>
  );
}
