/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#212121",
        "on-primary": "#ffffff",
        background: "#ffffff",
        surface: "#000000",
        "coda-border": "#8e8e8e",
        "coda-text": "#212121",
        "text-muted": "#666666",
        "card-stroke": "rgb(224, 224, 224)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Calibre-R", "Inter", "sans-serif"],
        heading: ["Calibre-R", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      letterSpacing: {
        display: "-1.82px",
        heading: "-0.95px",
        body: "-0.48px",
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "12px",
      },
      boxShadow: {
        card: "rgb(224, 224, 224) 0px 0px 0px 1.5px inset",
        elevated: "rgba(0, 0, 0, 0.06) 0px 12px 24px -5px, rgba(0, 0, 0, 0.06) 0px 5px 10px -6px",
      },
      transitionDuration: {
        fast: "50ms",
        base: "200ms",
        slow: "250ms",
      },
      transitionTimingFunction: {
        coda: "ease",
      },
    },
  },
  plugins: [],
};
