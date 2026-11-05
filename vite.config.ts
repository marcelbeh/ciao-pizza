import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/ciao-pizza/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon-forno-32.png", "favicon-forno-64.png", "apple-touch-icon-forno.png", "fonts/*-OFL.txt"],
      manifest: {
        id: "/ciao-pizza/",
        name: "FORNO. by Marcel",
        short_name: "FORNO.",
        description: "Dein privater Offline-Pizzarechner.",
        lang: "de",
        start_url: "/ciao-pizza/",
        scope: "/ciao-pizza/",
        display: "standalone",
        background_color: "#101820",
        theme_color: "#101820",
        icons: [
          {
            src: "icons/forno-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/forno-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/forno-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2,ttf,webp}"],
        navigateFallback: "/ciao-pizza/index.html",
        navigateFallbackAllowlist: [/^\/ciao-pizza\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
  },
});
