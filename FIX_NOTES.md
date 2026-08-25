# Login fix

The project was checked on 2026-08-08. The following login issues were fixed:

- The frontend now removes trailing slashes from `REACT_APP_API_URL`, preventing production requests such as `//auth/login`.
- Login now handles non-JSON server/proxy responses without crashing.
- `MANAGER` users are accepted as dashboard users, matching the backend role schema and user form.
- JWT signing and verification now use the same secret fallback rules.
- A valid login no longer fails if attendance tracking is temporarily unavailable.
- Missing email/password fields return a clear `400` response.

## Run

Backend:

```bash
cd backend
npm ci
npx prisma generate
npm start
```

Frontend development server:

```bash
cd frontend
npm ci
npm start
```

The production frontend is already compiled in `frontend/build`.
