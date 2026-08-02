import { useEffect, useState } from "react";
import {
  loadCategories,
  saveCategories,
  loadPresetLegal,
  PRESET_LEGAL,
} from "../core/categories.js";

// v0.4 조각 6a — [카테고리 설정] 모달 (CLAUDE.md 4.6 · 10.6).
// 사용자가 대·중분류를 정한다. AI는 이 안에서만 분류(6e에서 반영).
// 은유 라벨 금지 — "카테고리 설정"으로 통일(11장).
export default function CategorySetup({ open, onClose, onSaved, ruleCounts = {} }) {
  const [doc, setDoc] = useState({ version: 1, categories: [] });
  const [editingIdx, setEditingIdx] = useState(-1); // 대분류 이름 편집 중
  const [nameDraft, setNameDraft] = useState("");
  const [newMajorInput, setNewMajorInput] = useState("");
  const [newMinorInputs, setNewMinorInputs] = useState({}); // { [majorIdx]: string }

  useEffect(() => {
    if (open) {
      setDoc(loadCategories());
      setEditingIdx(-1);
      setNameDraft("");
      setNewMajorInput("");
      setNewMinorInputs({});
    }
  }, [open]);

  if (!open) return null;

  const isEmpty = doc.categories.length === 0;

  function usePreset() {
    const next = loadPresetLegal();
    setDoc(next);
  }

  function addMajor() {
    const name = newMajorInput.trim();
    if (!name) return;
    if (doc.categories.some((c) => c.name === name)) {
      setNewMajorInput("");
      return;
    }
    setDoc((d) => ({
      ...d,
      categories: [...d.categories, { name, subs: [] }],
    }));
    setNewMajorInput("");
  }

  function startEditName(i) {
    setEditingIdx(i);
    setNameDraft(doc.categories[i].name);
  }

  function commitEditName() {
    if (editingIdx === -1) return;
    const name = nameDraft.trim();
    if (!name) {
      setEditingIdx(-1);
      return;
    }
    setDoc((d) => {
      const cats = d.categories.slice();
      cats[editingIdx] = { ...cats[editingIdx], name };
      return { ...d, categories: cats };
    });
    setEditingIdx(-1);
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= doc.categories.length) return;
    setDoc((d) => {
      const cats = d.categories.slice();
      const [a, b] = [cats[i], cats[j]];
      cats[i] = b;
      cats[j] = a;
      return { ...d, categories: cats };
    });
  }

  function deleteMajor(i) {
    const name = doc.categories[i].name;
    const count = ruleCounts[name] || 0;
    if (count > 0) {
      const ok = window.confirm(
        `"${name}" 카테고리 안 규칙 ${count}개는 저장 시 "미분류"로 옮겨집니다. 계속?`
      );
      if (!ok) return;
    }
    setDoc((d) => ({
      ...d,
      categories: d.categories.filter((_, idx) => idx !== i),
    }));
  }

  function addMinor(i) {
    const val = (newMinorInputs[i] || "").trim();
    if (!val) return;
    setDoc((d) => {
      const cats = d.categories.slice();
      const cur = cats[i];
      if (cur.subs.includes(val)) return d;
      cats[i] = { ...cur, subs: [...cur.subs, val] };
      return { ...d, categories: cats };
    });
    setNewMinorInputs((s) => ({ ...s, [i]: "" }));
  }

  function removeMinor(i, sub) {
    setDoc((d) => {
      const cats = d.categories.slice();
      cats[i] = { ...cats[i], subs: cats[i].subs.filter((s) => s !== sub) };
      return { ...d, categories: cats };
    });
  }

  function saveAndClose() {
    const saved = saveCategories(doc);
    onSaved && onSaved(saved);
    onClose && onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cs-head">
          <div>
            <h2 className="cs-title">카테고리 설정</h2>
            <span className="cs-sub">판단을 분류할 큰 틀</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className="cs-notice">
          먼저 카테고리를 정하세요. 앞으로 모든 판단은 이 카테고리 안에 분류됩니다.
        </div>

        {isEmpty ? (
          <div className="cs-preset-card">
            <div className="cs-preset-title">아직 카테고리가 없습니다</div>
            <div className="cs-preset-desc">
              법무에서 자주 쓰는 6개를 한 번에 불러온 뒤 이름만 다듬어도 됩니다.
            </div>
            <button className="cs-preset-btn" onClick={usePreset}>
              법무 기본 카테고리 불러오기
            </button>
            <div className="cs-preset-preview">
              {PRESET_LEGAL.map((c) => c.name).join(" / ")}
            </div>
          </div>
        ) : (
          <>
            <div className="cs-list-head">
              <span className="cs-list-title">대분류</span>
              <div className="cs-add-major">
                <input
                  className="field cs-add-input"
                  placeholder="새 대분류 이름"
                  value={newMajorInput}
                  onChange={(e) => setNewMajorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMajor();
                    }
                  }}
                />
                <button className="cs-add-btn" onClick={addMajor} disabled={!newMajorInput.trim()}>
                  + 추가
                </button>
              </div>
            </div>

            <div className="cs-list">
              {doc.categories.map((c, i) => (
                <div key={c.name + i} className="cs-card">
                  <div className="cs-card-head">
                    <span className="cs-n">{i + 1}.</span>
                    {editingIdx === i ? (
                      <input
                        className="field cs-name-edit"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitEditName}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEditName();
                          if (e.key === "Escape") setEditingIdx(-1);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="cs-name" onClick={() => startEditName(i)}>
                        {c.name}
                      </span>
                    )}
                    <div className="cs-card-actions">
                      <button className="cs-action" onClick={() => startEditName(i)}>
                        이름 편집
                      </button>
                      <button
                        className="cs-action"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        title="위로"
                      >
                        ↑
                      </button>
                      <button
                        className="cs-action"
                        onClick={() => move(i, 1)}
                        disabled={i === doc.categories.length - 1}
                        title="아래로"
                      >
                        ↓
                      </button>
                      <button className="cs-action danger" onClick={() => deleteMajor(i)}>
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="cs-subs-row">
                    {c.subs.map((s) => (
                      <span key={s} className="cs-sub-pill">
                        {s}
                        <button className="cs-sub-remove" onClick={() => removeMinor(i, s)} title="삭제">
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="cs-add-minor">
                      <input
                        className="field cs-add-minor-input"
                        placeholder="+ 중분류"
                        value={newMinorInputs[i] || ""}
                        onChange={(e) =>
                          setNewMinorInputs((s) => ({ ...s, [i]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addMinor(i);
                          }
                        }}
                      />
                    </div>
                  </div>
                  {ruleCounts[c.name] > 0 && (
                    <div className="cs-card-hint">
                      규칙 {ruleCounts[c.name]}개 · 삭제 시 미분류로 이동
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="cs-foot">
          <span className="cs-foot-hint">
            {isEmpty
              ? "프리셋으로 시작하거나, 직접 대분류를 만드세요."
              : "저장 시 카테고리 밖 규칙은 자동으로 '미분류'로 옮겨집니다."}
          </span>
          <button className="cs-save-btn" onClick={saveAndClose}>
            저장하고 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
