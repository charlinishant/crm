# CRM Clean

Production-oriented CRM application with a React frontend, Express API, Prisma, and MySQL.

## Structure

- `frontend/` — React application, pages, components, services, and exactly two project stylesheets.
- `backend/controllers/` — request handlers.
- `backend/routes/` — API route definitions.
- `backend/services/` — business and integration services.
- `backend/prisma/` — database schema and migrations.
- `backend/middleware/`, `backend/utils/`, `backend/lib/` — shared server infrastructure.

## Setup

1. Copy `backend/.env.example` to `backend/.env` and fill in the required values.
2. In `backend/`, run `npm ci`, `npx prisma generate`, and `npx prisma migrate deploy`.
3. Start the API with `npm start` from `backend/`.
4. In `frontend/`, run `npm ci` and `npm start`.

The frontend reads `REACT_APP_API_URL` and defaults to `http://localhost:5000`.

## Stylesheets

- `frontend/src/styles/admin.css` — shared vendor foundations and the Admin interface.
- `frontend/src/styles/user-sales.css` — User/Sales interface.

## Browser storage policy

Business records are stored in MySQL through the API. Browser storage is limited to the login session, the selected theme, and temporary navigation state; it is not used as a business-data database.
