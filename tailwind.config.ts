import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { ink: "#17212b", muted: "#718096", line: "#e8edf1", canvas: "#f5f7f8", teal: "#087e80" }, boxShadow: { soft: "0 8px 28px rgba(23,33,43,.05)" } } },
  plugins: []
};
export default config;
