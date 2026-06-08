export function getLS(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function setLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}