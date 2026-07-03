import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className="relative flex items-center h-8 w-14 rounded-full border border-border dark:border-border-dark bg-white dark:bg-surface-dark px-1 transition-colors"
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="flex items-center justify-center h-6 w-6 rounded-full bg-clinical-500 text-white shadow-sm"
        style={{ marginLeft: isDark ? '1.5rem' : '0rem' }}
      >
        {isDark ? <Moon size={13} /> : <Sun size={13} />}
      </motion.span>
    </button>
  );
}
