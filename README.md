# BudgetHack

A full-stack Next.js starter for hackathons. New users always register as
**hackers**:

- Hackers land in a simple welcome workspace.
- Organizers get a protected expense dashboard and a separate access-management
  screen where they can promote hackers to organizer access.
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
| Organizer | `organizer@example.com` | `DemoOrganizer123!` |

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
