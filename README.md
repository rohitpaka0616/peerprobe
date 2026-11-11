# PeerProbe

PeerProbe is a two-student workspace for testing a specific build, reporting what you find, and checking a later build without losing the original result.

One student publishes a task against an exact preview URL. Another student claims it, works through the brief, and files issues. The owner can then ask for a retest on a newer build. The original session, issue, and build stay attached to the version that was tested.

The project page is [rohitpaka0616.github.io/peerprobe](https://rohitpaka0616.github.io/peerprobe/). It introduces the workspace and includes the Nest rent calculator. GitHub Pages cannot run accounts, sessions, or issues, so the testing workspace still runs on your machine.

## Local demo

The demo needs Node.js 20 or newer. No database is required.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). In development, with no Supabase URL configured, the app stores everything in `.data/state.json` and signs you in as one of two students. Use the **Demo student** menu in the sidebar:

| Student | Role in the sample |
| --- | --- |
| Jamie Chen | Tester. Claims tasks and reports issues. |
| Alex Morgan | Developer. Owns the seeded Nest project. |

The first request creates the seed if `.data/state.json` is missing. Delete the `.data` directory to restore that seed. The demo cookie is only for a machine you control. Do not set `PEERPROBE_LOCAL_DEMO` on a public deployment.

To serve the production build locally:

```bash
npm run build
PEERPROBE_LOCAL_DEMO=true npm start
```

Without that variable, production refuses to read or write the local file and expects Supabase instead.

## Sample app

Nest is a small apartment page used as the app under test.

| Preview | Build | Rent split |
| --- | --- | --- |
| `/demo/v1` | v1.0 | Starts at two people and $1,200 each. Changing the count leaves the share at $1,200. |
| `/demo/v2` | v1.1 | Divides the $2,400 total by the number of people. Three people pay $800 each. |

The seed publishes two tasks on the Nest project:

- **Put our rent calculator to the test** is a guided task on v1.0. The second step is the bug above.
- **Find your share of a new home** is a usability task on v1.1. Alex can see the owner-only success criteria on My projects. Jamie never receives that text.

## Walkthrough

1. Stay as Jamie and open **Put our rent calculator to the test**.
2. Choose **Start testing**. The v1.0 preview loads beside the brief. If an app refuses to be embedded, use **Open app in new tab**. That tab is only the preview. The testing session stays on the PeerProbe page, including any steps you have already saved.
3. Mark step 1 passed: two people, $2,400 total, $1,200 each.
4. In the preview, increase the count to three. The share stays $1,200. Mark step 2 failed, then **Report this failure**. The report keeps the build, task, step, and browser details.
5. Switch to Alex. Open **My projects**, then the new issue. Confirm it, and under **Request a retest** choose the existing **v1.1** build (`/demo/v2`).
6. Switch back to Jamie. **My testing sessions** shows **Ready for your retest**. Open it and use **Open app in new tab** so the v1.1 preview opens beside the issue. Three people now pay $800, and the total stays $2,400.
7. Submit the verification as **Fixed** and describe what you saw.

The issue status becomes fixed. Build history keeps the original v1.0 report and the v1.1 attempt. The testing session remains pinned to v1.0, which is the build Jamie actually tested.

To attach a build that is not already on the project, choose **Attach a new build** and paste a full `http` or `https` preview URL. For this sample, that URL is `http://127.0.0.1:3000/demo/v2`. The publish form also accepts the relative paths `/demo/v1` and `/demo/v2`.

You can publish another task from **Publish a test**. **Preview as a tester** shows the brief a tester will see, including its own **Open app in new tab** link, and it leaves owner-only success criteria out.

## Supabase

Copy `.env.example` to `.env.local` and set all three keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Apply `supabase/migrations/202611110001_peerprobe.sql` in the Supabase SQL editor. The migration creates the versioned records, owner-only criteria, row-level read policies, and a private `screenshots` bucket. Browsers can read only the rows those policies allow. Writes go through the Next.js server with the service role.

Create the developer in Supabase Auth, then seed an empty project:

```bash
SEED_OWNER_ID=<developer-user-uuid> npm run seed:supabase
```

Sign in through the app as a second student to claim a task. Leave `PEERPROBE_LOCAL_DEMO` unset whenever the Supabase URL is present. Screenshots are PNG, JPEG, or WebP, up to 5 MB, and only the reporter and the project owner can open them.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

`npm test` runs the six domain and persistence tests: the publish-to-verified-fix path, private criteria, capacity and status rules, usability redaction, retests that keep every attempt, and concurrent claims against the local file store.

The PostgreSQL policy script is for an empty local database, not for the app database:

```bash
createdb peerprobe_policies
psql peerprobe_policies -v ON_ERROR_STOP=1 -f tests/sql/bootstrap.sql
psql peerprobe_policies -v ON_ERROR_STOP=1 -f supabase/migrations/202611110001_peerprobe.sql
npx tsx scripts/sql-fixture.ts
psql peerprobe_policies -v ON_ERROR_STOP=1 -f /private/tmp/peerprobe-fixture.sql
psql peerprobe_policies -v ON_ERROR_STOP=1 -f tests/sql/policies.sql
```

`scripts/sql-fixture.ts` writes the fixture SQL to `/private/tmp/peerprobe-fixture.sql`. The policy script checks anonymous discovery, hidden criteria and sessions, reporter and owner access, denied writes, and compare-and-swap revisions. Drop `peerprobe_policies` when you are done. It is not used by `npm run dev`.
