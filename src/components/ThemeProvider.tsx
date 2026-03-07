"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { App, ConfigProvider, theme } from "antd";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  setMode: () => {},
  isDark: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "theme";

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  const resolveDark = useCallback(
    (m: ThemeMode) => (m === "system" ? getSystemDark() : m === "dark"),
    [],
  );

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial = saved && ["light", "dark", "system"].includes(saved) ? saved : "system";
    setModeState(initial);
    setIsDark(resolveDark(initial));
    setMounted(true);
  }, [resolveDark]);

  useEffect(() => {
    if (!mounted) return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      if (mode === "system") {
        setIsDark(mql.matches);
      }
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark, mounted]);

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      localStorage.setItem(STORAGE_KEY, m);
      setIsDark(resolveDark(m));
    },
    [resolveDark],
  );

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#1677ff",
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
