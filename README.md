# Shelfwise Library Management System

A full-stack library project with separate panels for admins, librarians, and members.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm start` in this folder.
3. Open `http://localhost:3000`.

The server creates a persistent `data.json` database file on first run. Books and loan updates remain after restarting the server.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | aarav@shelfwise.io | admin123 |
| Librarian | maya@shelfwise.io | library123 |
| Member | noah@shelfwise.io | member123 |

## Backend features

- Server-side session authentication and role authorization
- Persistent book and loan data
- Protected APIs for adding books, issuing loans, and returning books
- Member dashboard only exposes that member's loans
