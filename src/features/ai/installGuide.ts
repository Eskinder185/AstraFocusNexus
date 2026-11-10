/**
 * Installation guidance. Links and commands are from the official sites (checked Nov 2026):
 * - ollama.com/download, docs.ollama.com/faq
 * - lmstudio.ai/download, lmstudio.ai/docs/cli/serve/server-start
 * AstraFocus never downloads or runs anything; it only shows instructions to copy.
 */
import type { OS } from "./hardware";

export interface GuideStep {
  title: string;
  body: string;
  /** Commands the user may copy and run themselves. */
  commands?: { label?: string; text: string }[];
  link?: { label: string; href: string };
  note?: string;
}

export const OS_LABELS: Record<Exclude<OS, "other">, string> = { windows: "Windows", mac: "macOS", linux: "Linux" };

export function ollamaInstallSteps(os: Exclude<OS, "other">): GuideStep[] {
  switch (os) {
    case "windows":
      return [
        {
          title: "Download Ollama for Windows",
          body: "Download the official installer and run it. Ollama starts automatically and appears in the system tray (near the clock).",
          link: { label: "Download OllamaSetup.exe", href: "https://ollama.com/download/OllamaSetup.exe" },
          note: "Prefer the command line? Ollama’s site also offers a PowerShell script: irm https://ollama.com/install.ps1 | iex. Only run scripts from sources you trust.",
        },
        { title: "Check it’s installed", body: "Open PowerShell or Terminal and run:", commands: [{ text: "ollama --version" }] },
      ];
    case "mac":
      return [
        {
          title: "Download Ollama for macOS",
          body: "Download the app, open the .dmg, drag Ollama to Applications and open it. It runs in the menu bar.",
          link: { label: "Download Ollama.dmg", href: "https://ollama.com/download/Ollama.dmg" },
          note: "Ollama’s site also offers an install script: curl -fsSL https://ollama.com/install.sh | sh. Only run scripts from sources you trust.",
        },
        { title: "Check it’s installed", body: "Open Terminal and run:", commands: [{ text: "ollama --version" }] },
      ];
    case "linux":
      return [
        {
          title: "Install Ollama",
          body: "Run Ollama’s official install script in a terminal. It installs Ollama and sets it up as a system service. You can read the script at the same address before running it.",
          commands: [{ text: "curl -fsSL https://ollama.com/install.sh | sh" }],
          link: { label: "Ollama download page", href: "https://ollama.com/download/linux" },
        },
        { title: "Check it’s installed", body: "Run:", commands: [{ text: "ollama --version" }] },
      ];
  }
}

export function ollamaServerSteps(os: Exclude<OS, "other">): GuideStep[] {
  if (os === "linux") {
    return [
      { title: "Start", body: "The installer runs Ollama as a service. To start it:", commands: [{ text: "sudo systemctl start ollama" }] },
      { title: "Stop", body: "To stop it:", commands: [{ text: "sudo systemctl stop ollama" }] },
      { title: "Check status", body: "To see whether it’s running:", commands: [{ text: "systemctl status ollama" }] },
    ];
  }
  const where = os === "windows" ? "system tray" : "menu bar";
  const start = os === "windows" ? "Open Ollama from the Start menu." : "Open Ollama from Applications.";
  return [
    { title: "Start", body: `${start} It keeps running in the ${where}. Or run it in a terminal instead:`, commands: [{ text: "ollama serve" }] },
    { title: "Stop", body: `Click the Ollama icon in the ${where} and choose Quit. If you used ollama serve, press Ctrl+C in that terminal.` },
  ];
}

export function modelSteps(tag: string): GuideStep[] {
  return [
    { title: "Download the model", body: `This downloads ${tag} once. It can take a while on a slow connection.`, commands: [{ text: `ollama pull ${tag}` }] },
    { title: "Try it (optional)", body: "Ask it something in the terminal to make sure it works:", commands: [{ text: `ollama run ${tag} "Say hello in five words"` }] },
    { title: "See installed models", body: "Lists every model on this computer:", commands: [{ text: "ollama list" }] },
  ];
}

/** Allowing a website to call Ollama from the browser (CORS). */
export function ollamaOriginSteps(os: Exclude<OS, "other">, origin: string): GuideStep[] {
  switch (os) {
    case "windows":
      return [
        { title: "Quit Ollama", body: "Right-click the Ollama icon in the system tray and choose Quit." },
        {
          title: "Allow AstraFocus",
          body: "Run this in PowerShell. It saves the setting for your Windows account. (Or add it in “Edit environment variables for your account”.)",
          commands: [{ text: `setx OLLAMA_ORIGINS "${origin}"` }],
        },
        { title: "Start Ollama again", body: "Open Ollama from the Start menu so it picks up the new setting." },
      ];
    case "mac":
      return [
        { title: "Allow AstraFocus", body: "Run this in Terminal:", commands: [{ text: `launchctl setenv OLLAMA_ORIGINS "${origin}"` }], note: "This lasts until you restart your Mac; run it again after a restart." },
        { title: "Restart Ollama", body: "Quit Ollama from the menu bar, then open it again." },
      ];
    case "linux":
      return [
        {
          title: "Edit the service",
          body: "Open an override file for the Ollama service:",
          commands: [{ text: "sudo systemctl edit ollama.service" }],
        },
        { title: "Add the setting", body: "Add these lines, then save and close the editor:", commands: [{ text: `[Service]\nEnvironment="OLLAMA_ORIGINS=${origin}"` }] },
        { title: "Restart Ollama", body: "Apply the change:", commands: [{ text: "sudo systemctl daemon-reload && sudo systemctl restart ollama" }] },
      ];
  }
}

export const LM_STUDIO_STEPS: GuideStep[] = [
  { title: "Download LM Studio", body: "Install LM Studio for Windows, macOS or Linux and download a model from its Discover tab.", link: { label: "lmstudio.ai/download", href: "https://lmstudio.ai/download" } },
  {
    title: "Start the local server",
    body: "In the Developer tab, start the server and turn on Enable CORS. Or, with LM Studio’s command-line tool:",
    commands: [{ text: "lms server start --cors" }],
  },
  { title: "Connect", body: "Choose LM Studio in AstraFocus. The server listens on http://127.0.0.1:1234/v1 by default." },
];

/** True when the page itself is served from this device, so Ollama's default CORS rules already allow it. */
export function isLocalOrigin(origin: string): boolean {
  try {
    const h = new URL(origin).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost");
  } catch {
    return false;
  }
}
