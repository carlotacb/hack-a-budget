# BudgetHack

A full-stack Next.js app for running a hackathon's finances: budgets,
expenses, travel reimbursements, and role-based access, all in one place.

## Features

- **Roles** — Hacker, Organizer, Director, Admin. New signups start as
  Hackers; Admins assign roles to everyone else. Navigation and every server
  action enforce access independently per role.
- **Budget** — allocate spend by editable categories and subcategories, with
  live utilization reporting.
- **Expenses** — log description, category, amount, date, vendor, and
  department, with an optional ticket (PDF/image) attached.
- **Travel reimbursements** — hackers submit one request with journey details
  and a ticket; Admins/Directors review, approve, or reject it, then check off
  final requirements before a demo-linked final approval. Full audit history
  per request.
- **Metadata screen** — Admins manage categories, departments, travel
  settings, and final-approval requirements without touching code.
- **Auth** — email/password out of the box, with Auth.js + Prisma adapter
  ready for Google OAuth or other providers.

## Tech stack

Next.js (App Router) · Prisma · PostgreSQL (Neon) · Auth.js · Vercel Blob for
file uploads

## Setup

### Prerequisites

- Node.js 20.9+
- A Postgres database — a free [Neon](https://neon.tech) project works well
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store (only
  needed to test ticket uploads)

### Local development

```bash
npm install
cp .env.example .env   # fill in the values below
npm run db:deploy      # apply migrations
npm run db:seed        # optional: demo data + accounts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon's **pooled** connection string (host has `-pooler`) |
| `DIRECT_URL` | Yes | Neon's **direct** connection string (no `-pooler`); used only for migrations |
| `AUTH_SECRET` | Production only | Generate with `openssl rand -base64 32`. Local dev auto-generates its own |
| `BLOB_READ_WRITE_TOKEN` | For ticket uploads | From your Vercel Blob store's settings |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Adds a Google login button |

### Deploying to Vercel

1. Create a Neon Postgres project and copy both its pooled and direct
   connection strings.
2. Create a Blob store from the Vercel project's **Storage** tab (this sets
   `BLOB_READ_WRITE_TOKEN` for you automatically).
3. Set the environment variables above in the Vercel project settings.
4. Deploy — the build runs `prisma generate && prisma migrate deploy && next
   build`, so migrations apply automatically.

### Demo accounts

`npm run db:seed` creates:

| Role | Email | Password |
| --- | --- | --- |
| Hacker | `hacker@example.com` | `DemoHacker123!` |
| Admin | `organizer@example.com` | `DemoOrganizer123!` |
| Director | `director@example.com` | `DemoDirector123!` |
| Organizer | `plain-organizer@example.com` | `DemoOrganizer123!` |

### Inspecting the database

```bash
npx prisma studio
```

Neon's own dashboard also has a SQL editor and table browser.
