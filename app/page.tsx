"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type SymbolId = "turtle" | "golf" | "hotdog" | "pizza" | "candy" | "soccer";
type ResultKind = "pair" | "triple" | "none";
type LeaderboardStatus = "loading" | "ready" | "offline" | "error";

type SlotSymbol = {
  id: SymbolId;
  emoji: string;
  label: string;
};

type SpinResult = {
  kind: ResultKind;
  payout: number;
  multiplier: number;
  symbol: SlotSymbol | null;
};

export type HighScore = {
  id: number;
  player_name: string;
  score: number;
  created_at: string;
};

const INITIAL_CREDITS = 30;
const MAX_CREDITS = 500;
const BETS = [1, 3, 5, 10] as const;
const MAX_NAME_LENGTH = 20;
const DEFAULT_REELS: SymbolId[] = ["turtle", "pizza", "soccer"];

const SYMBOLS: SlotSymbol[] = [
  { id: "turtle", emoji: "🐢", label: "Turtle" },
  { id: "golf", emoji: "⛳", label: "Golf ball" },
  { id: "hotdog", emoji: "🌭", label: "Hot dog" },
  { id: "pizza", emoji: "🍕", label: "Pizza slice" },
  { id: "candy", emoji: "🍬", label: "Candy" },
  { id: "soccer", emoji: "⚽", label: "Soccer ball" },
];

const TRIPLE_MULTIPLIERS: Record<SymbolId, number> = {
  turtle: 8,
  golf: 8,
  hotdog: 8,
  pizza: 16,
  candy: 16,
  soccer: 40,
};

function symbolById(id: SymbolId) {
  return SYMBOLS.find((symbol) => symbol.id === id) ?? SYMBOLS[0];
}

function randomReels(): SymbolId[] {
  return Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id);
}

function calculateSpinResult(reels: SymbolId[], bet: number): SpinResult {
  const counts = new Map<SymbolId, number>();
  reels.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  const matchingEntry = [...counts.entries()].sort(([, a], [, b]) => b - a)[0];

  if (!matchingEntry || matchingEntry[1] < 2) {
    return { kind: "none", payout: 0, multiplier: 0, symbol: null };
  }

  const [symbolId, count] = matchingEntry;
  if (count === 2) {
    return { kind: "pair", payout: bet, multiplier: 1, symbol: symbolById(symbolId) };
  }

  const multiplier = TRIPLE_MULTIPLIERS[symbolId];
  return { kind: "triple", payout: bet * multiplier, multiplier, symbol: symbolById(symbolId) };
}

async function loadHighScores() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("high_scores")
    .select("id, player_name, score, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as HighScore[];
}

