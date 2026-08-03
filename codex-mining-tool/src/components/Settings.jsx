import { useEffect, useState } from "react";

// ⚙ 설정 — API 키 입력/저장/삭제. 키는 localStorage(codex_api_key)에만 저장된다.
export default function Settings({ open, currentKey, onSave, onDelete, onClose }) {
  const [val, setVal] = useState(currentKey || "");

  useEffect(() => {
    if (open) setVal(currentKey || "");
  }, [open, currentKey]);

  if (!open) return null;

  const masked = currentKey
    ? currentKey.slice(0, 10) + "…" + currentKey.slice(-4)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>⚙ 설정 — API 키</h2>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
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
      </div>
    </div>
  );
}
