"use client";

import { useCallback, useEffect, useState } from "react";

import { pickRounds, type Round } from "@/lib/rounds";
import { multiplierFor, rankFor, ROUND_SECONDS, scoreAnswer } from "@/lib/score";

import { Confetti } from "../confetti";

type Guess = "human" | "ai";
type Answer = { round: Round; guess: Guess; correct: boolean; points: number };
type Phase = "intro" | "playing" | "end";

const TYPE_MS = 16;

export function HumanOrAi({ name }: { name: string | null }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);

  const round = rounds[index];
  const current = answers[index];
  const fullyTyped = round ? typed >= round.text.length : false;

  function start() {
    setRounds(pickRounds());
    setIndex(0);
    setAnswers([]);
    setStreak(0);
    setScore(0);
    setTyped(0);
    setTimeLeft(ROUND_SECONDS);
    setPhase("playing");
  }

  // Typewriter reveal.
  useEffect(() => {
    if (phase !== "playing" || !round || fullyTyped) return;
    const id = setTimeout(() => setTyped((t) => t + 1), TYPE_MS);
    return () => clearTimeout(id);
  }, [phase, round, typed, fullyTyped]);

  const answer = useCallback(
    (guess: Guess | null) => {
      if (!round || current) return;
      const correct = guess === round.author;
      const result = scoreAnswer({ correct, secondsLeft: timeLeft, streak });
      setAnswers((a) => [...a, { round, guess: guess ?? (round.author === "ai" ? "human" : "ai"), correct, points: result.points }]);
      setStreak(result.streak);
      setScore((s) => s + result.points);
      setTyped(round.text.length);
    },
    [round, current, timeLeft, streak],
  );

  // Countdown once the text is visible; time out counts as a miss.
  useEffect(() => {
    if (phase !== "playing" || !fullyTyped || current) return;
    if (timeLeft <= 0) { answer(null); return; }
    const id = setTimeout(() => setTimeLeft((t) => +(t - 0.1).toFixed(1)), 100);
    return () => clearTimeout(id);
  }, [phase, fullyTyped, current, timeLeft, answer]);

  const next = useCallback(() => {
    if (index + 1 >= rounds.length) { setPhase("end"); return; }
    setIndex((i) => i + 1);
    setTyped(0);
    setTimeLeft(ROUND_SECONDS);
  }, [index, rounds.length]);

  // Keyboard: ← / H human, → / I AI, Enter next.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!current && (k === "arrowleft" || k === "h")) answer("human");
      else if (!current && (k === "arrowright" || k === "i")) answer("ai");
      else if (current && (k === "enter" || k === " ")) { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, answer, next]);

  if (phase === "intro") {
    return (
      <section className="hoa-intro">
        <h1 className="glitch" data-text="¿Humano o IA?">¿Humano o IA?</h1>
        <p className="lead center">
          {name ? <><b>{name}</b>, te </> : "Te "}mostraremos 10 textos. Algunos los escribieron grandes autores; otros, una inteligencia artificial.
          ¿Puedes notar la diferencia?
        </p>
        <ul className="rules">
          <li><span>⏱️</span>{ROUND_SECONDS} s por ronda</li>
          <li><span>⚡</span>Más rápido, más puntos</li>
          <li><span>🔥</span>Rachas multiplican x3</li>
        </ul>
        <button className="btn big" onClick={start}>Empezar el reto</button>
      </section>
    );
  }

  if (phase === "end") return <EndScreen name={name} answers={answers} score={score} onReplay={start} />;

  const pct = (timeLeft / ROUND_SECONDS) * 100;
  return (
    <section className="hoa">
      <div className="hoa-hud">
        <div className="dots" aria-label={`Ronda ${index + 1} de ${rounds.length}`}>
          {rounds.map((_, i) => (
            <i key={i} className={i < answers.length ? (answers[i].correct ? "ok" : "ko") : i === index ? "now" : ""} />
          ))}
        </div>
        <div className="hud-right">
          {streak >= 3 && <span className="streak" key={streak}>🔥 x{multiplierFor(streak)}</span>}
          <span className="score-pill"><b>{score.toLocaleString("es")}</b> pts</span>
        </div>
      </div>

      <div className="timer"><i style={{ width: `${pct}%` }} className={pct < 30 ? "low" : ""} /></div>

      <article key={round.id} className={`quote-card${current ? (current.correct ? " correct" : " wrong") : ""}`}>
        <span className="qmark" aria-hidden>“</span>
        <p className="quote">
          {round.text.slice(0, typed)}
          {!fullyTyped && <span className="caret" />}
        </p>
        {current && (
          <div className="reveal">
            <span className={`badge ${round.author}`}>{round.author === "ai" ? "🤖 IA" : "🧑 Humano"}</span>
            <span className="credit">{round.credit}</span>
            {current.points > 0 && <span className="plus">+{current.points}</span>}
          </div>
        )}
      </article>

      {!current ? (
        <div className="choices">
          <button className="choice human" disabled={!fullyTyped} onClick={() => answer("human")}>
            <span className="emoji">🧑</span>Humano<kbd>←</kbd>
          </button>
          <button className="choice ai" disabled={!fullyTyped} onClick={() => answer("ai")}>
            <span className="emoji">🤖</span>IA<kbd>→</kbd>
          </button>
        </div>
      ) : (
        <div className="choices one">
          <p className={`verdict ${current.correct ? "ok" : "ko"}`}>{current.correct ? "¡Correcto!" : timeLeft <= 0 ? "Se acabó el tiempo" : "¡Te engañó!"}</p>
          <button className="btn" onClick={next}>{index + 1 >= rounds.length ? "Ver resultado" : "Siguiente"} →</button>
        </div>
      )}
    </section>
  );
}

function EndScreen({ name, answers, score, onReplay }: { name: string | null; answers: Answer[]; score: number; onReplay: () => void }) {
  const correct = answers.filter((a) => a.correct).length;
  const rank = rankFor(correct, answers.length);
  const [shown, setShown] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const started = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - started) / 1400);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  async function share() {
    const text = `Saqué ${correct}/${answers.length} en "¿Humano o IA?" y soy ${rank.title} ${rank.emoji} (${score} pts). ¿Puedes ganarme?`;
    const url = window.location.origin + "/play";
    try {
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); }
    } catch { /* user cancelled */ }
  }

  return (
    <section className="hoa-end">
      {correct >= answers.length * 0.6 && <Confetti />}
      <div className="rank-emoji">{rank.emoji}</div>
      <p className="eyebrow">{name ? `${name}, eres` : "Eres"}</p>
      <h1 className="glitch small" data-text={rank.title}>{rank.title}</h1>
      <p className="lead center">{rank.line}</p>
      <div className="stats center">
        <div className="stat"><b>{shown.toLocaleString("es")}</b><small>puntos</small></div>
        <div className="stat"><b>{correct}/{answers.length}</b><small>aciertos</small></div>
      </div>
      <ol className="recap">
        {answers.map((a) => (
          <li key={a.round.id} className={a.correct ? "ok" : "ko"}>
            <span>{a.correct ? "✓" : "✗"}</span>
            <em>{a.round.text.split("\n")[0]}</em>
            <small>{a.round.author === "ai" ? "IA" : a.round.credit.split(" · ")[0]}</small>
          </li>
        ))}
      </ol>
      <div className="end-actions">
        <button className="btn" onClick={share}>{copied ? "¡Copiado!" : "Compartir resultado"}</button>
        <button className="btn ghost" onClick={onReplay}>Jugar otra vez</button>
      </div>
    </section>
  );
}
