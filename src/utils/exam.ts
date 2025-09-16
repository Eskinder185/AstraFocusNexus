// Minimal exam helpers with dual export names to match older imports.

export function selectExamQuestions(
  quiz: any,
  n: number,
  tagFilter?: string[],
  difficulty?: Array<"easy" | "medium" | "hard">,
  shuffle = true
) {
  if (!quiz || !quiz.questions) return [];
  let qs = [...quiz.questions];

  if (tagFilter && tagFilter.length) {
    qs = qs.filter((q: any) => (q.tags || []).some((t: string) => tagFilter.includes(t)));
  }
  if (difficulty && difficulty.length) {
    qs = qs.filter((q: any) => q.difficulty && difficulty.includes(q.difficulty));
  }
  if (shuffle) {
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qs[i], qs[j]] = [qs[j], qs[i]];
    }
  }
  return qs.slice(0, n);
}

// Keep backward compatibility with older code:
export function buildExamSet(
  quiz: any,
  n: number,
  tagFilter?: string[],
  difficulty?: Array<"easy" | "medium" | "hard">,
  shuffle = true
) {
  return selectExamQuestions(quiz, n, tagFilter, difficulty, shuffle);
}

export function scoreAttempt(quiz: any, attempt: any) {
  const byTag: Record<string, { c: number; t: number }> = {};
  const byDifficulty: Record<"easy" | "medium" | "hard", { c: number; t: number }> = {
    easy: { c: 0, t: 0 },
    medium: { c: 0, t: 0 },
    hard: { c: 0, t: 0 },
  };
  const times: number[] = [];
  let correct = 0;
  let total = 0;
  const flagged: string[] = [];

  const qById: Record<string, any> = {};
  for (const q of quiz?.questions || []) qById[q.id] = q;

  for (const a of attempt?.answers || []) {
    const q = qById[a.questionId];
    if (!q) continue;
    total++;
    if (a.correct) correct++;
    times.push(a.timeMs || 0);
    if (a.flagged) flagged.push(a.questionId);

    const tags = q.tags || [];
    for (const t of tags) {
      byTag[t] = byTag[t] || { c: 0, t: 0 };
      byTag[t].t++;
      if (a.correct) byTag[t].c++;
    }
    const diff = (q.difficulty || "medium") as "easy" | "medium" | "hard";
    byDifficulty[diff].t++;
    if (a.correct) byDifficulty[diff].c++;
  }

  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, byTag, byDifficulty, flagged, times };
}

// Back-compat alias (some files expect this name)
export const scoreExam = scoreAttempt;

export function humanTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const copy = [...arr].sort((a, b) => a - b);
  const idx = Math.min(copy.length - 1, Math.max(0, Math.round((p / 100) * (copy.length - 1))));
  return copy[idx];
}
