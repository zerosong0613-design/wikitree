// 상단 검색바 (CLAUDE.md 10.2 — 정문).
// - v0.3: AI 찾기 전용 정문. 타이핑 중에는 좌측 목차를 건드리지 않는다
//   (사용자 방해 방지 — 좌측은 언제나 전체 트리).
// - 엔터 → onSubmit(query) → 우측 AI 찾기 실행.
export default function SearchBar({ query, onChange, onSubmit }) {
  function handleKey(e) {
    if (e.key === "Enter" && onSubmit) {
      e.preventDefault();
      const q = (query || "").trim();
      if (q) onSubmit(q);
    }
  }
  return (
    <div className="search-bar">
      <span className="search-bar-icon">⌕</span>
      <input
        type="text"
        placeholder="트리에 물어보기 → 엔터로 AI 찾기"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        spellCheck={false}
      />
    </div>
  );
}
