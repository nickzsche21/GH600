import test from "node:test";
import assert from "node:assert/strict";
import { buildBalancedDiagnostic } from "../diagnostic-utils.js";

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function fixture() {
  const domains = Array.from({ length: 6 }, (_, index) => ({ id: index + 1 }));
  const questions = domains.flatMap(domain => Array.from({ length: 3 }, (_, index) => ({
    id: `${domain.id}-${index}`,
    d: domain.id,
    artifact: index === 0 ? { name: "sample.yml", code: "enabled: true" } : undefined,
    a: [`wrong-${domain.id}-${index}-a`, `correct-${domain.id}-${index}`, `wrong-${domain.id}-${index}-c`, `wrong-${domain.id}-${index}-d`],
    c: 1
  })));
  return { domains, questions };
}

test("diagnostic always has two questions per domain and exactly three correct answers in each letter slot", () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const { domains, questions } = fixture();
    const diagnostic = buildBalancedDiagnostic(domains, questions, seededRandom(seed));

    assert.equal(diagnostic.length, 12);
    assert.deepEqual(
      Object.fromEntries(domains.map(domain => [domain.id, diagnostic.filter(question => question.d === domain.id).length])),
      Object.fromEntries(domains.map(domain => [domain.id, 2]))
    );
    assert.deepEqual(
      [0, 1, 2, 3].map(slot => diagnostic.filter(question => question.c === slot).length),
      [3, 3, 3, 3]
    );
  }
});

test("option reordering preserves the correct answer and does not mutate authored questions", () => {
  const { domains, questions } = fixture();
  const original = structuredClone(questions);
  const correctById = new Map(questions.map(question => [question.id, question.a[question.c]]));
  const diagnostic = buildBalancedDiagnostic(domains, questions, seededRandom(42));

  for (const question of diagnostic) {
    assert.equal(question.a[question.c], correctById.get(question.id));
    assert.equal(new Set(question.a).size, 4);
  }
  assert.deepEqual(questions, original);
});
