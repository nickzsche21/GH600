const LETTER_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

function remapDistractors(wrongAnswerExplanations) {
  const result = {};
  for (const [letter, explanation] of Object.entries(wrongAnswerExplanations || {})) {
    const index = LETTER_TO_INDEX[letter];
    if (index !== undefined) result[index] = explanation;
  }
  return result;
}

export function toClientScenario(row) {
  return {
    id: row.id,
    title: row.title,
    primary_domain: Number(row.domain_code.slice(1)),
    objective: row.subskill,
    difficulty: row.difficulty,
    prompt: row.prompt,
    artifact_type: row.artifact ? "code" : null,
    artifact_content: row.artifact ? JSON.stringify({ name: row.artifact_type, code: row.artifact }) : null,
    options: row.options,
    version: row.created_version,
    mock_id: row.mock_id,
    mock_position: row.mock_position
  };
}

export function gradingFields(row) {
  return {
    correct_index: row.correct_option_index,
    correct_explanation: row.explanation,
    distractor_explanations: remapDistractors(row.wrong_answer_explanations)
  };
}
