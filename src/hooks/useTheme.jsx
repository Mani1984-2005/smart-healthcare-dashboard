// USE THEME — Premium theme management with dark mode support
// ============================================================
// Manages color mode, theme transitions, and provides theme-aware
// CSS variables and styling utilities across the application.

import { useState, useEffect } from "react";

// Check for prefers-color-scheme media query
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return prefersDark ? "dark" : "light";
  });

  const colorMode = theme === "dark" ? "dark" : "light";

  // Apply HTML class for Tailwind directives
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const darkMode = theme === "dark";
  const setDarkMode = (value) => setTheme(value ? "dark" : "light");
  return { theme, setTheme, colorMode, toggleTheme, darkMode, setDarkMode };
}