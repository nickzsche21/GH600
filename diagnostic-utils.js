export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function reorderQuestionOptions(question, correctSlot, random = Math.random) {
  const correctAnswer = question.a[question.c];
  const distractors = shuffle(question.a.filter((_, index) => index !== question.c), random);
  const options = new Array(question.a.length);
  options[correctSlot] = correctAnswer;

  let distractorIndex = 0;
  for (let index = 0; index < options.length; index += 1) {
    if (index === correctSlot) continue;
    options[index] = distractors[distractorIndex++];
  }

  return { ...question, a: options, c: correctSlot };
}

export function buildBalancedDiagnostic(domains, questions, random = Math.random) {
  const selected = domains.flatMap(domain => {
    const pool = questions.filter(question => question.d === domain.id);
    if (pool.length < 2) throw new Error(`Domain ${domain.id} needs at least two diagnostic questions`);
    const artifactQuestion = pool.find(question => question.artifact) || pool[0];
    const remaining = pool.filter(question => question !== artifactQuestion);
    const secondQuestion = shuffle(remaining, random)[0];
    return [artifactQuestion, secondQuestion];
  });

  const balancedSlots = shuffle([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3], random);
  return shuffle(selected, random).map((question, index) =>
    reorderQuestionOptions(question, balancedSlots[index], random)
  );
}
