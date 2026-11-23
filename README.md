# Algebra Teacher AI

A strict, step-by-step Algebra 2 and AP math teacher built with Next.js 15, React 19, Tailwind v4, KaTeX, mathjs, and Gemini.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the keys.
3. In the Supabase SQL editor, run `supabase/schema.sql`. In Supabase Auth, enable Email and Google providers and add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow list.
4. `npm run dev`

The app works without Supabase (guest mode, stored in `localStorage`) and without `YOUTUBE_API_KEY`.

## Features

- Math Studio: photo or screenshot (drag-drop, paste, webcam, crop and rotate), freehand canvas, or typed equation with a symbol keypad.
- `/api/solve`: two-pass solve and verify, plus an independent mathjs substitution check. Shows prerequisites with lesson videos, every step, the verified answer, a faster method, an Honors challenge, and a graphing link.
- Teacher Chat (`/api/tutor`): Socratic tutor that pushes back on wrong guesses, with quiz chips.
- Spot the Teacher's Mistake: 60-second drill, curated bank plus AI-generated drills.
- Formula Cheat Sheet: prints on one page.
- Practice Test: 1 to 10 problems in, a graded test out at Same, Hard, or AP level.
- Graphing Calculator: unlimited equations, auto sliders, clickable roots, extrema and intersections, table of values, PNG export.
- Video Finder: AI topic matching over curated Khan Academy, Organic Chemistry Tutor, and 3Blue1Brown lessons.
- Five themes plus custom colors, guest mode with automatic migration on sign-in, XP, levels, streaks, and skill mastery.

## Model note

The spec targets `gemini-2.5-flash`. Google has retired that model for new API keys, so `lib/server/ai.ts` falls back automatically through newer flash models when the primary returns 404 or is overloaded. Set `GEMINI_MODEL` to pin a specific model.
