import type { Config } from "tailwindcss";

/**
 * Colour tokens live in two layers:
 *  1. Raw palette scales (ink / signal / brass) — fixed brand values.
 *  2. Semantic tokens (bg, surface, border, text…) — CSS variables that swap
 *     between light and dark in app/globals.css.
 * Rebranding usually means editing the palette below plus the variables in
 * globals.css. Everything else references the semantic tokens.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F5F7FB",
          100: "#E7ECF6",
          200: "#C8D3E8",
          300: "#9AACCE",
          400: "#6479A6",
          500: "#3F5280",
          600: "#22315A",
          700: "#182545",
          800: "#101A33",
          900: "#0A1124",
          950: "#070C18",
        },
        signal: {
          50: "#EAFBF7",
          100: "#CCF5EC",
          200: "#99EADA",
          300: "#5FDAC5",
          400: "#2DD4BF",
          500: "#12A594",
          600: "#0B7366",
          700: "#095C52",
          800: "#07463F",
          900: "#05332E",
        },
        brass: {
          100: "#F6EEDC",
          200: "#E9D6AE",
          300: "#D9B678",
          400: "#B08A4A",
          500: "#8A6A2F",
          600: "#6B5124",
        },
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        body: "var(--text)",
        muted: "var(--text-muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-contrast": "var(--accent-contrast)",
        "accent-soft": "var(--accent-soft)",
        seal: "var(--brass)",
        "seal-soft": "var(--brass-soft)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 1.6rem + 4.2vw, 5rem)", { lineHeight: "1.04", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.25rem, 1.5rem + 3vw, 3.75rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(1.875rem, 1.4rem + 2vw, 2.75rem)", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        "display-sm": ["clamp(1.5rem, 1.25rem + 1.2vw, 2rem)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        eyebrow: ["0.75rem", { lineHeight: "1", letterSpacing: "0.14em" }],
      },
      maxWidth: {
        prose: "68ch",
        shell: "80rem",
      },
      spacing: {
        section: "clamp(4rem, 2rem + 7vw, 8rem)",
      },
      borderRadius: {
        card: "14px",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "none" },
        },
        "draw-line": {
          from: { strokeDashoffset: "var(--dash, 400)" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.2, 0.6, 0.2, 1) both",
        "draw-line": "draw-line 1.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
