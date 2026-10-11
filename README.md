# Candle Academy Web Client

React and Vite client for the Candle Academy web platform.

## Purpose

This client provides the browser interface for administration, question management, curriculum management, test and exam workflows, daily challenges, student management, and result review. It talks to `../server`, which runs locally on port `5001`.

## Stack

- React 18
- TypeScript
- Vite 6
- React Router
- Axios
- Framer Motion
- Lucide React
- Tailwind CSS 4
- React Toastify

## Install

```bash
npm install
```

## Run

Start the web API first:

```bash
cd ../server
npm run dev
```

Start the client:

```bash
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## API Configuration

The backend URL is defined in `src/config.ts`:

```txt
http://<current-browser-host>:5001
```

This keeps local network testing simple because the browser host is reused and only the port changes.

## Source Structure

```txt
client/
  src/
    components/
    hooks/
    lib/
    pages/
    types/
    api.ts
    config.ts
    App.tsx
    main.tsx
```

## Main Areas

- `pages/` contains the major admin and exam pages, including `FeedbackAdmin.tsx` (the Feedback tab in the admin console).
- `components/ui/` contains reusable base UI components.
- `components/exam/` contains exam-taking UI, including the scientific calculator (`ScientificCalculator.tsx`, `calculator/keypads.tsx`). Its logic is `lib/calculatorEngine.ts`; the mobile app keeps a copy, so change both together.
- `components/catalog/` contains reusable exam/test selection controls.
- `lib/` contains parser, grading, test window, exam session, prompt builder, and API error helpers.
- `api.ts` centralizes server communication.
- `config.ts` defines the backend URL.

## Paging

`components/ui/Pagination.tsx` exports `Pagination` and `usePagination` (paging in the browser) and `hooks/useServerPaging.ts` exports `usePageState` and `useDebouncedValue` (paging on the server with `?page=&pageSize=`). Students, results and feedback use server paging; the question papers and an exam's tests use `usePagination`.

## Development Notes

- Keep route changes synchronized with `web/server/routes`.
- The API now rejects tokens issued by older versions; a 401 clears the stored login and returns to `/login` (see `api.ts`).
- The student password minimum is 8 characters (`AddStudentForm.tsx`, `StudentEditForm.tsx`).
- Run `npm run build` before deployment to catch TypeScript errors.
- When changing model shapes, update `src/types/models.ts` and any affected API helpers together.
