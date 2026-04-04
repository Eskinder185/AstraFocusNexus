import React, { useMemo } from "react";
import PageHeader from "../components/PageHeader";
import ToolSection from "../components/ToolSection";
import { useAppToast } from "../context/AppToast";

interface WellnessProps {
  mood: number;
  setMood: (v: number) => void;
  stress: number;
  setStress: (v: number) => void;
  suggestBreakdown: () => void;
}

const Wellness: React.FC<WellnessProps> = ({ mood, setMood, stress, setStress, suggestBreakdown }) => {
  const { showToast } = useAppToast();
  const suggestion = useMemo(() => {
    if (stress >= 7) {
      return "You’re carrying a lot right now. Shrink one task to three tiny steps, then step away for five minutes—fresh air counts.";
    }
    if (mood <= 2) {
      return "Low days happen. Pick one small, meaningful task, finish it, and acknowledge the win—progress doesn’t have to be loud.";
    }
    if (mood >= 4 && stress <= 3) {
      return "Solid headspace. Line up your top three important items and pair the first with a session on the Focus page.";
    }
    return "Steady is enough. Do one clear next step, then come back and adjust mood or stress if you want.";
  }, [mood, stress]);

  const onStretch = () => {
    showToast(
      "Set a 5-minute timer. Roll shoulders slowly; breathe in for 4, out for 6. Small movement counts. 🧘",
      { durationMs: 12_000 }
    );
  };

  return (
    <div>
      <PageHeader
        icon="🧠"
        title="Wellness"
        subtitle="Check in on mood and stress—then get a gentle nudge toward the next small step."
      />

      <ToolSection
        title="Today’s check-in"
        lede="How you feel shapes the hint below. Actions connect to your task list and timer—same system as Home."
      >
        <div className="wellness-layout">
          <div className="wellness-panel wellness-panel--inputs">
            <div className="wellness-panel__block">
              <span className="task-form__label">Mood</span>
              <div className="mood-choices" role="group" aria-label="How are you feeling?">
                {[
                  { v: 1, e: "😟", label: "Rough" },
                  { v: 3, e: "😐", label: "Okay" },
                  { v: 5, e: "🙂", label: "Good" },
                ].map(({ v, e, label }) => (
                  <button
                    key={v}
                    type="button"
                    className={"emoji-big" + (mood === v ? " selected" : "")}
                    onClick={() => setMood(v)}
                    aria-label={`Mood: ${label}`}
                    aria-pressed={mood === v}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="wellness-panel__block">
              <span className="task-form__label">Stress level</span>
              <div className="stress-readout" aria-live="polite">
                <span className="stress-readout__value">{stress}</span>
                <span className="stress-readout__of">/ 10</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={stress}
                onChange={e => setStress(Number(e.target.value))}
                aria-valuetext={`Stress ${stress} out of 10`}
              />
              <div className="stress-scale">
                <span>Calm</span>
                <span>Balanced</span>
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="wellness-coach" aria-live="polite">
            <div className="wellness-coach__head">
              <span className="wellness-coach__eyebrow">Coach note</span>
              <span className="wellness-coach__badge">Updates when you change mood or stress</span>
            </div>
            <p className="wellness-coach__text">{suggestion}</p>
            <div className="wellness-coach__actions">
              <button type="button" className="btn btn--primary" onClick={suggestBreakdown}>
                Break down 3 steps
              </button>
              <button type="button" className="btn btn--secondary" onClick={onStretch}>
                5-minute stretch
              </button>
            </div>
          </div>
        </div>
      </ToolSection>
    </div>
  );
};

export default Wellness;
