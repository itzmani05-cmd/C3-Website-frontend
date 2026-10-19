# C³ Educational Platform — Web Client

React + Vite client for the C³ Educational Platform. It has two sides:

- **Admin console** (`/admin/*`): manage exams, tests, students, the question bank and daily challenges, fix and extract questions, and review results.
- **Student portal** (`/`): pick a test, take it with the timer, calculator and question palette, and review the result.

The client talks to the Express/MongoDB API in [`../backend`](../backend).

## Stack

| Area | Tools |
| --- | --- |
| UI | React 18, TypeScript, Tailwind CSS 4, Lucide icons, Framer Motion (`LazyMotion`), React Toastify |
| Routing / data | React Router 6, Axios |
| Maths | KaTeX (loaded on demand) |
| PDF | jsPDF + html2canvas-pro (loaded on demand) |
| Fonts | Inter and Plus Jakarta Sans, self-hosted via `@fontsource-variable` |
| Build | Vite 6 |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Start the API first (from `../backend`). The client expects it on port **5001** when you run locally:

```bash
cd ../backend
# .env needs at least: MONGODB_URI=..., JWT_SECRET=..., PORT=5001
npm run dev
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc --noEmit`) and build to `build/` |
| `npm run preview` | Serve the production build locally |

`tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` on, so unused imports and variables fail the build.

## Backend URL

`src/config.ts` picks the API from the browser's host:

- `localhost`, `127.0.0.1` and private network addresses (`192.168.*`, `10.*`, `172.*`) → `http://<host>:5001`
- anything else → the hosted API (`https://c3websitebackend.onrender.com`)

Using the browser's host means you can test from a phone on the same network without changing anything. `src/api.ts` adds the stored JWT to every request, and a `401` clears the login and returns to `/login`.

## Project layout

```txt
src/
  App.tsx             Routes and role guard (admin vs student)
  main.tsx            Entry: providers, fonts, scroll anchoring
  api.ts              Axios instance (auth header, 401 handling)
  config.ts           Backend URL
  index.css           Tailwind theme tokens and a few utilities
  pages/              One file per screen (see below)
  components/
    ui/               Buttons, fields, modal, pagination, MathText, skeletons…
    bank/             Question Bank: list, rows, editor, filters, PDF export
    fix/              Question Fix: rows and the "add from bank" dialog
    exam/             Student exam: header, timer, palette, part tabs, calculator
    BankQuestionBrowser.tsx        Search the bank and add questions (challenges and tests)
    DailyChallengeQuestionPicker.tsx
    ChallengeCalendar.tsx
    QuestionRenderer.tsx           Match / assertion-reason / statement layouts
  lib/                Parsers, grading, LaTeX helpers, bank filters, scroll anchoring
  types/models.ts     Shared TypeScript models
```

### Admin pages (`/admin/<slug>`)

| Slug | Page | Purpose |
| --- | --- | --- |
| `exams` | Manage Exams | Exams, units, topics and subtopics |
| `tests` | Manage Tests | Tests, patterns (parts, sections, marks) and publishing |
| `daily-challenge` | Daily Challenge | Calendar, today/upcoming, create and analyse challenges |
| `question-bank` | Question Bank | Topic-wise bank with search, filters, PDF download |
| `students` | Manage Students | Student accounts |
| `results` | Results | Per-test results |
| `extractor` | Extractor | Turn pasted text into questions |
| `prompts` | Prompts | Prompt library for question generation |
| `question-fix` | Question Fix | Edit unit-wise and test questions; add from the bank |

## Features worth knowing about

- **Question formats.** `QuestionRenderer` recognises *match the following* (two-column table), *assertion–reason* (labelled box) and *"consider the following statements"* (numbered cards), whether the source text has line breaks or is one long line. The same rules live in the mobile app (`C3App/client/src/utils/questionStructure.js`); keep them in step.
- **Maths.** Text with `$…$` / `$$…$$` is typeset by KaTeX, which is fetched on first use.
- **Question bank usage marks.** Questions copied into a test or a Daily Challenge show a violet or red dot (hover for the name). The backend links each copy to its bank question with `bankQuestionId`; edits to a copy do **not** change the bank question or the other way round.
- **PDF download.** *Download as PDF* in Question Bank and Question Fix builds an A4 PDF client-side (letterhead, C³ logo watermark, page numbers, optional answer key). It is rasterised, so text isn't selectable.
- **Exam screen.** A tab bar per part, a palette that follows the current part, a server-backed countdown (`ExamTimer`), and sync of answers with the API.
- **Scroll anchoring.** `lib/scrollAnchor.ts` keeps the control you clicked in place when the content around it changes (no jump to the top). Add `data-no-anchor` to an area where a click is meant to move the view, as the exam does.

## Performance notes

- Route and admin-page components are lazy-loaded; KaTeX, jsPDF and html2canvas load only when used.
- `vite.config.ts` splits `react`, `router` and `motion` into separate chunks and keeps only the `.woff2` KaTeX fonts.
- `vercel.json` serves `/assets/*` as immutable and `index.html` as `no-cache`.

## Deployment

The app is a static SPA. Build with `npm run build` and serve `build/`; `vercel.json` rewrites all routes to `index.html`. Deploy the backend before the client when a change adds API fields (for example the question-bank usage marks).

## Conventions

- Use the shared pieces in `components/ui` (`Button`, `Card`, `Modal`, `Banner`, `Pagination`…) before adding new ones.
- Show long lists with skeletons (`LoadingState`) and keep the previous list on screen while the next page loads.
- When a model changes, update `src/types/models.ts` (or `lib/bank.ts` for question-bank shapes) together with the code that uses it.
- Remove what you stop using: the build fails on unused imports and variables.
