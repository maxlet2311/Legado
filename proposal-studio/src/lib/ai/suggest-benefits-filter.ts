function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

interface BenefitSuggestion {
  title: string;
  description: string;
  icon: string;
}

/** Descarta sugerencias cuyo título ya existe entre los beneficios cargados (case-insensitive, trim). */
function filterOutExistingBenefits<T extends BenefitSuggestion>(
  suggestions: T[],
  existingTitles: string[],
): T[] {
  const existing = new Set(existingTitles.map(normalizeTitle));
  return suggestions.filter((suggestion) => !existing.has(normalizeTitle(suggestion.title)));
}

export { filterOutExistingBenefits, normalizeTitle };
export type { BenefitSuggestion };
