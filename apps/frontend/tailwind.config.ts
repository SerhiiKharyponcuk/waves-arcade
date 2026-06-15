import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b070f",
        panel: "#17070d",
        panelSoft: "#1d0b15",
        geoRed: "#de1d2d",
        geoPink: "#f43f8c",
        geoOrange: "#ff7b5c",
        cyanGlow: "#21d4fd",
        magentaGlow: "#f43f8c",
        limeGlow: "#8ee64f",
        goldGlow: "#f7c948"
      },
      boxShadow: {
        neon: "0 0 24px rgba(255, 88, 104, 0.24)",
        danger: "0 0 24px rgba(244, 63, 140, 0.24)"
      },
      backgroundImage: {
        grid: "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        dashGradient: "linear-gradient(135deg, rgba(222, 29, 45, 0.24), rgba(66, 12, 19, 0.65))"
      }
    }
  },
  plugins: []
} satisfies Config;
