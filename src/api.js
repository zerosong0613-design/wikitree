// 브라우저에서 Claude API를 직접 호출한다.
//
// 모델 ID는 아래 상수로 뺀다. docs.claude.com 기준 현재 Sonnet 라인은
//   - claude-sonnet-4-6  (Sonnet 4.6, 안정 · 기본값)
//   - claude-sonnet-5    (Sonnet 5, 최신 — 채굴 결과를 더 원하면 이걸로 교체)
// Sonnet 4.6은 thinking을 명시하지 않으면 사고 토큰을 쓰지 않아
// max_tokens 2000을 JSON 출력에 온전히 쓸 수 있어 이 도구에 안전하다.
export const MODEL = "claude-sonnet-4-6";

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export class ParseError extends Error {
  constructor(raw) {
    super("모델 응답을 JSON으로 읽지 못했습니다.");
    this.name = "ParseError";
    this.raw = raw;
  }
}

// 응답 텍스트에서 ```json 펜스를 제거하고 JSON.parse.
export function parseModelJson(text) {
  let t = (text || "").trim();
  // ```json ... ``` 또는 ``` ... ``` 펜스 제거
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    // 앞뒤 잡텍스트가 있으면 가장 바깥 중괄호만 잘라 재시도
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s !== -1 && e !== -1 && e > s) {
      try {
        return JSON.parse(t.slice(s, e + 1));
      } catch {
        /* fallthrough */
      }
    }
    throw new ParseError(text);
  }
}

// 실제 API 호출. 성공 시 파싱된 객체({rules, summary})를 반환한다.
export async function mineRules({ apiKey, prompt }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey, // 설정 화면에서 온 값
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true", // 브라우저 CORS용 필수
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message || JSON.stringify(j);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new ApiError(res.status, detail);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b && b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseModelJson(text);
}

// 사용자에게 보일 친절한 에러 문구.
export function friendlyError(err) {
  if (err instanceof ApiError) {
    if (err.status === 401)
      return { title: "API 키 오류", msg: "키가 올바르지 않아요. ⚙ 설정에서 다시 확인해 주세요.\n\n" + (err.detail || "") };
    if (err.status === 429)
      return { title: "레이트리밋", msg: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.\n\n" + (err.detail || "") };
    if (err.status === 400)
      return { title: "요청 오류", msg: (err.detail || "요청 형식이 올바르지 않아요.") };
    if (err.status >= 500)
      return { title: "서버 오류", msg: "잠시 후 다시 시도해 주세요.\n\n" + (err.detail || "") };
    return { title: `오류 ${err.status}`, msg: err.detail || err.message };
  }
  if (err instanceof ParseError) {
    return { title: "JSON 파싱 실패", msg: "모델이 JSON이 아닌 응답을 줬어요. ‘다시 시도’를 눌러주세요." };
  }
  // 네트워크/CORS 등
  return {
    title: "연결 실패",
    msg: "네트워크 또는 CORS 문제일 수 있어요. 인터넷 연결과 키를 확인해 주세요.\n\n" + (err?.message || ""),
  };
}
