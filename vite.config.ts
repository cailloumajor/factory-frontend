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
    Deno.spawn(Deno.execPath(), [
      "serve",
      "--host",
      "127.0.0.1",
      "--port",
      `${centrifugoMockPort}`,
      "--check",
      "--watch",
      "centrifugo-mock.ts",
    ])
  },
}

// Workaround for @fresh/plugin-vite 1.1.2: when the server snapshot is regenerated in dev
// (e.g. after adding/removing a route file), island browser URLs are taken from Vite's
// `mod.url` without the `/@id/` prefix. The browser then sees `fresh-island::X.tsx` as an
// absolute URL with a `fresh-island:` scheme and refuses to load it.
const freshIslandUrlFix: Plugin = {
  name: "fresh-island-url-fix",
  apply: "serve",
  transform: {
    filter: { id: /^\0fresh:server-snapshot$/ },
    handler(code) {
      return code.replace(
        /(islandPreparer\.prepare\(islands, [^,]+, )"fresh-island::/g,
        '$1"/@id/fresh-island::',
      )
    },
  },
}

export default defineConfig({
  plugins: [
    fresh(),
    freshIslandUrlFix,
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
