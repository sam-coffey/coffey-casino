# Wedding-day mini casino — first-pass plan

## Product goal

Create a private, mobile-first mini casino that gives the player a polished
three-to-five-minute slot-machine game, then turns a clearly earned jackpot
into an in-person gift reveal.

The first release is a single slot-machine game. It should feel like a small,
classy, lightly cartoony casino: polished, playful, and easy to understand
without instructions.

## Recommended MVP

- One responsive page with a compact slot machine and celebration/reveal
  screen.
- Three reels and a small symbol set: turtle, golf ball, hot dog, pizza slice,
  candy, and soccer ball.
- A short play loop: spin, watch the reels settle, see the result, and unlock
  the next jackpot tier.
- Three jackpot thresholds: Mini, Large, and Mega. The tier names can be
  renamed to match the physical gifts.
- A guaranteed, authored progression so the game cannot accidentally leave her
  without a win. The visible play still feels random, but the experience is
  paced toward a celebration after a reasonable number of spins.
- A final screen that tells her which in-person prize to claim, with an
  optional button such as “Find your gift” or “Come collect your jackpot.”
- Local browser state only for the MVP: current spin count, unlocked tier, and
  sound preference. No login, database, or analytics is required.

## Game logic

The safest gift experience is a controlled outcome rather than pure random
chance. The recommended default is:

1. Give her a few ordinary spins so the machine feels like a game.
2. Unlock Mini first, then Large, then Mega on a paced schedule, or stop after
   the first tier that matches the gift you want to present.
3. Add a one-time “already played” state so a refresh does not reset the story.
4. Keep a private developer/testing reset available during build, but do not
   expose it in the guest experience.

This can all run in the browser. Supabase is unnecessary unless you later want
multiple players, remote prize tracking, a live scoreboard, or a private admin
dashboard.

## Visual direction

Use CSS, typography, and tiny built-in symbols instead of procured artwork:

- Deep plum or midnight background with champagne-gold accents.
- Warm ivory reels and a restrained coral or rose highlight for occasional
  jackpot emphasis.
- A rounded display typeface for headings and a clean sans-serif for controls.
- Reels built from layered CSS panels with a soft glow, subtle grain, and a
  small amount of motion.
- Confetti, sparkles, and jackpot ribbons made from CSS shapes and text.
- Optional tiny monogram/date mark, also rendered as text/CSS.

No external image library is needed for the first version. If we later want a
social-preview image or a hero illustration, I can generate one purpose-built
asset, but the core game should stay lightweight and fast.

## Technical shape

- React/Vinext starter already initialized in this workspace.
- One main route and one stylesheet, with accessible buttons and touch-sized
  controls.
- Client-side state for the session and localStorage for persistence.
- CSS animations with a reduced-motion fallback.
- No accounts, payments, real currency, or sensitive personal data.
- Build validation before publishing.

For hosting, I recommend using the available Sites workflow for this project,
unless you specifically want the final URL managed in Netlify or Vercel. The
app itself does not depend on Supabase.

## Later additions, only if wanted

- A second game such as a scratch card or a “pick a lucky envelope” reveal.
- Optional sound effects and a mute toggle.
- A shared replay mode or a simple leaderboard.
- A simple remote flag to change the final prize without rebuilding.

These are intentionally out of the first build so the slot machine can be
polished and tested as the gift experience.

## Confirmed direction

- The brand is Coffey Casino.
- The visual tone is elegant with a slightly cartoony edge: black/classy,
  sage-green accent, and optional gold.
- The six reel symbols are a turtle, golf ball, hot dog, pizza slice, candy,
  and soccer ball.
- The experience is optimized for phone play.
- Physical prizes are still undecided, so the game uses Mini Jackpot, Large
  Jackpot, and Mega Jackpot as temporary names.
- Hosting and a simple password gate can be decided later; local play is fine
  while the game is being built.

## Remaining decisions before final polish

- Wedding date, nicknames, and any extra phrase or inside joke for the copy.
- Whether all three jackpot tiers should unlock or whether the experience
  should stop at one final prize.
- Whether sound effects are worth adding after the core game is polished.
- The target date for the finished gift and the final hosting choice.

## Build order after approval

1. Lock the colors, jackpot thresholds, and reveal behavior.
2. Replace the starter screen with the complete slot-machine experience.
3. Tune the pacing, motion, responsive layout, accessibility, and reset/testing
   behavior.
4. Run the production build and test the full win path on a small screen and a
   desktop viewport.
5. Publish the private site and hand back the URL plus a short “how to use it
   on the wedding day” note.
