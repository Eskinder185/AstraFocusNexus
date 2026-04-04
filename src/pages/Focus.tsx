import React from "react";
import PageHeader from "../components/PageHeader";
import PomodoroFocusPanel from "../components/PomodoroFocusPanel";
import ToolSection from "../components/ToolSection";

const Focus: React.FC = () => {
  return (
    <>
      <PageHeader
        icon="⏱️"
        title="Focus"
        subtitle="Run Pomodoro sessions here—the timer keeps going if you switch pages. Use Home to link a task with 🎯 Focus."
      />
      <ToolSection
        title="Pomodoro control center"
        lede="Choose focus or break length, adjust settings, and control the session. A compact bar appears on other routes while you’re in a session."
        cardClassName="tool-section__card--pomodoro"
      >
        <PomodoroFocusPanel />
      </ToolSection>
    </>
  );
};

export default Focus;
