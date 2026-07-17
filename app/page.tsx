"use client";

import { useEffect, useState } from "react";

type SymbolId = "turtle" | "golf" | "hotdog" | "pizza" | "candy" | "soccer";

type SlotSymbol = {
  id: SymbolId;
  emoji: string;
  label: string;
};

type SavedGame = { spinCount: number; reels: SymbolId[] };

const SYMBOLS: SlotSymbol[] = [
  { id: "turtle", emoji: "🐢", label: "Turtle" },
  { id: "golf", emoji: "⛳", label: "Golf ball" },
  { id: "hotdog", emoji: "🌭", label: "Hot dog" },
  { id: "pizza", emoji: "🍕", label: "Pizza slice" },
  { id: "candy", emoji: "🍬", label: "Candy" },
  { id: "soccer", emoji: "⚽", label: "Soccer ball" },
];

const WIN_SCHEDULE = {
  mini: 5,
  large: 11,
  mega: 17,
} as const;

const STORAGE_KEY = "coffey-casino-game-v2";

const DEFAULT_REELS: SymbolId[] = ["turtle", "pizza", "soccer"];

function symbolById(id: SymbolId) {
  return SYMBOLS.find((symbol) => symbol.id === id) ?? SYMBOLS[0];
}

function randomReels(): SymbolId[] {
  return Array.from({ length: 3 }, () => {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id;
  });
}

function reelsForSpin(spin: number): SymbolId[] {
  if (spin === WIN_SCHEDULE.mini) return ["turtle", "turtle", "turtle"];
  if (spin === WIN_SCHEDULE.large) return ["pizza", "pizza", "pizza"];
  if (spin === WIN_SCHEDULE.mega) return ["candy", "candy", "candy"];

  const first = spin % SYMBOLS.length;
  return [
    SYMBOLS[first].id,
    SYMBOLS[(first + 2) % SYMBOLS.length].id,
    SYMBOLS[(first + 4) % SYMBOLS.length].id,
  ];
}

function tierForSpin(spin: number) {
  if (spin >= WIN_SCHEDULE.mega) return 3;
  if (spin >= WIN_SCHEDULE.large) return 2;
  if (spin >= WIN_SCHEDULE.mini) return 1;
  return 0;
}

function winCopy(tier: number) {
  if (tier === 3) {
    return {
      eyebrow: "THE BIG ONE",
      title: "Mega Jackpot!",
      body: "Please show your result to the casino management company to claim your prize.",
    };
  }
  if (tier === 2) {
    return {
      eyebrow: "LUCKY YOU",
      title: "Large Jackpot!",
      body: "Please show your result to the casino management company to claim your prize.",
    };
  }
  return {
    eyebrow: "A LITTLE MAGIC",
    title: "Mini Jackpot!",
    body: "Please show your result to the casino management company to claim your prize.",
  };
}

export default function Home() {
  const [reels, setReels] = useState<SymbolId[]>(DEFAULT_REELS);
  const [spinCount, setSpinCount] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const restoreGame = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as SavedGame;
          if (Array.isArray(parsed.reels) && parsed.reels.length === 3) {
            setReels(parsed.reels);
          }
          if (typeof parsed.spinCount === "number") setSpinCount(parsed.spinCount);
        }
      } catch {
        // A fresh game is the right fallback if local storage is unavailable.
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(restoreGame);
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    const saved: SavedGame = { spinCount, reels };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [hasLoaded, reels, spinCount]);

  const isComplete = spinCount >= WIN_SCHEDULE.mega;
  const currentCopy = lastWin > 0 ? winCopy(lastWin) : null;

  function handleSpin() {
    if (isSpinning || isComplete) return;

    const nextSpin = spinCount + 1;
    setIsSpinning(true);
    setLastWin(0);

    const shuffle = window.setInterval(() => setReels(randomReels()), 90);
    window.setTimeout(() => {
      window.clearInterval(shuffle);
      const nextReels = reelsForSpin(nextSpin);
      const nextTier = tierForSpin(nextSpin);
      const wonTier = [WIN_SCHEDULE.mini, WIN_SCHEDULE.large, WIN_SCHEDULE.mega].includes(nextSpin)
        ? nextTier
        : 0;
      setReels(nextReels);
      setSpinCount(nextSpin);
      setLastWin(wonTier);
      setIsSpinning(false);
    }, 1050);
  }

  function resetGame() {
    window.localStorage.removeItem(STORAGE_KEY);
    setReels(DEFAULT_REELS);
    setSpinCount(0);
    setLastWin(0);
    setIsSpinning(false);
  }

  return (
    <main className="casino-page">
      <div className="casino-glow casino-glow-one" />
      <div className="casino-glow casino-glow-two" />

      <header className="topbar">
        <div className="brand-mark" aria-label="Coffey Casino">
          <span className="brand-mark-c">C</span>
          <span className="brand-mark-star">✦</span>
        </div>
        <div className="topbar-note">Coffey Casino · Lucky reels</div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Coffey Casino</p>
        <h1 id="page-title">
          Spin the <span>Lucky</span> Reels
        </h1>
        <p className="hero-copy">
          Match three symbols to unlock the next jackpot.
        </p>
      </section>

      <section className="game-shell" aria-label="Slot machine game">
        <div className="machine-header">
          <div>
            <p className="machine-kicker">Coffey Casino</p>
            <h2>Spin the reels</h2>
          </div>
          <div className="spin-counter" aria-live="polite">
            <span>{String(spinCount).padStart(2, "0")}</span>
            <small>spins</small>
          </div>
        </div>

        <div className={`slot-machine ${isSpinning ? "is-spinning" : ""}`}>
          <div className="machine-lights" aria-hidden="true">
            {Array.from({ length: 11 }, (_, index) => (
              <span key={index} />
            ))}
          </div>

          <div className="reels" aria-label="Current slot symbols">
            {reels.map((id, index) => {
              const symbol = symbolById(id);
              return (
                <div className="reel" key={`${id}-${index}`}>
                  <span className="reel-shine" aria-hidden="true" />
                  <span className="reel-symbol" role="img" aria-label={symbol.label}>
                    {symbol.emoji}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="machine-rule" aria-hidden="true">
            <span />
            <b>✦</b>
            <span />
          </div>

          <button
            className="spin-button"
            type="button"
            onClick={handleSpin}
            disabled={isSpinning || isComplete}
          >
            <span>{isSpinning ? "Spinning..." : isComplete ? "Jackpot won" : "Spin the reels"}</span>
            <small>{isComplete ? "Claim your prize" : "Every spin is free"}</small>
          </button>

          <p className="machine-footnote">Zero stakes. Maximum luck.</p>
        </div>

        {currentCopy && (
          <div className={`win-card win-tier-${lastWin}`} role="status" aria-live="polite">
            <div className="win-confetti" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
            </div>
            <span className="win-sparkle" aria-hidden="true">✦</span>
            <p className="win-eyebrow">{currentCopy.eyebrow}</p>
            <h2>{currentCopy.title}</h2>
            <p>{currentCopy.body}</p>
            {lastWin < 3 && (
              <button className="popup-action" type="button" onClick={() => setLastWin(0)}>
                Continue spinning
              </button>
            )}
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>Coffey Casino</span>
        <span aria-hidden="true">✦</span>
        <button type="button" onClick={resetGame}>Always a jackpot</button>
      </footer>
    </main>
  );
}
