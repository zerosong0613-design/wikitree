// 미터 — 10칸, held/total로 채움. 6번째 칸 뒤가 점선(임계). hold는 진흙색.
export default function Meter({ held, total, muddy }) {
  const filled = total > 0 ? Math.round((held / total) * 10) : 0;
  const cells = [];
  for (let i = 0; i < 10; i++) {
    const on = i < filled;
    cells.push(
      <div
        key={i}
        className="meter-cell"
        style={{
          background: on ? (muddy ? "#8a9086" : "#14171c") : "#e9ebe6",
          borderRightStyle: i === 5 ? "dashed" : "solid",
          borderRightWidth: i === 5 ? "2px" : "1.5px",
        }}
      />
    );
  }
  return <div className="meter">{cells}</div>;
}
