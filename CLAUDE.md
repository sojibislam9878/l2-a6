# AgroStore Backend — Working Rules

Full design, schema, API surface and timeline: [projectPlan.md](projectPlan.md).

## Code style

**Never write comments in any file the project runs on.** No `//`, no `/* */`, no
JSDoc, no `#` notes, no section-divider banners, no TODO notes. This covers every
`.ts`, `.prisma`, `.js`, `.json`, `.env` and dotfile — no exceptions.

Write code that explains itself instead:

- Name things so the name carries the intent (`peakLoadKg`, not `calc` + a comment).
- Extract a well-named function or constant rather than annotating a dense block.
- Put user-facing explanation in error messages and validation messages, which is
  where it is actually visible at runtime.

If something genuinely cannot be understood without prose, say so in chat or put it
in a Markdown doc — do not resolve it by adding a comment.

Markdown files are documentation and are unaffected. Setup instructions and design
rationale belong in `projectPlan.md` or `README.md`, never in the files themselves.

## Conventions

- Layering is strict: `route → controller → service → prisma`. Nothing skips a layer.
- Controllers never touch `prisma`. Services never touch `req` or `res`.
- Services throw `AppError(status, message)`; only the global error handler sets status codes.
- Nothing reads `process.env` outside `src/config/env.ts`.
- Every read filters soft-deleted rows (`deletedAt: null`).
- Every list endpoint paginates.
