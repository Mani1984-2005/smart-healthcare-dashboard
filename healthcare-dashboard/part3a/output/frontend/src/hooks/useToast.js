import { useCallback, useState } from 'react';

let idCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'info', durationMs = 4000) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (durationMs) {
        setTimeout(() => dismiss(id), durationMs);
      }
      return id;
    },
    [dismiss]
  );

  return { toasts, push, dismiss };
}
