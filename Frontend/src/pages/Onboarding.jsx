import { useLocation, useNavigate } from "react-router-dom"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import ThemeToggle from "@/components/ThemeToggle"
import "./styles/Onboarding.css"

const items = [
  {
    name:"language",
    required:false,
    prompt:"What is your preferred language?",
    description:"Choose the language for the chatbot.",
    choices:[
      { value:"English", label:"English" },
      { value:"Hindi", label:"Hindi" },
      { value:"Marathi", label:"Marathi" },
      { value:"Gujarati", label:"Gujarati" },
    ],
  },
  {
    name:"journey",
    required:false,
    prompt:"Where are you in your education journey?",
    description:"Tell us where you are right now.",
    choices:[
      { value:"high-school", label:"High school" },
      { value:"high-school-graduate", label:"High school graduate" },
      { value:"diploma", label:"Diploma" },
      { value:"undergraduate", label:"Undergraduate" },
    ],
  },
  {
    name:"program",
    required:false,
    prompt:"Which program are you exploring?",
    description:"Choose the type of program you're interested in.",
    choices:[
      { value:"exploring", label:"Still exploring" },
      { value:"diploma", label:"Diploma" },
      { value:"undergraduate", label:"Undergraduate" },
      { value:"postgraduate", label:"Postgraduate" },
    ],
  },
  {
    name:"field",
    required:false,
    prompt:"What field interests you most?",
    description:"Pick the area you'd like to explore.",
    choices:[
      { value:"technology", label:"Technology" },
      { value:"business", label:"Business" },
      { value:"design-arts", label:"Design & Arts" },
      { value:"science", label:"Science" },
    ],
  },
  {
    name:"start",
    required:false,
    prompt:"When are you hoping to start?",
    description:"Let us know your preferred timeline.",
    choices:[
      { value:"asap", label:"ASAP" },
      { value:"6-months", label:"Within 6 months" },
      { value:"year", label:"Within a year" },
      { value:"exploring", label:"Just exploring" },
    ],
  },
  {
    name:"source",
    required:false,
    prompt:"How did you hear about us?",
    description:"Help us understand how you found us.",
    choices:[
      { value:"friend-family", label:"Friend or family" },
      { value:"social-media", label:"Social media" },
      { value:"google", label:"Google" },
      { value:"other", label:"Other" },
    ],
  },
];

export default function Onboarding(){
  const location = useLocation();
  const isCounselorFlow = location.pathname.includes("counselor");
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);
    const formDataObj = Object.fromEntries(answers.entries());
    
    if (formDataObj.language) {
      localStorage.setItem("preferredLanguage", formDataObj.language);
    }
    
    navigate("/preview", {state: {preview: formDataObj}});
  }

  return (
  <main className="onboarding-wrapper">
    <div className="onboarding-theme-toggle">
      <ThemeToggle />
    </div>
    <div className="onboarding-container">
      <header className="onboarding-header">
        <p className="question-label">
          {isCounselorFlow ? "Counselor onboarding" : "Student onboarding"}
        </p>
        <h1>Tell us a bit more about your goals</h1>
      </header>

      <Questionnaire items={items} onSubmit={handleSubmit}>
        <QuestionnaireProgress />

        {items.map((question) => (
          <QuestionnaireItem
            key={question.name}
            name={question.name}
            required={question.required}>
            <QuestionnaireTitle>
              {question.prompt}
            </QuestionnaireTitle>

            <QuestionnaireDescription>
              {question.description}
            </QuestionnaireDescription>

            <QuestionnaireChoices>
              {question.choices.map((choice) => (
                <QuestionnaireChoice key={choice.value} value={choice.value}>
                  <span className="option-label">{choice.label}</span>

                  {"description" in choice && (
                    <span className="option-description">
                      {choice.description}
                    </span>
                  )}
                </QuestionnaireChoice>
              ))}

              {"input" in question && (
                <QuestionnaireInput
                  aria-label={question.input.label}
                  placeholder={question.input.placeholder}
                />
              )}
            </QuestionnaireChoices>
            <QuestionnaireError className="error-msg"/>
          </QuestionnaireItem>
        ))}

        <QuestionnaireActions>
          <QuestionnairePrevious className="back-btn"/>
          <QuestionnaireSkip className="skip-btn"/>
          <QuestionnaireNext className="next-btn"/>
          <QuestionnaireSubmit className="submit-btn next-btn"/>
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  </main>
);
}