# Build plan

1. Scaffold and multi-theme shell: Next.js 15, Tailwind, KaTeX, mathjs, perfect-freehand, Lucide. Collapsible sidebar, mobile bottom nav, five themes plus a custom color picker stored in localStorage.
2. Supabase auth and binder: guest mode in localStorage with auto-migration on login, email/password and Google OAuth via @supabase/ssr, `supabase/schema.sql` with RLS (profiles, folders, solutions, practice_tests), Saved History and Folders page.
3. Triple-input Math Studio: image (drag-drop, paste, webcam, crop/rotate), freehand canvas (pen sizes, colors, eraser, undo/redo, grid), equation input (symbol keypad, live KaTeX preview).
4. Two-pass verified solver at `/api/solve`: Gemini solves, then verifies each line and substitutes the answer back. UI shows problem, prerequisites with lesson video, full steps, verified answer with copy, simpler method, Challenge Me, Open in Graphing Calculator.
5. Socratic tutor at `/api/tutor` with quiz chips, "Spot the Teacher's Mistake" 60-second drill, printable formula cheat sheet.
6. `/practice-test` (1-10 problems to a Same/Hard/AP test, auto-graded, printable) and `/calculator` (unlimited equations, auto sliders, roots/extrema/intersections, table, PNG export).
7. `/videos` hub with AI topic search, curated video IDs, optional YouTube API, embedded player. Final tsc and build clean.
