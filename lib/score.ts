export const ROUND_SECONDS = 15;

/** 100 base + up to 50 for speed, multiplied by the streak (x1, x1.5 from 3 in a row, x2 from 5, x3 from 10). */
export function scoreAnswer({ correct, secondsLeft, streak }: { correct: boolean; secondsLeft: number; streak: number }) {
  if (!correct) return { points: 0, streak: 0 };
  const next = streak + 1;
  const multiplier = next >= 10 ? 3 : next >= 5 ? 2 : next >= 3 ? 1.5 : 1;
  const base = 100 + Math.round((Math.max(0, Math.min(secondsLeft, ROUND_SECONDS)) / ROUND_SECONDS) * 50);
  return { points: Math.round(base * multiplier), streak: next };
}

export function multiplierFor(streak: number): number {
  return streak >= 10 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
}

const RANKS = [
  { min: 1, title: "Detector de Turing", emoji: "🕵️", line: "Nadie te engaña: ni humanos ni máquinas." },
  { min: 0.8, title: "Ojo de halcón", emoji: "🦅", line: "Distingues el alma de un texto casi siempre." },
  { min: 0.6, title: "Buen instinto", emoji: "🧠", line: "Vas bien, pero la IA te coló un par." },
  { min: 0.4, title: "Mitad y mitad", emoji: "🤝", line: "La línea entre humano y máquina se te borró." },
  { min: 0.01, title: "Confundido por el algoritmo", emoji: "🌀", line: "La IA escribe más humano de lo que crees." },
  { min: 0, title: "Engañado por la máquina", emoji: "🤖", line: "¿Seguro que tú no eres una IA?" },
];

export function rankFor(correct: number, total: number) {
  const ratio = total ? correct / total : 0;
  return RANKS.find((r) => ratio >= r.min) ?? RANKS[RANKS.length - 1];
}
