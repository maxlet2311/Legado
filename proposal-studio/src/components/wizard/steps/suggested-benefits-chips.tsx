"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { suggestBenefitsAction } from "@/lib/ai/suggest-benefits-action";

interface Suggestion {
  title: string;
  description: string;
  icon: string;
}

interface SuggestedBenefitsChipsProps {
  proposalId: string;
  existingTitles: string[];
  onAdd: (suggestion: Suggestion) => void;
}

/** Chips de beneficios sugeridos por IA: nunca se agregan solos, un clic por chip. */
function SuggestedBenefitsChips({ proposalId, existingTitles, onAdd }: SuggestedBenefitsChipsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    const result = await suggestBenefitsAction({ proposal_id: proposalId, existing_titles: existingTitles });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuggestions(result.data ?? []);
  }

  function addSuggestion(suggestion: Suggestion) {
    onAdd(suggestion);
    setSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
  }

  function dismissSuggestion(suggestion: Suggestion) {
    setSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
  }

  return (
    <div className="mb-4">
      <Button type="button" variant="ghost" size="sm" onClick={fetchSuggestions} disabled={loading}>
        {loading ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        Sugerir beneficios con IA
      </Button>
      {error ? <p className="mt-1 text-caption text-error">{error}</p> : null}
      {suggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Badge
              key={suggestion.title}
              variant="draft"
              className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5"
              title={suggestion.description}
            >
              {suggestion.title}
              <button
                type="button"
                onClick={() => addSuggestion(suggestion)}
                aria-label={`Agregar beneficio sugerido: ${suggestion.title}`}
                className="rounded-full p-0.5 hover:bg-surface-container-low"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => dismissSuggestion(suggestion)}
                aria-label={`Descartar sugerencia: ${suggestion.title}`}
                className="rounded-full p-0.5 hover:bg-surface-container-low"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { SuggestedBenefitsChips };
