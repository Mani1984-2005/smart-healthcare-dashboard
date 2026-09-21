import { Component, type ReactNode } from "react";
import { createTranslator } from "../i18n/translator";

interface Props {
  language: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Last-resort guard so an unexpected rendering failure inside the voice
 * module shows a plain message and a reload button instead of a blank page.
 * Nothing about the failure, and no patient text, is logged or displayed.
 */
export default class VoiceErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const t = createTranslator(this.props.language);
    return (
      <div role="alert" className="rounded-xl border-2 border-rose-300 bg-rose-50 p-6 text-lg text-rose-950">
        <p>{t("error.boundary")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 min-h-12 rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/70"
        >
          {t("action.reload")}
        </button>
      </div>
    );
  }
}
