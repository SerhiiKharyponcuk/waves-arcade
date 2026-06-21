import assert from "node:assert/strict";
import test from "node:test";
import { calculateServerScore, validateCheckpointProgress } from "./antiCheatService.js";

test("server score ignores the submitted score field", () => {
  assert.equal(calculateServerScore({
    sessionId: "00000000-0000-0000-0000-000000000000",
    score: 999_999,
    distance: 1_000,
    coinsCollected: 2,
    durationMs: 5_000,
    obstacleHits: 1,
    clientChecksum: ""
  }), 1_250);
});

test("checkpoint accepts plausible monotonic movement", () => {
  const reasons = validateCheckpointProgress(
    { checkpointCount: 1, lastCheckpointElapsedMs: 5_000, checkpointDistance: 1_300, checkpointCoins: 2, checkpointTransitions: 8 },
    { sessionId: "00000000-0000-0000-0000-000000000000", sequence: 2, elapsedMs: 10_000, distance: 2_750, coinsCollected: 5, inputTransitions: 15 },
    10_200
  );
  assert.deepEqual(reasons, []);
});

test("checkpoint rejects sequence, distance and coin manipulation", () => {
  const reasons = validateCheckpointProgress(
    { checkpointCount: 1, lastCheckpointElapsedMs: 5_000, checkpointDistance: 1_300, checkpointCoins: 2, checkpointTransitions: 8 },
    { sessionId: "00000000-0000-0000-0000-000000000000", sequence: 4, elapsedMs: 5_100, distance: 100_000, coinsCollected: 900, inputTransitions: 500 },
    5_200
  );
  assert.ok(reasons.includes("checkpoint_sequence_invalid"));
  assert.ok(reasons.includes("checkpoint_distance_jump_impossible"));
  assert.ok(reasons.includes("checkpoint_coin_jump_impossible"));
  assert.ok(reasons.includes("checkpoint_input_rate_impossible"));
});
