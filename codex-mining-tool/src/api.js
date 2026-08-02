// 브라우저에서 Claude API를 직접 호출한다.
//
// 모델 ID는 아래 상수로 뺀다. docs.claude.com 기준 현재 Sonnet 라인은
//   - claude-sonnet-4-6  (Sonnet 4.6, 안정 · 기본값)
//   - claude-sonnet-5    (Sonnet 5, 최신 — 채굴 결과를 더 원하면 이걸로 교체)
// Sonnet 4.6은 thinking을 명시하지 않으면 사고 토큰을 쓰지 않아
// max_tokens를 JSON 출력에 온전히 쓸 수 있다.
export const MODEL = "claude-sonnet-4-6";

// 코어 스키마(path·review_trigger 포함)는 룰당 출력이 크다. 잘림(truncation)
// 방지를 위해 넉넉히 잡는다. Sonnet 4.6은 128K까지 되지만 8K면 충분.
export const MAX_TOKENS = 8000;

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export class ParseError extends Error {
  constructor(raw, truncated = false) {
    super(truncated ? "응답이 잘렸습니다(토큰 한도)." : "모델 응답을 JSON으로 읽지 못했습니다.");
    this.name = "ParseError";
    this.raw = raw;
    this.truncated = truncated;
  }
}

// JSON을 조금 관대하게 청소한다: 줄/블록 주석, 후행 콤마 제거.
// (프롬프트 예시를 모델이 흉내 내 // 주석을 붙이는 경우 방어. '://'는 보존.)
function sanitizeJson(t) {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, "") // /* 블록 주석 */
    .replace(/(^|[^:])\/\/[^\n\r]*/g, "$1") // // 줄 주석 (:// 는 살림)
    .replace(/,(\s*[}\]])/g, "$1"); // 후행 콤마
}

// 응답 텍스트에서 ```json 펜스를 제거하고 JSON.parse. 여러 후보를 시도한다.
export function parseModelJson(text) {
  let t = (text || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) t = fence[1].trim();

  const candidates = [t];
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) candidates.push(t.slice(s, e + 1)); // 가장 바깥 중괄호

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try sanitized */
    }
    try {
      return JSON.parse(sanitizeJson(c));
    } catch {
      /* next candidate */
    }
  }
  throw new ParseError(text);
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
      max_tokens: MAX_TOKENS,
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

  try {
    return parseModelJson(text);
  } catch (e) {
    // 응답이 토큰 한도에서 잘려 파싱이 깨진 경우를 구분해 안내한다.
    if (data.stop_reason === "max_tokens") throw new ParseError(text, true);
    throw e;
  }
}

// 사용자에게 보일 친절한 에러 문구.
export function friendlyError(err) {
  if (err instanceof ApiError) {
    if (err.status === 401)
      return { title: "API 키 오류", msg: "키가 올바르지 않아요. ⚙ 설정에서 다시 확인해 주세요.\n\n" + (err.detail || "") };
    if (err.status === 429)
      return { title: "레이트리밋", msg: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.\n\n" + (err.detail || "") };
    if (err.status === 400)
      return { title: "요청 오류", msg: err.detail || "요청 형식이 올바르지 않아요." };
    if (err.status >= 500)
      return { title: "서버 오류", msg: "잠시 후 다시 시도해 주세요.\n\n" + (err.detail || "") };
    return { title: `오류 ${err.status}`, msg: err.detail || err.message };
  }
  if (err instanceof ParseError) {
    if (err.truncated)
      return {
        title: "응답이 잘렸어요",
        msg: "규칙이 많아 JSON이 토큰 한도에서 잘렸어요. 서명본 건수를 줄이거나 ‘다시 시도’를 눌러주세요.",
      };
    return { title: "JSON 파싱 실패", msg: "모델이 JSON이 아닌 응답을 줬어요. ‘다시 시도’를 눌러주세요." };
  }
  return {
    title: "연결 실패",
    msg: "네트워크 또는 CORS 문제일 수 있어요. 인터넷 연결과 키를 확인해 주세요.\n\n" + (err?.message || ""),
  };
}
