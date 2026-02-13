import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
          light: "hsl(var(--secondary-light))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          spring: "hsl(var(--accent-spring))",
          summer: "hsl(var(--accent-summer))",
          autumn: "hsl(var(--accent-autumn))",
          winter: "hsl(var(--accent-winter))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        gradient: {
          start: "hsl(var(--gradient-start))",
          end: "hsl(var(--gradient-end))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Lora", "Georgia", "serif"],
      },
      fontSize: {
        // Mobile-first responsive typography
        base: ["1rem", { lineHeight: "1.6" }], // 16px, comfortable reading
        sm: ["0.875rem", { lineHeight: "1.5" }], // 14px, never below this
        xs: ["0.75rem", { lineHeight: "1.4" }],
        lg: ["1.125rem", { lineHeight: "1.6" }], // 18px for desktop body
        xl: ["1.25rem", { lineHeight: "1.5" }],
        "2xl": ["1.5rem", { lineHeight: "1.4" }],
        "3xl": ["1.875rem", { lineHeight: "1.3" }],
        "4xl": ["2.25rem", { lineHeight: "1.2" }],
      },
      spacing: {
        // Consistent spacing system
        xs: "0.25rem", // 4px
        sm: "0.5rem", // 8px
        md: "1rem", // 16px (mobile default)
        lg: "1.5rem", // 24px (desktop default)
        xl: "2rem", // 32px
        "2xl": "3rem", // 48px
      },
      minHeight: {
        touch: "44px", // Minimum touch target
        "touch-lg": "48px", // Preferred button height
      },
      minWidth: {
        touch: "44px",
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
        "checkmark": "checkmark 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-bounce": "scaleBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        checkmark: {
          "0%": { transform: "scale(0) rotate(45deg)", opacity: "0" },
          "50%": { transform: "scale(1.2) rotate(45deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(45deg)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleBounce: {
          "0%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(0, 0, 0, 0.08)",
        "medium": "0 4px 12px rgba(0, 0, 0, 0.12)",
        "strong": "0 8px 24px rgba(0, 0, 0, 0.16)",
        "glass": "0 8px 32px 0 var(--glass-shadow)",
      },
      backgroundImage: {
        "glass": "linear-gradient(135deg, var(--glass-background) 0%, var(--glass-background-strong) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
