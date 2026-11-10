import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAIConnection } from "./AIConnectionProvider";
import { PROVIDERS } from "./providers";

/** Settings summary that points to the AI assistant page (the single place to configure AI). */
export const AISettingsCard: React.FC = () => {
  const { state, connected } = useAIConnection();
  return (
    <section className="card settings-section" aria-label="Bring Your Own AI">
      <h2 className="settings-section__title">Bring Your Own AI</h2>
      <div className="setting-row">
        <div className="setting-row__text">
          <p className="setting-row__label">
            {connected ? (
              <span className="ai-inline-status"><CheckCircle2 size={15} aria-hidden /> Connected to {state.model}</span>
            ) : state.restored ? (
              "AI settings saved, not connected yet"
            ) : (
              "Not set up"
            )}
          </p>
          <p className="setting-row__desc">
            {connected || state.restored
              ? `${PROVIDERS[state.provider].label} · ${state.baseUrl}`
              : "Optional. Use a model on your own computer or your own cloud account for planning help. Guided setup included."}
          </p>
        </div>
        <div className="setting-row__control">
          <Link to="/ai" className="btn">
            <Sparkles size={15} aria-hidden /> {connected || state.restored ? "Manage AI" : "Set up AI"}
          </Link>
        </div>
      </div>
    </section>
  );
};
