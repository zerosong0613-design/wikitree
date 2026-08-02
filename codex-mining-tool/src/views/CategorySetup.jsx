import { useEffect, useState } from "react";
import {
  loadCategories,
  saveCategories,
  loadPresetLegal,
  loadPresetOrigin,
  loadPresetDepartment,
  PRESET_LEGAL,
  PRESET_ORIGIN,
  PRESET_DEPARTMENT,
} from "../core/categories.js";

// v0.5 조각 7b — [카테고리 설정] 3축 탭 (CLAUDE.md 4.6 · 10.6).
// 판단·원천·의뢰부서 세 닫힌 축을 사람이 관리.
// 판단만 subs(중분류) 있음. 원천·부서는 단일 값 리스트.
const AXES = [
  { key: "판단", label: "판단", desc: "판단이 걸리는 성격", withSubs: true, preset: PRESET_LEGAL, loader: loadPresetLegal, presetLabel: "법무 기본 판단 축 불러오기" },
  { key: "원천", label: "원천", desc: "지식이 어디서 나왔나 (계약·자문·회의·사고·규제 등)", withSubs: false, preset: PRESET_ORIGIN, loader: loadPresetOrigin, presetLabel: "기본 원천 목록 불러오기" },
  { key: "의뢰부서", label: "의뢰부서", desc: "판단을 요청한 부서", withSubs: false, preset: PRESET_DEPARTMENT, loader: loadPresetDepartment, presetLabel: "기본 부서 목록 불러오기" },
];

