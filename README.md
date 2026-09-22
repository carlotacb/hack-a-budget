# BudgetHack

A full-stack Next.js starter for hackathons. New users always register as
**hackers**:

- Hackers land in a workspace with an end-to-end travel reimbursement flow.
- Admins have full access to organizer tools and can assign Hacker, Organizer,
  Director, or Admin roles to other users after confirmation. Admins cannot
  change their own role.
- Directors can use the organizer dashboard, expense list, budget, and travel
  review pages. Organizers can use the organizer dashboard and expense list,
  but cannot access travel routes or actions. Hackers only use their own
  workspace and travel submission.
- Organizer tools are split into dashboard, budget, expense list, new expense,
  travel reimbursements, users, and metadata pages, with navigation filtered by
  role.
- Budgets can be allocated by editable categories and subcategories. The
  dashboard reports total utilization, category utilization, and department
  spend share.
- Expenses include description, category/subcategory, amount, DD/MM/YYYY date,
  vendor, department, and an optional PDF or image ticket, stored in Vercel
  Blob.
- Categories, subcategories, departments, event travel settings, and final
  approval requirements are managed from the metadata screen. Only Admin can
  edit metadata.
- Registration collects complete name, email, password, gender, city, and
  major. Passwords are stored only as secure hashes.
- Signed-in users can update their own name, gender, city, and major from the
  profile screen. Account email remains fixed.
- Email/password authentication works out of the box.
- Auth.js and its Prisma adapter are ready for Google OAuth and additional
  identity providers.

## Local setup

