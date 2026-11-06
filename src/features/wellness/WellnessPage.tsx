import React, { useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Angry, Coffee, Frown, Grid2x2, Laugh, Leaf, Lock, Meh, Smile } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { usePomodoro } from "../../context/PomodoroContext";
import { useNow } from "../../hooks/useNow";
import { cx } from "../../lib/cx";
import { fromDateKey, toDateKey } from "../../lib/dates";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";
import { readEntry, readHistory, suggestionFor, writeEntry, type WellnessEntry } from "./wellnessStore";

const MOODS = [
  { v: 1, label: "Rough", icon: Angry },
  { v: 2, label: "Low", icon: Frown },
  { v: 3, label: "Okay", icon: Meh },
  { v: 4, label: "Good", icon: Smile },
  { v: 5, label: "Great", icon: Laugh },
];
const ENERGY = ["Drained", "Low", "Steady", "Good", "Charged"];

export const WellnessPage: React.FC = () => {
  const { prefs } = useWorkspace();
  const { setPrefs } = useWorkspaceActions();

  if (!prefs.wellnessEnabled) {
    return (
      <div>
        <PageHeader title="Wellness" />
        <section className="card">
          <EmptyState
            icon={<Leaf size={20} />}
            title="Wellness check-ins are turned off"
            actions={
              <button type="button" className="btn btn--primary" onClick={() => setPrefs({ wellnessEnabled: true })}>
                Turn on check-ins
              </button>
            }
          >
            Earlier check-ins are still stored on this device. Turning this back on shows them again.
          </EmptyState>
        </section>
      </div>
    );
  }
  return <WellnessContent />;
};

const WellnessContent: React.FC = () => {
  const now = useNow();
  const today = toDateKey(now);
  const pomo = usePomodoro();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<WellnessEntry | null>(() => readEntry(today));
  const [draft, setDraft] = useState<WellnessEntry>(() => entry ?? { date: today, mood: 3, stress: 3 });
  const [savedTick, setSavedTick] = useState(0);
  const stressId = useId();
  // savedTick forces a re-read of storage after each save.
  const history = useMemo(() => (void savedTick, readHistory(now, 14)), [now, savedTick]);

  const update = (patch: Partial<WellnessEntry>) => {
    const next = { ...draft, ...patch, date: today };
    setDraft(next);
    if (writeEntry(next)) {
      setEntry(next);
      setSavedTick(t => t + 1);
    }
  };

  const takeBreak = () => {
    if (pomo.running || pomo.phase === "paused") {
      navigate("/focus");
      return;
    }
    pomo.setMode("short");
    window.setTimeout(() => pomo.start(), 0);
    navigate("/focus");
  };

  return (
    <div className="wellness-page">
      <PageHeader
        title="Wellness"
        description="A quick daily check-in. It shapes the suggestions here and nothing else."
        actions={
          <span className="chip chip--outline">
            <Lock size={12} aria-hidden /> Private · stays on this device
          </span>
        }
      />

      <div className="wellness-grid">
        <section className="card" aria-labelledby="checkin">
          <div className="card__header">
            <h2 id="checkin" className="card__title">
              How are you today?
            </h2>
            <span className="subtle" aria-live="polite">
              {entry ? "Saved for today" : "Not checked in yet"}
            </span>
          </div>
          <div className="card__body stack">
            <div className="field">
              <span className="label" id="mood-label">
                Mood
              </span>
              <div className="mood-picker" role="radiogroup" aria-labelledby="mood-label">
                {MOODS.map(({ v, label, icon: Icon }) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={!!entry && draft.mood === v}
                    className={cx("mood-option", entry && draft.mood === v && "is-selected")}
                    onClick={() => update({ mood: v })}
                  >
                    <Icon size={22} aria-hidden />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="row">
                <label className="label" htmlFor={stressId}>
                  Stress
                </label>
                <span className="spacer" />
                <span className="tabular stress-value">{draft.stress}/10</span>
              </div>
              <input
                id={stressId}
                type="range"
                min={0}
                max={10}
                className="range"
                value={draft.stress}
                onChange={e => update({ stress: Number(e.target.value) })}
                aria-valuetext={`${draft.stress} out of 10`}
              />
              <div className="range-scale" aria-hidden>
                <span>Calm</span>
                <span>Balanced</span>
                <span>High</span>
              </div>
            </div>

            <div className="field">
              <span className="label" id="energy-label">
                Energy <span className="subtle">(optional)</span>
              </span>
              <div className="segmented segmented--fill" role="radiogroup" aria-labelledby="energy-label">
                {ENERGY.map((label, i) => (
                  <button key={label} type="button" role="radio" aria-checked={draft.energy === i + 1} onClick={() => update({ energy: i + 1 })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card coach" aria-labelledby="coach">
          <div className="card__header">
            <h2 id="coach" className="card__title">
              <Leaf size={16} aria-hidden /> A suggestion
            </h2>
          </div>
          <div className="card__body stack">
            <p className="coach__text">
              {entry ? suggestionFor(draft) : "Check in on the left and you’ll get a suggestion that fits how today feels."}
            </p>
            <div className="row row--wrap">
              <button type="button" className="btn btn--primary" onClick={takeBreak}>
                <Coffee size={15} aria-hidden /> Take a {pomo.settings.shortMin}-minute break
              </button>
              <Link to="/matrix" className="btn">
                <Grid2x2 size={15} aria-hidden /> Re-prioritise
              </Link>
            </div>
            <p className="hint">
              AstraFocus is a productivity tool, not a medical one. If you’re struggling, please reach out to someone you trust or a health professional.
            </p>
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="history">
        <div className="card__header">
          <h2 id="history" className="card__title">
            Last 14 days
          </h2>
        </div>
        <div className="card__body">
          <table className="history-table">
            <caption className="visually-hidden">Mood and stress for the last 14 days</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Mood</th>
                <th scope="col">Stress</th>
              </tr>
            </thead>
            <tbody>
              {history
                .slice()
                .reverse()
                .map(({ date, entry: e }) => (
                  <tr key={date} className={cx(!e && "is-empty")}>
                    <th scope="row">{fromDateKey(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</th>
                    <td>{e ? MOODS.find(m => m.v === e.mood)?.label ?? e.mood : <span className="subtle">No check-in</span>}</td>
                    <td>
                      {e ? (
                        <span className="stress-cell">
                          <span className="stress-cell__bar" style={{ width: `${e.stress * 10}%` }} aria-hidden />
                          <span className="tabular">{e.stress}</span>
                        </span>
                      ) : (
                        <span className="subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
