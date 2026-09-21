import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import Card from "../../components/ui/Card.tsx";
import LoadingState from "../../components/ui/LoadingState.tsx";
import EmptyState from "../../components/ui/EmptyState.tsx";
import ProgressBar from "../../components/kiosk/ProgressBar.tsx";
import ConsentStep from "../../components/kiosk/ConsentStep.tsx";
import LanguageModeStep from "../../components/kiosk/LanguageModeStep.tsx";
import QuestionStep from "../../components/kiosk/QuestionStep.tsx";
import ReviewScreen from "../../components/kiosk/ReviewScreen.tsx";
import CompletionScreen from "../../components/kiosk/CompletionScreen.tsx";
import { useIntakeStore } from "../../stores/intakeStore.ts";

const UNKNOWN_VALUE = "__UNKNOWN__";

/**
 * Patient-facing kiosk screen. Uses ONLY the opaque per-session token —
 * never MediCare Pro staff login/roles — matching the approved session
 * security model (Phase 2 Final Design, section 7).
 */
export default function IntakeFlow() {
  const { sessionId } = useParams();
  const location = useLocation();
  const stateToken = (location.state as { sessionToken?: string } | null)?.sessionToken;

  const {
    session,
    sessionToken,
    currentQuestion,
    history,
    mode,
    loading,
    error,
    hydrateFromToken,
    setConsent,
    setLanguageMode,
    submitAnswer,
    confirmCompletion,
  } = useIntakeStore();

  useEffect(() => {
    if (!sessionId) return;
    const token = stateToken ?? sessionToken;
    if (token && (!session || session.id !== sessionId)) {
      hydrateFromToken(sessionId, token).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, stateToken]);

  if (!stateToken && !sessionToken) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <EmptyState
          title="No active kiosk session"
          description="This kiosk link isn't valid or has expired. Please ask staff to start a new intake session."
        />
      </div>
    );
  }

  if (loading && !session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <LoadingState label="Loading your session…" />
      </div>
    );
  }

  function handleAnswer(rawValue: unknown, inputMode?: "TEXT" | "VOICE") {
    if (!currentQuestion) return;
    if (rawValue === UNKNOWN_VALUE) {
      submitAnswer(currentQuestion.questionId, "Not sure", "UNKNOWN").catch(() => {});
    } else {
      submitAnswer(currentQuestion.questionId, rawValue, undefined, inputMode).catch(() => {});
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">MediCare Pro — Clinical Intake</h1>
      </div>

      {error && (
        <Card className="mb-4 border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950">
          <p className="text-sm text-rose-800 dark:text-rose-200">
            Something went wrong: {error}. Please try again, or ask staff for help.
          </p>
        </Card>
      )}

      {mode === "completed" && <CompletionScreen />}

      {mode !== "completed" && session && !session.consentGiven && (
        <ConsentStep loading={loading} onConsent={(given) => setConsent(given).catch(() => {})} />
      )}

      {mode !== "completed" && session?.consentGiven && !session.language && (
        <LanguageModeStep loading={loading} onSubmit={(language, interactionMode) => setLanguageMode(language, interactionMode).catch(() => {})} />
      )}

      {mode === "question" && session?.consentGiven && session.language && currentQuestion && (
        <div>
          <div className="mb-4">
            <ProgressBar percentComplete={0.5} />
          </div>
          <QuestionStep question={currentQuestion} loading={loading} onAnswer={handleAnswer} />
        </div>
      )}

      {mode === "review" && history && (
        <ReviewScreen
          history={history}
          loading={loading}
          onEdit={(questionId) => {
            // Jump back into answering that one question; engine state is
            // keyed by questionId so re-submitting updates it in place.
            useIntakeStore.setState({
              currentQuestion: { questionId, section: "", questionText: "Update your answer", answerType: "LONG_TEXT", required: false },
              mode: "question",
            });
          }}
          onConfirm={() => confirmCompletion().catch(() => {})}
        />
      )}
    </div>
  );
}
