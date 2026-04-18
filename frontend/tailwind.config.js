/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      boxShadow: {
        aurora: "0 24px 80px rgba(3, 6, 18, 0.45)",
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        soulportdark: {
          primary: "#1cb5e0",
          secondary: "#2c7be5",
          accent: "#14f195",
          neutral: "#111827",
          "base-100": "#060b1b",
          "base-200": "#0d1328",
          "base-300": "#111c37",
          info: "#38bdf8",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
      "light",
      "dark",
    ],
    darkTheme: "soulportdark",
  },
};
