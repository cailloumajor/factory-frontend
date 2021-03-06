import { createServer } from "miragejs"

import { staticConfigApi } from "src/global"

const maybeJSON = (s: string | undefined) =>
  s && !Object.hasOwn(window, "Cypress") ? JSON.parse(s) : {}

export function makeServer({ environment = "test" } = {}) {
  return createServer({
    environment,

    routes() {
      this.get(`${staticConfigApi}/:id/line-dashboard`, (schema, request) => ({
        title: "Test Title",
        centrifugoNamespace: request.params.id,
        opcUaNsURI: "urn:test",
        opcUaNodeIds: {},
        ...maybeJSON(import.meta.env.VITE_CONFIG_API as string | undefined),
      }))
    },
  })
}
