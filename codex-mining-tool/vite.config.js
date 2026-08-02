import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 로컬 전용 SPA. 백엔드 없음. `npm run dev`로 뜬다.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
});
