import Button from "../ui/Button.tsx";
import Card from "../ui/Card.tsx";

type ConsentStepProps = { onConsent: (consentGiven: boolean) => void; loading: boolean };

export default function ConsentStep({ onConsent, loading }: ConsentStepProps) {
  return (
    <Card
      title="Before we begin"
      subtitle="We'll ask you some questions about your health to help your doctor prepare for your visit."
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Your answers will be shared with your care team. You can skip any question you're not sure about, and you'll
        be able to review and change your answers before you finish.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          className="min-h-14 flex-1 text-base"
          disabled={loading}
          onClick={() => onConsent(true)}
        >
          I agree, let's continue
        </Button>
        <Button
          className="min-h-14 flex-1 text-base"
          variant="secondary"
          disabled={loading}
          onClick={() => onConsent(false)}
        >
          I'd like to speak with staff first
        </Button>
      </div>
    </Card>
  );
}
