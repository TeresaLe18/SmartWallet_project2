import { useState, useEffect } from "react";

// Re-renders the component every `intervalMs` (default 60s) so relative
// timestamps ("X minutes ago") stay current while the page stays open.
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