export default function Home() {
  const [reels, setReels] = useState<SymbolId[]>(DEFAULT_REELS);
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [spinCount, setSpinCount] = useState(0);
  const [bet, setBet] = useState<(typeof BETS)[number]>(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [showCashout, setShowCashout] = useState(false);
  const [cashoutScore, setCashoutScore] = useState(0);
  const [isCashedOut, setIsCashedOut] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [leaderboardStatus, setLeaderboardStatus] = useState<LeaderboardStatus>(supabase ? "loading" : "offline");
  const [leaderboardMessage, setLeaderboardMessage] = useState(supabase ? "" : "Add Supabase to turn on the leaderboard.");
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const spinInterval = useRef<number | null>(null);
  const spinTimeout = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    void loadHighScores()
      .then((scores) => {
        if (!active) return;
        setHighScores(scores);
        setLeaderboardStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setLeaderboardStatus("error");
        setLeaderboardMessage("Leaderboard unavailable right now.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (spinInterval.current) window.clearInterval(spinInterval.current);
      if (spinTimeout.current) window.clearTimeout(spinTimeout.current);
    };
  }, []);

  const isGameOver = credits < Math.min(...BETS);
  const canSpin = !isSpinning && !isCashedOut && !showCashout && credits >= bet;

  function handleSpin() {
    if (!canSpin) return;

    setIsSpinning(true);
    setSpinResult(null);
    spinInterval.current = window.setInterval(() => setReels(randomReels()), 85);
    spinTimeout.current = window.setTimeout(() => {
      if (spinInterval.current) window.clearInterval(spinInterval.current);

      const nextReels = randomReels();
      const result = calculateSpinResult(nextReels, bet);
      setReels(nextReels);
      setCredits((currentCredits) => Math.min(MAX_CREDITS, currentCredits - bet + result.payout));
      setSpinCount((currentSpinCount) => currentSpinCount + 1);
      setSpinResult(result);
      setIsSpinning(false);
      spinInterval.current = null;
      spinTimeout.current = null;
    }, 950);
  }

  function openCashout() {
    if (isSpinning || isCashedOut || credits <= 0) return;
    setCashoutScore(credits);
    setPlayerName("");
    setSubmitError("");
    setShowCashout(true);
  }

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedName = playerName.trim().slice(0, MAX_NAME_LENGTH);
    if (!cleanedName) {
      setSubmitError("Enter a name for the leaderboard.");
      return;
    }
    if (!supabase) {
      setSubmitError("The leaderboard is not connected yet.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    const { error } = await supabase.from("high_scores").insert({
      player_name: cleanedName,
      score: cashoutScore,
    });

    if (error) {
      setSubmitError("That score could not be saved. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setPlayerName(cleanedName);
    setIsSubmitting(false);
    setShowCashout(false);
    setIsCashedOut(true);

    try {
      setHighScores(await loadHighScores());
      setLeaderboardStatus("ready");
    } catch {
      setLeaderboardMessage("Score saved. Leaderboard refresh is unavailable.");
    }
  }

  function startOver() {
    if (spinInterval.current) window.clearInterval(spinInterval.current);
    if (spinTimeout.current) window.clearTimeout(spinTimeout.current);
    setReels(DEFAULT_REELS);
    setCredits(INITIAL_CREDITS);
    setSpinCount(0);
    setBet(1);
    setIsSpinning(false);
    setSpinResult(null);
    setShowCashout(false);
    setCashoutScore(0);
    setIsCashedOut(false);
    setPlayerName("");
    setSubmitError("");
  }

  const resultCopy = spinResult?.kind === "pair"
    ? `Pair — +${spinResult.payout} credit${spinResult.payout === 1 ? "" : "s"}`
    : spinResult?.kind === "none"
      ? "No match — spin again"
      : null;

  return (
    <main className="casino-page">
      <div className="casino-glow casino-glow-one" />
      <div className="casino-glow casino-glow-two" />

      <header className="topbar">
        <div className="brand-mark" aria-label="Coffey Casino">
          <span className="brand-mark-c">C</span>
          <span className="brand-mark-star">✦</span>
        </div>
        <div className="topbar-note">Coffey Casino · High score challenge</div>
        <div className="topbar-chip">LIVE</div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Coffey Casino</p>
        <h1 id="page-title">Spin for the <span>high score</span></h1>
        <p className="hero-copy">Start with {INITIAL_CREDITS} credits. Bet wisely. Cash out when you&apos;re ready.</p>
      </section>

      <section className="game-shell" aria-label="Slot machine game">
        <div className="machine-header">
          <div>
            <p className="machine-kicker">Current bankroll</p>
            <div className="credit-total" aria-live="polite">
              <strong>{credits}</strong>
              <span>credits</span>
            </div>
          </div>
          <div className="spin-counter" aria-live="polite">
            <span>{String(spinCount).padStart(2, "0")}</span>
            <small>spins</small>
          </div>
        </div>

        <div className={`slot-machine ${isSpinning ? "is-spinning" : ""}`}>
          <div className="machine-lights" aria-hidden="true">
            {Array.from({ length: 11 }, (_, index) => <span key={index} />)}
          </div>

          <div className="reels" aria-label="Current slot symbols">
            {reels.map((id, index) => {
              const symbol = symbolById(id);
              return (
                <div className="reel" key={`${id}-${index}`}>
                  <span className="reel-shine" aria-hidden="true" />
                  <span className="reel-symbol" role="img" aria-label={symbol.label}>{symbol.emoji}</span>
                </div>
              );
            })}
          </div>

          <div className="machine-rule" aria-hidden="true">
            <span />
            <b>✦</b>
            <span />
          </div>

          <div className="bet-row" aria-label="Choose your bet">
            <span className="bet-label">Bet</span>
            <div className="bet-options">
              {BETS.map((amount) => (
                <button
                  className={`bet-button ${bet === amount ? "is-selected" : ""}`}
                  type="button"
                  key={amount}
                  onClick={() => setBet(amount)}
                  disabled={isSpinning || isCashedOut || amount > credits}
                  aria-pressed={bet === amount}
                >
                  {amount}
                </button>
              ))}
            </div>
            <span className="bet-label">credits</span>
          </div>

          {isGameOver || isCashedOut ? (
            <button className="spin-button" type="button" onClick={startOver}>
              <span>Start over</span>
              <small>Begin with {INITIAL_CREDITS} credits</small>
            </button>
          ) : (
            <button className="spin-button" type="button" onClick={handleSpin} disabled={!canSpin}>
              <span>{isSpinning ? "Spinning..." : `Spin · ${bet}`}</span>
              <small>Every spin is random</small>
            </button>
          )}

          {resultCopy && <p className="spin-result" role="status" aria-live="polite">{resultCopy}</p>}
          <p className="payout-line">Pair 1× · Pizza/Candy 16× · Soccer 40×</p>
          <p className="payout-line">{INITIAL_CREDITS} to start · {MAX_CREDITS} credit max</p>
        </div>

        <button className="cashout-button" type="button" onClick={openCashout} disabled={isSpinning || isCashedOut || credits <= 0}>
          <span>{isCashedOut ? "Score submitted" : "Cash out"}</span>
          <small>{isCashedOut ? `${cashoutScore} credits locked in` : `Save ${credits} credits to the leaderboard`}</small>
        </button>

        <section className="leaderboard-card" aria-labelledby="leaderboard-title">
          <div className="leaderboard-heading">
            <div>
              <p className="machine-kicker">The room to beat</p>
              <h2 id="leaderboard-title">Top scores</h2>
            </div>
            <span className={`leaderboard-status status-${leaderboardStatus}`}>
              {leaderboardStatus === "ready" ? "Live" : leaderboardStatus === "loading" ? "Loading" : "Offline"}
            </span>
          </div>

          {highScores.length > 0 ? (
            <ol className="score-list">
              {highScores.map((score, index) => (
                <li key={score.id}>
                  <span className="score-rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="score-name">{score.player_name}</span>
                  <strong>{score.score}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="leaderboard-empty">
              {leaderboardStatus === "loading" ? "Loading scores..." : leaderboardMessage || "Be the first name on the board."}
            </p>
          )}
        </section>
      </section>

      <footer className="page-footer">
        <span>Coffey Casino</span>
        <span aria-hidden="true">✦</span>
      </footer>

      {spinResult?.kind === "triple" && spinResult.symbol && (
        <div className="result-overlay" role="status" aria-live="polite">
          <div className="win-card">
            <div className="win-confetti" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
            </div>
            <span className="win-sparkle" aria-hidden="true">✦</span>
            <p className="win-eyebrow">Three of a kind</p>
            <h2>{spinResult.symbol.label} jackpot</h2>
            <p className="win-payout">+{spinResult.payout} credits</p>
            <p>Please show your result to the casino management company to claim your prize.</p>
            <button className="popup-action" type="button" onClick={() => setSpinResult(null)}>Keep playing</button>
          </div>
        </div>
      )}

      {showCashout && (
        <div className="cashout-overlay" role="dialog" aria-modal="true" aria-labelledby="cashout-title">
          <form className="cashout-card" onSubmit={submitScore}>
            <p className="win-eyebrow">Cash out</p>
            <h2 id="cashout-title">Lock in {cashoutScore} credits</h2>
            <p>Enter a name for the Coffey Casino high-score board.</p>
            <label htmlFor="player-name">Your name</label>
            <input
              id="player-name"
              name="player-name"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value.slice(0, MAX_NAME_LENGTH))}
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              autoComplete="off"
              placeholder="Name"
            />
            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <div className="cashout-actions">
              <button className="popup-action secondary-action" type="button" onClick={() => setShowCashout(false)}>Keep playing</button>
              <button className="popup-action" type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Submit score"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
