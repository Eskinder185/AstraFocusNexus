import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAIConnection } from "./AIConnectionProvider";
import { PROVIDERS } from "./providers";

/** Settings summary that points to the AI assistant page (the single place to configure AI). */
export const AISettingsCard: React.FC = () => {
  const { state, connected } = useAIConnection();
  return (
    <section className="card settings-section" aria-label="AI assistant">
      <h2 className="settings-section__title">AI assistant</h2>
      <div className="setting-row">
        <div className="setting-row__text">
          <p className="setting-row__label">
            {connected ? (
              <span className="ai-inline-status"><CheckCircle2 size={15} aria-hidden /> Connected to {state.model}</span>
            ) : state.restored ? (
              "Local AI saved, not checked yet"
            ) : (
              "Not set up"
            )}
          </p>
          <p className="setting-row__desc">
            {connected || state.restored
              ? `${PROVIDERS[state.provider].label} · ${state.baseUrl}`
              : "Optional. Connect an AI model on your own computer for planning help. Guided setup for beginners."}
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
