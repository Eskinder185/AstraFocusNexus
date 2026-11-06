import React, { useMemo, useState } from "react";
import { Coffee, Droplets, Eye, Footprints, Music, Wind } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";

const SUGGESTIONS = [
  { icon: Wind, text: "Stretch your shoulders and neck" },
  { icon: Eye, text: "Look at something 20 feet away for 20 seconds" },
  { icon: Footprints, text: "Walk around for two minutes" },
  { icon: Droplets, text: "Drink a glass of water" },
  { icon: Music, text: "Play one song you like" },
  { icon: Coffee, text: "Step away from the screen entirely" },
];

interface Props {
  minutes: number;
  long: boolean;
  onStartBreak: () => void;
  onSkipBreak: () => void;
}

export const BreakDialog: React.FC<Props> = ({ minutes, long, onStartBreak, onSkipBreak }) => {
  const [busy, setBusy] = useState(false);
  const picks = useMemo(() => [...SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 3), []);

  const act = (fn: () => void) => () => {
    if (busy) return;
    setBusy(true);
    fn();
  };

  return (
    <Dialog
      open
      // Escape means "not now": take the break rather than jumping straight back into focus.
      onClose={act(onStartBreak)}
      title="Focus session complete"
      className="break-dialog"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={act(onSkipBreak)} disabled={busy}>
            Skip break
          </button>
          <button type="button" className="btn btn--primary" data-autofocus onClick={act(onStartBreak)} disabled={busy}>
            Start {minutes}-minute {long ? "long " : ""}break
          </button>
        </>
      }
    >
      <div className="dialog__body">
        <p className="muted">Nice work. A real break makes the next session better. A few ideas:</p>
        <ul role="list" className="break-dialog__list">
          {picks.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span className="break-dialog__icon" aria-hidden>
                <Icon size={16} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
};
