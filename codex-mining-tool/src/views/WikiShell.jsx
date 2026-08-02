import { useEffect, useMemo } from "react";
import TocPanel from "./TocPanel.jsx";
import RulePage from "./RulePage.jsx";
import NewRuleForm from "./NewRuleForm.jsx";
import AiFindPanel from "./AiFindPanel.jsx";

// 위키 셸 (CLAUDE.md v0.4 10.2). 앱의 유일한 화면.
// - 좌 25% 목차 / 중 50% 룰 페이지 / 우 25% AI 찾기
// - 선택 상태는 App.jsx 소유. 카테고리도 App에서 흘러들어옴.
// - v0.4: 목차는 순수 지도 (onTreeChange·onRequireAuthor·apiKey를 TocPanel에 넘기지 않음).
//   룰 페이지 편집·AI 찾기용 프롭은 그대로 전달.
export default function WikiShell({
  rules,
  categoriesDoc,
  selectedRuleId,
  onSelectRule,
  onOpenCategorySetup,
  // 룰 페이지 편집
  onTreeChange,
  onRequireAuthor,
  // AI 찾기
  apiKey,
  aiQuery,
  aiTrigger,
  onOpenSettings,
  // v0.4 조각 6c: 새 룰 모드
  newRuleMode,
  onSaveNewRule,
  onCancelNewRule,
  // v0.5 조각 7c: 축 토글
  axis,
  onAxisChange,
}) {
  // 트리에 룰 있을 때 초기 선택: 첫 hard, 없으면 첫 룰
  const derivedInitial = useMemo(() => {
    if (!rules.length) return null;
    const firstHard = rules.find((r) => r.kind === "hard");
    return (firstHard || rules[0]).id;
  }, [rules]);

  // 부모가 선택 id를 관리하지만, 초기값이 없으면 파생값으로 한 번 세팅
  useEffect(() => {
    if (!selectedRuleId && derivedInitial) {
      onSelectRule && onSelectRule(derivedInitial);
    }
    // 선택된 룰이 트리에서 사라졌으면 재선택
    if (selectedRuleId && !rules.find((r) => r.id === selectedRuleId)) {
      onSelectRule && onSelectRule(derivedInitial);
    }
  }, [selectedRuleId, derivedInitial, rules, onSelectRule]);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || null;

  return (
    <div className="wiki-body">
      <TocPanel
        rules={rules}
        categoriesDoc={categoriesDoc}
        selectedRuleId={selectedRuleId}
        onSelect={onSelectRule}
        onOpenCategorySetup={onOpenCategorySetup}
        axis={axis}
        onAxisChange={onAxisChange}
      />
      {newRuleMode ? (
        <NewRuleForm
          categoriesDoc={categoriesDoc}
          apiKey={apiKey}
          onSaved={onSaveNewRule}
          onCancel={onCancelNewRule}
          onOpenCategorySetup={onOpenCategorySetup}
          onRequireAuthor={onRequireAuthor}
        />
      ) : (
        <RulePage
          rule={selectedRule}
          rules={rules}
          categoriesDoc={categoriesDoc}
          onSelectRule={onSelectRule}
          onTreeChange={onTreeChange}
          onRequireAuthor={onRequireAuthor}
        />
      )}
      <AiFindPanel
        apiKey={apiKey}
        rules={rules}
        aiQuery={aiQuery}
        aiTrigger={aiTrigger}
        onSelectRule={onSelectRule}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
