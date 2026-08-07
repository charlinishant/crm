# Cleanup notes

## Removed from the supplied archive

- Nested frontend/backend backup ZIP files.
- Unpacked Word-document internals and duplicate integration-document archives.
- Generated server and React logs.
- Sample upload artifacts and empty database dump.
- Unreachable React demo components and pages identified from the application entry-point graph.
- Duplicate frontend stylesheets and public CSS copies.

## Data moved away from localStorage

- Projects now use the existing Project API response as the only source of truth.
- Profile photos are stored in `User.profilePhoto`.
- Lead-note edits and pinned state are stored in `LeadNote`; deletes use the API.
- Lead status, booked status, and site-visit status use their existing database API updates without browser caches.
- Activity notifications are loaded from and written to the lead-activity API.

Authentication state and theme choice remain client-side intentionally. Session-storage lead payloads remain temporary route-transfer state and are not persistent business records.

## Database migrations

- `20260807090000_store_profile_photo_in_database`
- `20260807091000_store_lead_note_ui_state`

Run `npx prisma migrate deploy` before starting the updated API.

## Verification

- All backend JavaScript files pass Node syntax checks.
- Frontend imports were checked for missing local modules.
- The project contains exactly two CSS files: `admin.css` and `user-sales.css`.
- A full dependency install was attempted, but this execution environment returned corrupted registry tarballs; run `npm ci && npm run build` in a normal network environment as the final deployment check.
