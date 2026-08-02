import { useEffect, useRef, useState } from "react";

// 인라인 편집 필드 (v0.3 조각 3, CLAUDE.md 10.5).
// - 기본: 자식(children) 렌더 · hover 시 은은한 힌트 · 클릭 시 편집 모드로 전환.
// - 편집 모드: input(single) 또는 textarea(multiline), autoFocus.
// - 엔터/blur = 저장, Esc = 취소. 값 변화 없으면 저장 호출 안 함(불필요 stamp 방지).
// - onSave가 throw하면(예: NoAuthorError) editing 유지 → onRequireAuthor 부모에서 처리.
export default function EditableField({
  value,
  multiline = false,
  placeholder = "클릭해서 편집",
  className = "",
  displayClassName = "",
  editingClassName = "",
  onSave,
  onRequireAuthor,
  emptyRender,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // 커서 끝으로
      const el = inputRef.current;
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    }
  }, [editing]);

  function beginEdit() {
    setDraft(value || "");
    setError("");
    setEditing(true);
  }

  function cancel() {
    setDraft(value || "");
    setError("");
    setEditing(false);
  }

  async function commit() {
    const next = (draft || "").trim();
    const cur = (value || "").trim();
    if (next === cur) {
      setEditing(false);
      return;
    }
    try {
      await onSave(next);
      setEditing(false);
      setError("");
    } catch (err) {
      if (err?.name === "NoAuthorError") {
        setError("⚙ 설정에서 내 이름을 먼저 넣어주세요.");
        onRequireAuthor && onRequireAuthor();
      } else {
        setError("저장 실패: " + (err?.message || String(err)));
      }
    }
  }

  function handleKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Enter") {
      if (multiline && !e.ctrlKey && !e.metaKey) return; // multiline: Ctrl+Enter로만 저장
      e.preventDefault();
      commit();
    }
  }

  if (!editing) {
    const isEmpty = !value || !String(value).trim();
    return (
      <div
        className={`editable-field ${displayClassName || className} ${isEmpty ? "empty" : ""}`}
        onClick={beginEdit}
        title="클릭해서 편집"
      >
        {isEmpty ? (
          emptyRender ? emptyRender : <span className="ef-placeholder">{placeholder}</span>
        ) : (
          <span className="ef-value">{value}</span>
        )}
      </div>
    );
  }

  const CommonProps = {
    ref: inputRef,
    value: draft,
    onChange: (e) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: handleKey,
    className: `field ${editingClassName || className}`,
    placeholder,
  };

  return (
    <div className="editable-field editing">
      {multiline ? <textarea rows={3} {...CommonProps} /> : <input type="text" {...CommonProps} />}
      {error ? <div className="ef-error">{error}</div> : null}
    </div>
  );
}
