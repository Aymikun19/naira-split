<img src="public/logo.svg" alt="" width="64" height="64">

# NairaSplit

Split shared expenses with friends, roommates or trip groups, **in naira**, and settle up with as few bank transfers as possible.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e) ![Tests](https://img.shields.io/badge/tests-vitest-yellow)

## Features

- Create a group and invite friends with a link; people without accounts can be added by name
- Add expenses and split them equally among any subset of the group
- Live balances showing who is up and who is down
- **Settle-up plan**: the fewest "X pays Y ₦N" transfers that clear every debt, plus a one-tap *Mark paid*

## Engineering notes

- **Integer kobo everywhere.** ₦1 = 100 kobo, stored as `bigint`, so ₦10,000 ÷ 3 never turns into `3333.3333…`. Leftover kobo goes to the first people in the split, and the shares always add up exactly.
- **Settle-up algorithm** (`src/lib/settle.ts`): a greedy match between the largest debtor and the largest creditor. It needs at most *n − 1* transfers and is unit tested, including a property-style test that every plan zeroes all balances.
- **Settlements are just expenses.** "Ada paid Bayo ₦3,000" is stored as an expense paid by Ada with Bayo's share set to ₦3,000, so one balance formula covers everything.
- **Atomic writes.** The `add_expense` Postgres function inserts the expense and its shares in one transaction and rejects shares that don't add up.
- **RLS** limits every table to members of the group.

## Run it

```bash
# 1. run supabase/schema.sql in your Supabase project
cp .env.example .env.local   # add your keys
npm install
npm run dev
npm test
```

## Database schema

All tables live in their own Postgres schema, `nairasplit`, rather than `public`, so this app can share one Supabase project with my other demo apps. After running `supabase/schema.sql`, add `nairasplit` under **Supabase → Project Settings → Data API → Exposed schemas**. The app selects it through `db: { schema }` in `src/lib/supabase/config.ts`.
