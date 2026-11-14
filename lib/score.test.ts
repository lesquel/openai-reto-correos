import { test } from "node:test";
import assert from "node:assert/strict";

import { rankFor, scoreAnswer } from "./score.ts";

test("wrong answers score 0 and reset the streak", () => {
  assert.deepEqual(scoreAnswer({ correct: false, secondsLeft: 10, streak: 4 }), { points: 0, streak: 0 });
});

test("correct answers add a time bonus and a streak multiplier", () => {
  assert.deepEqual(scoreAnswer({ correct: true, secondsLeft: 15, streak: 0 }), { points: 150, streak: 1 });
  assert.deepEqual(scoreAnswer({ correct: true, secondsLeft: 0, streak: 2 }), { points: 150, streak: 3 });
  assert.deepEqual(scoreAnswer({ correct: true, secondsLeft: 15, streak: 9 }), { points: 450, streak: 10 });
});

test("rank depends on how many answers were right", () => {
  assert.equal(rankFor(10, 10).title, "Detector de Turing");
  assert.equal(rankFor(0, 10).title, "Engañado por la máquina");
});