Requires Node.js 20.9 or newer, and a Postgres database (a free
[Neon](https://neon.tech) project works well — see
[Deploying to Vercel](#deploying-to-vercel) below for the connection string
shape).

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL / DIRECT_URL in .env with your Postgres connection strings
npm run db:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Uploading a ticket (expenses or travel reimbursements) requires
`BLOB_READ_WRITE_TOKEN` in `.env` — create a Blob store in the Vercel
dashboard's Storage tab (even for local development) and copy its token. The
rest of the app works without it.

`npm run dev` applies pending migrations and regenerates Prisma Client before
starting Next.js, then creates a cryptographically random `AUTH_SECRET_DEV` in
the ignored `.env.local` file if no local secret is configured. The secret is
reused across restarts, so local JWT sessions remain valid. Production never
reads this development fallback: set an explicit, securely generated
`AUTH_SECRET` in the deployment environment. `npm run build` also regenerates
Prisma Client before Next.js runs its production build and type checking, and
`npm start` applies pending migrations before serving the application.

Use `npm run db:migrate -- --name <migration-name>` after changing
`prisma/schema.prisma` to generate a development migration. Use
`npm run db:deploy` to apply committed migrations without creating new ones.

The seed creates these local demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Hacker | `hacker@example.com` | `DemoHacker123!` |
| Admin | `organizer@example.com` | `DemoOrganizer123!` |
| Director | `director@example.com` | `DemoDirector123!` |
| Organizer | `plain-organizer@example.com` | `DemoOrganizer123!` |

## View the database

This project uses Postgres (Neon in production; any Postgres works locally).

Open Prisma Studio (GUI):

```bash
npx prisma studio
```

Then open the URL shown in the terminal (usually `http://localhost:5555`).

Neon's own dashboard also has a SQL editor and table browser if you'd rather
not run Prisma Studio.

## Deploying to Vercel

1. Create a Neon Postgres project (or a branch of an existing one) and copy
   both connection strings it gives you: the **pooled** one (host contains
   `-pooler`) and the **direct** one.
2. Create a Vercel Blob store from the project's **Storage** tab — this
   provisions `BLOB_READ_WRITE_TOKEN` automatically for that project's
   deployments.
3. Set these environment variables in the Vercel project settings:
   - `DATABASE_URL` — the pooled Neon connection string.
   - `DIRECT_URL` — the direct Neon connection string (used only by
     `prisma migrate deploy` during the build).
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`.
   - `BLOB_READ_WRITE_TOKEN` — usually already set by step 2; add it manually
     if you created the Blob store separately from the linked project.
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — optional, for Google login.
4. Deploy. The build script (`prisma generate && prisma migrate deploy && next
   build`) applies migrations against `DIRECT_URL` before building, so the
   schema is always in sync with what's committed in `prisma/migrations/`.
5. Seed data (`npm run db:seed`) is meant for local/demo use — run it against
   your Neon database with `DATABASE_URL`/`DIRECT_URL` pointed at it locally
   if you want the same demo accounts, rather than as part of the deploy.

## Travel reimbursement workflow

Each hacker can have one reimbursement request. The request records origin,
transport mode, complete outbound and return journey details, total and
conditional luggage prices, and exactly one ticket document. Submitting or
resubmitting moves the request to **Pending review**. Admin or Director can
approve it with a reimbursement amount, request changes, or reject it. Changes
and rejection require a reviewer note; hackers can edit and resubmit from those
states.

After travel approval, the hacker sees the event instructions configured in
Metadata. The **Demo prove** action unlocks at the configured hackathon start
and has no end cutoff. An approved hacker can submit a required HTTP(S) demo URL
and optional room/comment details. This moves the reimbursement to **Final
review**. Admin or Director must check every currently active final requirement
before final approval. Reviewer identities, timestamps, notes, and lifecycle
events are retained in the audit history.

Permissions are enforced independently on every travel route and server action:

| Capability | Hacker | Organizer | Director | Admin |
| --- | --- | --- | --- | --- |
| Create/edit own request and demo proof | Yes | No | No | No |
| View/review all travel submissions | No | No | Yes | Yes |
| Initial/final approval and checklist | No | No | Yes | Yes |
| Edit event start, instructions, requirements | No | No | No | Yes |

Travel reimbursements are deliberately separate from finance `Expense` records.
Approvals do not create expenses.

### Event time and ticket uploads

`datetime-local` values are interpreted and displayed in the deployment
server's local timezone, which must match the hackathon/event timezone. Prisma
stores the resulting instants consistently in Postgres. Configure the event
start under **Metadata → Travel configuration** before testing unlock
behavior.

Tickets are accepted as PDF, JPG, PNG, or WebP up to 5 MB and uploaded to
Vercel Blob under a random filename (`tickets/…` for expenses,
`travel-reimbursements/…` for travel requests); the returned public URL is
what's stored on the record. This works the same locally and in production —
no local filesystem writes, no malware scanning built in, so treat uploaded
tickets as untrusted files if you add preview/rendering beyond the existing
PDF/image viewer.

The seed creates placeholder instructions and three active final requirements.
Its event start is one hour before the first seed run so the demo flow can be
tested immediately. To exercise the lifecycle:

1. Sign in as the demo hacker, submit a request with a ticket.
2. Sign in as Admin or Director, review it under **Travel**, and approve it.
3. Return as the hacker, submit **Demo prove**.
4. Return as Admin or Director, save all checklist items and final-approve.
5. Sign in as the plain Organizer to verify Travel is absent and direct travel
   route access is denied.

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

Changing `AUTH_SECRET` intentionally invalidates every existing session. Users
must sign in again. Development uses a versioned, development-only session
cookie name, so stale Auth.js cookies created by older local configurations do
not cause JWT decryption errors. If a secret is changed again, clear the
`budgethack.dev.session-token.v1` cookie (or all localhost cookies) before
continuing.

## Google login

Create an OAuth application in Google Cloud, set its callback URL to
`http://localhost:3000/api/auth/callback/google`, and add its credentials to
`.env`:

```bash
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

The Google button appears automatically when both variables are present. New
OAuth users receive the default `HACKER` role. More Auth.js providers can be
added to `src/auth.ts` using the same pattern.
