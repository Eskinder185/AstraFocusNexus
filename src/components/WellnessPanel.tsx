import React, { useEffect, useMemo, useState } from "react";
import type { WellnessEntry } from "../types";

const KEY_PREFIX = "wellness.entry.";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${KEY_PREFIX}${yyyy}-${mm}-${dd}`;
}

const moods = [
  { v: 1, label: "😟" },
  { v: 2, label: "🙁" },
  { v: 3, label: "😐" },
  { v: 4, label: "🙂" },
  { v: 5, label: "😄" },
];

const WellnessPanel: React.FC<{ onSuggestBreakdown?: () => void }> = ({ onSuggestBreakdown }) => {
  const [mood, setMood] = useState<number>(3);
  const [stress, setStress] = useState<number>(3);

  // load today's entry
  useEffect(() => {
    const raw = localStorage.getItem(todayKey());
    if (raw) {
      try {
        const e: WellnessEntry = JSON.parse(raw);
        setMood(e.mood);
        setStress(e.stress);
      } catch {}
    }
  }, []);

  // persist
  useEffect(() => {
    const key = todayKey();
    const entry: WellnessEntry = {
      date: key.replace(KEY_PREFIX, ""),
      mood,
      stress,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  }, [mood, stress]);

  const suggestion = useMemo(() => {
    if (stress >= 7) return "You're under a lot of stress. Try breaking a big task into 3 tiny steps and take a 5‑minute walk.";
    if (mood <= 2) return "Be kind to yourself today. Pick one small, important task and celebrate finishing it.";
    if (mood >= 4 && stress <= 3) return "Great energy! Line up your top 3 important tasks and enter Focus mode.";
    return "Keep steady. Do one small step, then check in again.";
  }, [mood, stress]);

  return (
    <div className="card">
      <h2 style={{marginTop:0}}>Wellness check‑in</h2>
      <div style={{display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:12, opacity:0.8, marginBottom:6}}>Mood</div>
          <div style={{display:"flex", gap:8}}>
            {moods.map(m => (
              <button
                key={m.v}
                className="emoji-btn"
                aria-label={`Mood ${m.v}`}
                onClick={()=>setMood(m.v)}
                style={{border: mood===m.v ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,.12)"}}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{minWidth:220}}>
          <div style={{fontSize:12, opacity:0.8, marginBottom:6}}>Stress: {stress}/10</div>
          <input
            type="range"
            min={0}
            max={10}
            value={stress}
            onChange={(e)=>setStress(Number(e.target.value))}
            style={{width:"100%"}}
          />
        </div>
      </div>

      <div className="tip" style={{marginTop:12}}>
        <strong>Suggestion:</strong> {suggestion}
      </div>

      {(stress >= 7) && (
        <button className="btn" style={{marginTop:12}} onClick={onSuggestBreakdown}>
          Break down my current task
        </button>
      )}
    </div>
  );
};

export default WellnessPanel;
