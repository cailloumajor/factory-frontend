import morgan from "morgan"
import { defineConfig, type Plugin } from "vite"
import { fresh } from "@fresh/plugin-vite"
import tailwindcss from "@tailwindcss/vite"

const centrifugoMockPort = 4242

const httpLogger: Plugin = {
  name: "http-logger",
  configureServer(server) {
    server.middlewares.use(morgan("dev"))
  },
}

const centrifugoMock: Plugin = {
  name: "centrifugo-mock-server",
  configureServer() {
    const process = new Deno.Command(Deno.execPath(), {
      args: [
        "serve",
        "--host",
        "127.0.0.1",
        "--port",
        `${centrifugoMockPort}`,
        "--check",
        "--watch",
        "centrifugo-mock.ts",
      ],
    })
    process.spawn()
  },
}

export default defineConfig({
  plugins: [
    fresh(),
    tailwindcss(),
    httpLogger,
    centrifugoMock,
  ],

  server: {
    proxy: {
      "/dev-centrifugo/connection/websocket": {
        target: `ws://127.0.0.1:${centrifugoMockPort}`,
        ws: true,
      },
    },
  },
})
