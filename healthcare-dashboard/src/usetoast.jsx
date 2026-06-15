// src/hooks/useToast.js
import { useState, useRef, useEffect } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef([]);

  // Cleanup all timers when the component unmounts
  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const addToast = (title, message = "", type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);

    toastTimers.current.push(timer);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
}