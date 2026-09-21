import { CheckCircle2 } from "lucide-react";
import Card from "../ui/Card.tsx";

export default function CompletionScreen() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-600" aria-hidden="true" />
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Thank you</h2>
        <p className="max-w-md text-base text-slate-600 dark:text-slate-400">
          Your information has been submitted. Please have a seat — your care team will call you shortly.
        </p>
      </div>
    </Card>
  );
}
