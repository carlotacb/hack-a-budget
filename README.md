# BudgetHack

A full-stack Next.js starter for hackathons. New users always register as
**hackers**:

- Hackers land in a simple welcome workspace.
- Admins have full access to organizer tools and can assign Hacker, Organizer,
  Director, or Admin roles to other users after confirmation. Admins cannot
  change their own role.
- Directors can use the organizer dashboard, expense list, budget, and travel
  pages. Organizers can use the organizer dashboard and expense list. Hackers
  only use the hacker workspace.
- Organizer tools are split into dashboard, budget, expense list, new expense,
  travel reimbursements, users, and metadata pages, with navigation filtered by
  role.
- Budgets can be allocated by editable categories and subcategories. The
  dashboard reports total utilization, category utilization, and department
  spend share.
- Expenses include description, category/subcategory, amount, DD/MM/YYYY date,
  vendor, department, and an optional locally stored PDF or image ticket.
- Categories, subcategories, and departments can be added, renamed, activated,
  or deactivated from the metadata screen.
- Registration collects complete name, email, password, gender, city, and
  major. Passwords are stored only as secure hashes.
- Signed-in users can update their own name, gender, city, and major from the
  profile screen. Account email remains fixed.
- Email/password authentication works out of the box.
- Auth.js and its Prisma adapter are ready for Google OAuth and additional
  identity providers.

## Local setup

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The seed creates these local demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Hacker | `hacker@example.com` | `DemoHacker123!` |
| Admin | `organizer@example.com` | `DemoOrganizer123!` |

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

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
