# Supabase setup

The game works without Supabase, but the leaderboard stays offline until the database is connected.

1. In Supabase, open the SQL Editor and run [`supabase/schema.sql`](./supabase/schema.sql).
2. In Supabase, open Project Settings → API and copy the Project URL and the `anon` public key.
3. Add these two environment variables to the Vercel project for Production (and Preview if useful):

   ```text
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Redeploy the Vercel project. The leaderboard will load the top 10 scores and guests can submit a score when they cash out.

The table intentionally allows anonymous reads and inserts because this is a casual wedding game. The score is validated by the database, but it is not an anti-cheat system; someone with browser tools could submit a fabricated score.
