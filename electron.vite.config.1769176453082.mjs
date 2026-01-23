// electron.vite.config.ts
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          "@electron-toolkit/utils",
          "zod",
          "date-fns",
          "zustand",
          "clsx",
          "tailwind-merge",
          "class-variance-authority"
        ]
      })
    ],
    resolve: {
      alias: {
        "prisma-client-generated/client": resolve("node_modules/prisma-client-generated/client.ts")
      }
    },
    build: {
      rollupOptions: {
        external: [
          "better-sqlite3",
          "@libsql/client",
          "@libsql/core",
          "@libsql/hrana-client",
          "@libsql/isomorphic-fetch",
          "@libsql/isomorphic-ws",
          "@libsql/win32-x64-msvc",
          "libsql",
          "@prisma/adapter-libsql",
          "@prisma/client"
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@electron-toolkit/preload"] })]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@": resolve("src/renderer/src")
      }
    },
    plugins: [react(), tailwindcss()]
  }
});
export {
  electron_vite_config_default as default
};
