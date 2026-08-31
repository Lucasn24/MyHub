"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import styles from "./sidebar.module.css";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const ICONS = { system: Monitor, light: Sun, dark: Moon };
const LABELS = { system: "Match system", light: "Light", dark: "Dark" };

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
    setMounted(true);
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    applyTheme(next);
    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
  };

  if (!mounted) return <div className={styles.themeToggle} aria-hidden />;

  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      className={styles.themeToggle}
      title={`Theme: ${LABELS[theme]} (click to change)`}
    >
      <Icon size={18} strokeWidth={2} />
      {LABELS[theme]}
    </button>
  );
}
