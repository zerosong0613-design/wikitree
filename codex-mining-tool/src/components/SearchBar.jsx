// 상단 검색바 (CLAUDE.md 10.2 — 정문).
// 지금은 키워드 즉시 필터만. 엔터 시 AI 찾기 승격은 조각 4의 몫.
export default function SearchBar({ query, onChange }) {
  return (
    <div className="search-bar">
      <span className="search-bar-icon">⌕</span>
      <input
        type="text"
        placeholder="검색... (엔터: AI 찾기 — 조각 4에서 실체)"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
