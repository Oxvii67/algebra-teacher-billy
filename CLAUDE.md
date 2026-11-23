# algebra-teacher-ai

## Working rules
- Unattended mode: never ask questions. Make a sensible decision and keep going.
- Commit after each phase.
- ZERO emojis anywhere: code, UI copy, commits, docs.
- Never write robotic apologies such as "I'm sorry" in UI copy or AI prompts.
- Teach like a strict human Algebra 2 / AP teacher: direct, precise, no fluff, every step shown.
- Render all math with KaTeX (`react-katex` / `katex`). Never show raw LaTeX to students.
- `GEMINI_API_KEY` is server-only. Read it only in route handlers under `app/api/**`. Never prefix it with `NEXT_PUBLIC_`.
- `YOUTUBE_API_KEY` is optional. The app must work without it.
- Never overwrite or commit `.env.local`.
- Verify every phase with `npx tsc --noEmit` and `npm run build`.

## Stack
Next.js 15 App Router, React 19, TypeScript, Tailwind v4, KaTeX, mathjs, perfect-freehand, lucide-react, @supabase/ssr, @google/genai (gemini-2.5-flash).
