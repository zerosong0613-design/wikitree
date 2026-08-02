import { useMemo, useState } from "react";
import Settings from "./components/Settings.jsx";
import SearchBar from "./components/SearchBar.jsx";
import WikiShell from "./views/WikiShell.jsx";
import MoreDrawer from "./views/MoreDrawer.jsx";
import CategorySetup from "./views/CategorySetup.jsx";
import { MODEL } from "./api.js";
import { loadTree, clearTree } from "./core/store.js";
import { loadCategories, countRulesByMajor } from "./core/categories.js";
import { downloadWikitreeMd } from "./core/mdExport.js";

// v0.3 앱 셸 (CLAUDE.md 10장).
// 3탭 폐기 — 위키가 곧 앱. 상단 바(브랜드·검색바·md 저장·…더보기·설정) + WikiShell.
const KEY_STORAGE = "codex_api_key";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || "");
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showCategorySetup, setShowCategorySetup] = useState(false);
  const [tree, setTree] = useState(() => loadTree());
  const [categoriesDoc, setCategoriesDoc] = useState(() => loadCategories());
  const [query, setQuery] = useState("");
  const [selectedRuleId, setSelectedRuleIdRaw] = useState(null);
  const [newRuleMode, setNewRuleMode] = useState(false);
  const [axis, setAxis] = useState("판단"); // v0.5 조각 7c: 위키 축 토글

  // 룰 선택 시 자동으로 새 룰 모드 종료 (사용자 흐름 자연스럽게)
  const setSelectedRuleId = (id) => {
    setSelectedRuleIdRaw(id);
    if (newRuleMode) setNewRuleMode(false);
  };

  const openNewRule = () => setNewRuleMode(true);
  const exitNewRule = () => setNewRuleMode(false);
  const handleSaveNewRule = (newTree, newRule) => {
    setTree(newTree);
    if (newRule?.id) setSelectedRuleIdRaw(newRule.id);
    setNewRuleMode(false);
  };

  const ruleCounts = useMemo(() => countRulesByMajor(tree), [tree]);
  // v0.3 조각 4: 검색바 엔터 → AI 찾기 승격.
  // aiTrigger는 동일 질문 재실행용 카운터.
  const [aiQuery, setAiQuery] = useState("");
  const [aiTrigger, setAiTrigger] = useState(0);
  const submitAiQuery = (q) => {
    setAiQuery(q);
    setAiTrigger((t) => t + 1);
    // 목차 필터는 해제 — 좌측은 전체 트리를 유지, 우측 AI 답 옆에서 트리 맥락을 유지한다.
    // (질문은 우측 패널 textarea에 그대로 남는다.)
    setQuery("");
  };

  const saveKey = (k) => {
    localStorage.setItem(KEY_STORAGE, k);
    setApiKey(k);
    setShowSettings(false);
  };
  const deleteKey = () => {
    localStorage.removeItem(KEY_STORAGE);
    setApiKey("");
  };

  const resetTree = () => {
    if (!tree.length) return;
    if (!window.confirm("codex_tree를 비웁니다. 되돌릴 수 없어요. 계속할까요?")) return;
    clearTree();
    setTree([]);
    setSelectedRuleId(null);
  };

  return (
    <div className="wiki-shell">
      {/* 다크 상단 바 */}
      <nav className="topnav">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span className="brand-name">CODEX</span>
          <span className="brand-sub">판단 위키</span>
        </div>

        {/* 상단 좌측 액션 — [판단 찾기] · [지식 넣기] 토글 */}
        <div className="topnav-actions">
          <button
            className={"nav-tab" + (!newRuleMode ? " active" : "")}
            onClick={exitNewRule}
            title="위키에서 판단 찾기·읽기·편집"
          >
            판단 찾기
          </button>
          <button
            className={"nav-tab" + (newRuleMode ? " active" : "")}
            onClick={openNewRule}
            title="새 판단을 룰 페이지에서 등재"
          >
            지식 넣기
          </button>
        </div>

        {/* 검색바 (정문) — 즉시 필터 + 엔터 시 AI 찾기 승격 */}
        <SearchBar query={query} onChange={setQuery} onSubmit={submitAiQuery} />

        <div className="topnav-right">
          <button
            className="nav-ghost"
            onClick={() => setShowCategorySetup(true)}
            title="판단을 분류할 큰 틀"
          >
            카테고리 설정
          </button>
          <button
            className="nav-ghost"
            onClick={() => setShowMore(true)}
            title="편집 방식·마이닝·검토"
          >
            …더보기
          </button>
          <button
            className="nav-ghost"
            onClick={() => downloadWikitreeMd(tree)}
            disabled={!tree.length}
            title="위키를 md 한 장으로"
          >
            md 저장
          </button>
          <span className="tree-count">codex_tree {tree.length}</span>
          <span className="model-tag light">{MODEL}</span>
          {tree.length > 0 && (
            <button className="nav-ghost" onClick={resetTree} title="트리 비우기">
              비우기
            </button>
          )}
          <button className="nav-gear" onClick={() => setShowSettings(true)}>
            <span className={"gear-dot " + (apiKey ? "on" : "off")} />⚙
          </button>
        </div>
      </nav>

      {/* 위키 셸 본문 (3판) */}
      <WikiShell
        rules={tree}
        categoriesDoc={categoriesDoc}
        selectedRuleId={selectedRuleId}
        onSelectRule={setSelectedRuleId}
        onOpenCategorySetup={() => setShowCategorySetup(true)}
        onTreeChange={setTree}
        onRequireAuthor={() => setShowSettings(true)}
        apiKey={apiKey}
        aiQuery={aiQuery}
        aiTrigger={aiTrigger}
        onOpenSettings={() => setShowSettings(true)}
        newRuleMode={newRuleMode}
        onSaveNewRule={handleSaveNewRule}
        onCancelNewRule={exitNewRule}
        axis={axis}
        onAxisChange={setAxis}
      />

      {/* "…더보기" 드로어 — 무거운 편집·렌즈 격리 */}
      <MoreDrawer
        open={showMore}
        onClose={() => setShowMore(false)}
        apiKey={apiKey}
        onInjected={setTree}
        onOpenSettings={() => {
          setShowMore(false);
          setShowSettings(true);
        }}
        categoriesDoc={categoriesDoc}
      />

      {/* 설정 모달 (API 키 + 내 이름) */}
      <Settings
        open={showSettings}
        currentKey={apiKey}
        onSave={saveKey}
        onDelete={deleteKey}
        onClose={() => setShowSettings(false)}
      />

      {/* [카테고리 설정] 모달 — v0.4 조각 6a */}
      <CategorySetup
        open={showCategorySetup}
        onClose={() => setShowCategorySetup(false)}
        onSaved={(doc) => {
          setCategoriesDoc(doc);
          // 카테고리 변경 시 트리 재로드(없어진 카테고리 룰은 다음 저장 때 미분류로).
          setTree(loadTree());
        }}
        ruleCounts={ruleCounts}
      />
    </div>
  );
}
