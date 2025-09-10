import React, { useMemo } from "react";

type Props = {
  onStartBreak: () => void;
  onSkipBreak: () => void;
  closing?: boolean;
};

const SUGGESTIONS = [
  "🌿 Stretch your body",
  "👀 Do the 20-20-20 eye reset",
  "🚶 Walk around for 2 minutes",
  "💧 Drink some water",
  "🎵 Play one uplifting song",
];

const BreakSuggestions: React.FC<Props> = ({ onStartBreak, onSkipBreak, closing }) => {
  const picks = useMemo(() => {
    const arr = [...SUGGESTIONS];
    // shuffle simple
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return { main: arr[0], alts: arr.slice(1, 3) };
  }, []);

  return (
    <div className={`modal-overlay ${closing ? 'closing' : ''}`} role="dialog" aria-modal>
      <div className={`modal ${closing ? 'closing' : ''}`}>
        <h3 className="modal-title">⏰ Focus session complete! Take a 5-minute break</h3>
        <div className="modal-body">
          <div className="suggest-main">{picks.main}</div>
          <div className="suggest-alts">
            <span>Or try:</span>
            <ul>
              {picks.alts.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn glow" onClick={onStartBreak}>Start Break</button>
          <button className="pill" onClick={onSkipBreak}>Skip Break</button>
        </div>
      </div>
    </div>
  );
};

export default BreakSuggestions;
