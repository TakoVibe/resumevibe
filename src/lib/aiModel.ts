// One model for every AI feature. Benchmarked Nov 2026 with each feature's production prompt:
// gpt-6-luna without reasoning was the fastest model that passed every quality check
// (Copilot 2.4s vs 11s, inline rewrite 1.1s vs 7.3s, import 7.5s vs 42s, tailoring 28s vs 48s,
// cover letter 3.0s vs 5.5s) and it judged better than gpt-5.4-mini. Higher reasoning effort was
// never faster or more accurate. Re-run the benchmarks before changing either value.
export const AI_MODEL = 'gpt-6-luna';
export const AI_REASONING_EFFORT = 'none';
