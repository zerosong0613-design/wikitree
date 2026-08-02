import { useEffect, useMemo, useState } from "react";
import TocPanel from "./TocPanel.jsx";
import RulePage from "./RulePage.jsx";
import AiFindPanel from "./AiFindPanel.jsx";

// 위키 셸 (CLAUDE.md 10.1). 앱의 유일한 화면.
// - 좌 25% 목차 / 중 50% 룰 페이지 / 우 25% AI 찾기 자리
// - 선택 상태·검색 상태는 여기서 소유
// - 상단 검색바·"…더보기"·설정은 App.jsx의 상단 바에서 트리거 → App state로 전달
export default function WikiShell({ rules, query, selectedRuleId, onSelectRule }) {
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
        query={query}
        selectedRuleId={selectedRuleId}
        onSelect={onSelectRule}
      />
      <RulePage rule={selectedRule} />
      <AiFindPanel />
    </div>
  );
}
