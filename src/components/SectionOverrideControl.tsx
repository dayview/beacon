import React, { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { api, ApiSectionOutcome } from "../lib/api";
import { Button } from "./ui/Button";

const OUTCOME_OPTIONS: { value: ApiSectionOutcome; label: string }[] = [
  { value: "skipped", label: "Skipped" },
  { value: "insufficient_attention", label: "Skimmed" },
  { value: "prolonged_dwell", label: "Prolonged dwell (unclear)" },
  { value: "likely_confusion", label: "Likely confusion" },
  { value: "likely_high_interest", label: "Likely high interest" },
  { value: "repeated_navigation", label: "Repeated navigation" },
  { value: "normal", label: "Normal" },
];

interface SectionOverrideValue {
  outcome: ApiSectionOutcome;
  note: string | null;
  overriddenAt: string;
}

interface SectionOverrideControlProps {
  testId: string;
  frameId: string;
  autoOutcome: ApiSectionOutcome;
  override: SectionOverrideValue | null;
  onSaved: (override: SectionOverrideValue | null) => void;
}

// Lets the test owner confirm or correct sectionInsightsService's
// classified outcome for one section. Saving with the outcome unchanged
// from the classifier's own read counts as a confirmation; changing it
// counts as a relabel — both go through the same control and endpoint.
export function SectionOverrideControl({
  testId,
  frameId,
  autoOutcome,
  override,
  onSaved,
}: SectionOverrideControlProps) {
  const [outcome, setOutcome] = useState<ApiSectionOutcome>(override?.outcome ?? autoOutcome);
  const [note, setNote] = useState(override?.note ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.setSectionOverride(testId, frameId, outcome, note);
      onSaved({ outcome: result.outcome, note: result.note, overriddenAt: new Date().toISOString() });
      toast.success(outcome === autoOutcome ? "Confirmed the classifier's read." : "Section relabeled.");
    } catch {
      toast.error("Couldn't save your review — try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await api.clearSectionOverride(testId, frameId);
      setOutcome(autoOutcome);
      setNote("");
      onSaved(null);
      toast.success("Review cleared — back to the classifier's read.");
    } catch {
      toast.error("Couldn't clear your review — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#050038]/10 flex flex-wrap items-center gap-2">
      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value as ApiSectionOutcome)}
        disabled={saving}
        className="text-xs border border-[#050038]/15 rounded-md px-2 py-1.5 bg-white text-[#050038] disabled:opacity-50"
      >
        {OUTCOME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={saving}
        placeholder="Optional note"
        className="text-xs border border-[#050038]/15 rounded-md px-2 py-1.5 flex-1 min-w-[140px] bg-white text-[#050038] disabled:opacity-50"
      />
      <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 size={12} className="animate-spin" /> : "Confirm / relabel"}
      </Button>
      {override && (
        <Button size="sm" variant="ghost" onClick={handleClear} disabled={saving}>
          Clear
        </Button>
      )}
      {override && (
        <span className="text-[10px] text-[#050038]/40 flex items-center gap-1">
          <Check size={10} /> Reviewed
        </span>
      )}
    </div>
  );
}
