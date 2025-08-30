import morgan from "morgan"
import { defineConfig, type Plugin } from "vite"
import { fresh } from "@fresh/plugin-vite"
import tailwindcss from "@tailwindcss/vite"

function httpLogger(): Plugin {
  return {
    name: "http-logger",
    configureServer(server) {
      server.middlewares.use(morgan("dev"))
    },
  }
}

export default defineConfig({
  plugins: [
    fresh(),
    tailwindcss(),
    httpLogger(),
  ],
})
