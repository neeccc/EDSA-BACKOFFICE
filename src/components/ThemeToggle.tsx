"use client";

import { Segmented } from "antd";
import { SunOutlined, MoonOutlined, LaptopOutlined } from "@ant-design/icons";
import { useTheme } from "./ThemeProvider";

type ThemeMode = "light" | "dark" | "system";

const options: { value: ThemeMode; icon: React.ReactNode }[] = [
  { value: "light", icon: <SunOutlined /> },
  { value: "dark", icon: <MoonOutlined /> },
  { value: "system", icon: <LaptopOutlined /> },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <Segmented
      size="small"
      value={mode}
      onChange={(val) => setMode(val as ThemeMode)}
      options={options.map((o) => ({
        value: o.value,
        icon: o.icon,
      }))}
    />
  );
}