export default function CategorySetup({ open, onClose, onSaved, ruleCounts = {} }) {
  const [doc, setDoc] = useState({ version: 2, "판단": [], "원천": [], "의뢰부서": [] });
  const [activeAxis, setActiveAxis] = useState("판단");
  const [editingIdx, setEditingIdx] = useState(-1);
  const [nameDraft, setNameDraft] = useState("");
  const [newItemInput, setNewItemInput] = useState("");
  const [newSubInputs, setNewSubInputs] = useState({});

  useEffect(() => {
    if (open) {
      setDoc(loadCategories());
      setActiveAxis("판단");
      setEditingIdx(-1);
      setNameDraft("");
      setNewItemInput("");
      setNewSubInputs({});
    }
  }, [open]);

  if (!open) return null;

  const axisDef = AXES.find((a) => a.key === activeAxis) || AXES[0];
  const list = doc[activeAxis] || [];
  const isEmpty = list.length === 0;

  function updateAxis(nextList) {
    setDoc((d) => ({ ...d, [activeAxis]: nextList }));
  }

  function usePreset() {
    // 현재 축만 프리셋으로 심고 다른 축은 유지
    const withPreset = {
      ...doc,
      [activeAxis]: axisDef.preset.map((c) =>
        axisDef.withSubs ? { name: c.name, subs: [...(c.subs || [])] } : { name: c.name }
      ),
    };
    setDoc(withPreset);
  }

  function addItem() {
    const name = newItemInput.trim();
    if (!name) return;
    if (list.some((c) => c.name === name)) {
      setNewItemInput("");
      return;
    }
    updateAxis([...list, axisDef.withSubs ? { name, subs: [] } : { name }]);
    setNewItemInput("");
  }

  function startEditName(i) {
    setEditingIdx(i);
    setNameDraft(list[i].name);
  }

  function commitEditName() {
    if (editingIdx === -1) return;
    const name = nameDraft.trim();
    if (!name) {
      setEditingIdx(-1);
      return;
    }
    const nextList = list.slice();
    nextList[editingIdx] = { ...nextList[editingIdx], name };
    updateAxis(nextList);
    setEditingIdx(-1);
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const nextList = list.slice();
    const [a, b] = [nextList[i], nextList[j]];
    nextList[i] = b;
    nextList[j] = a;
    updateAxis(nextList);
  }

  function deleteItem(i) {
    const name = list[i].name;
    // 판단 축만 삭제 경고 (ruleCounts는 판단 대분류 기준)
    if (activeAxis === "판단") {
      const count = ruleCounts[name] || 0;
      if (count > 0) {
        const ok = window.confirm(
          `"${name}" 판단 축 안 규칙 ${count}개는 저장 시 "미분류"로 옮겨집니다. 계속?`
        );
        if (!ok) return;
      }
    } else {
      // 원천·부서는 저장 시 해당 태그가 null로 (안내만)
      if (!window.confirm(`"${name}"을 ${activeAxis} 축에서 삭제할까요? 관련 태그는 저장 시 비워집니다.`))
        return;
    }
    updateAxis(list.filter((_, idx) => idx !== i));
  }

  function addSub(i) {
    if (!axisDef.withSubs) return;
    const val = (newSubInputs[i] || "").trim();
    if (!val) return;
    const nextList = list.slice();
    const cur = nextList[i];
    if (cur.subs?.includes(val)) return;
    nextList[i] = { ...cur, subs: [...(cur.subs || []), val] };
    updateAxis(nextList);
    setNewSubInputs((s) => ({ ...s, [i]: "" }));
  }

  function removeSub(i, sub) {
    if (!axisDef.withSubs) return;
    const nextList = list.slice();
    nextList[i] = {
      ...nextList[i],
      subs: (nextList[i].subs || []).filter((s) => s !== sub),
    };
    updateAxis(nextList);
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
            <span className="cs-sub">판단을 분류할 큰 틀 · 3축</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        {/* 축 탭 */}
        <div className="cs-axis-tabs">
          {AXES.map((a) => (
            <button
              key={a.key}
              className={"cs-axis-tab" + (a.key === activeAxis ? " on" : "")}
              onClick={() => {
                setActiveAxis(a.key);
                setEditingIdx(-1);
                setNewItemInput("");
              }}
              title={a.desc}
            >
              {a.label}
              <span className="cs-axis-count">
                {(doc[a.key] || []).length}
              </span>
            </button>
          ))}
        </div>

        <div className="cs-notice">
          <b>{axisDef.label}</b> — {axisDef.desc}
        </div>

        {isEmpty ? (
          <div className="cs-preset-card">
            <div className="cs-preset-title">
              {activeAxis} 축이 비어 있어요
            </div>
            <div className="cs-preset-desc">
              기본 목록을 불러온 뒤 이름만 다듬어도 됩니다.
            </div>
            <button className="cs-preset-btn" onClick={usePreset}>
              {axisDef.presetLabel}
            </button>
            <div className="cs-preset-preview">
              {axisDef.preset.map((c) => c.name).join(" / ")}
            </div>
          </div>
        ) : (
          <>
            <div className="cs-list-head">
              <span className="cs-list-title">
                {axisDef.label} 목록
              </span>
              <div className="cs-add-major">
                <input
                  className="field cs-add-input"
                  placeholder={`새 ${axisDef.label} 이름`}
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                />
                <button
                  className="cs-add-btn"
                  onClick={addItem}
                  disabled={!newItemInput.trim()}
                >
                  + 추가
                </button>
              </div>
            </div>

            <div className="cs-list">
              {list.map((c, i) => (
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
                        disabled={i === list.length - 1}
                        title="아래로"
                      >
                        ↓
                      </button>
                      <button className="cs-action danger" onClick={() => deleteItem(i)}>
                        삭제
                      </button>
                    </div>
                  </div>

                  {axisDef.withSubs && (
                    <div className="cs-subs-row">
                      {(c.subs || []).map((s) => (
                        <span key={s} className="cs-sub-pill">
                          {s}
                          <button
                            className="cs-sub-remove"
                            onClick={() => removeSub(i, s)}
                            title="삭제"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <div className="cs-add-minor">
                        <input
                          className="field cs-add-minor-input"
                          placeholder="+ 중분류"
                          value={newSubInputs[i] || ""}
                          onChange={(e) =>
                            setNewSubInputs((s) => ({ ...s, [i]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSub(i);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {activeAxis === "판단" && ruleCounts[c.name] > 0 && (
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
              ? "프리셋으로 시작하거나 직접 추가하세요."
              : `저장 시 모든 축이 함께 보관됩니다. 다른 축은 그대로 유지돼요.`}
          </span>
          <button className="cs-save-btn" onClick={saveAndClose}>
            저장하고 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
