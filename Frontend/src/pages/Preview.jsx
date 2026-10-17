import { useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import "./styles/Onboarding.css";

export default function OnboardingPreview() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const preview = state?.preview;
  const displayVal =
    (typeof preview === "object" && preview !== null)
    ? Object.entries(preview).map(([key, value]) => `${key}: ${value}`)
    .join("\n"):"";

  return (
    <main className="onboarding-wrapper">
      <div className="onboarding-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="onboarding-container">
        <h1 className="onboarding-header">Your Answers</h1>
        <textarea
          className="preview-textarea"
          value={displayVal}
          readOnly
          rows={7}
          placeholder="Your preview will appear here..."/>

        <button
          className="preview-button"
          onClick={() => navigate("/chat")}>
          Navigate to ChatBot
        </button>
      </div>
    </main>
  );
}