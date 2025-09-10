import React, { useMemo } from "react";
import PageHeader from "../components/PageHeader";

interface WellnessProps {
  mood: number;
  setMood: (v: number) => void;
  stress: number;
  setStress: (v: number) => void;
  suggestBreakdown: () => void;
}

const Wellness: React.FC<WellnessProps> = ({ mood, setMood, stress, setStress, suggestBreakdown }) => {
  const suggestion = useMemo(() => {
    if (stress >= 7) return "You're under a lot of stress. Break a big task into 3 tiny steps and take a 5-minute walk.";
    if (mood <= 2) return "Be kind to yourself. Pick one small, important task and celebrate finishing it.";
    if (mood >= 4 && stress <= 3) return "Great energy! Line up your top 3 important tasks and enter Focus mode.";
    return "Keep steady. Do one small step, then check in again.";
  }, [mood, stress]);

  return (
    <div>
      <PageHeader icon="🧠" title="Wellness" subtitle="Coaching, not just tracking" />

      <div className="card">
        <div className="wellness-row">
          <div className="mood-group">
            <div className="label">Mood</div>
            <div className="mood-choices">
              {[{v:1,e:"😟"},{v:3,e:"😐"},{v:5,e:"🙂"}].map(({v,e}) => (
                <button key={v} className={"emoji-big"+(mood===v?" selected":"")} onClick={()=>setMood(v)} aria-label={`Mood ${v}`}>{e}</button>
              ))}
            </div>
          </div>
          <div className="stress-group">
            <div className="label">Stress: {stress}/10</div>
            <input type="range" min={0} max={10} value={stress} onChange={(e)=>setStress(Number(e.target.value))} />
            <div className="stress-scale"><span>🧊</span><span>😅</span><span>🔥</span></div>
          </div>
        </div>

        <div className="tip" style={{marginTop:12}}>
          <strong>Suggestion:</strong> {suggestion}
          <div className="tip-actions">
            <button className="pill" onClick={suggestBreakdown}>Break down 3 steps</button>
            <a className="pill" href="#stretch" onClick={(e)=>{e.preventDefault(); alert("Set a 5-minute timer and do neck/shoulder rolls 🧘");}}>5-minute stretch</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wellness;
