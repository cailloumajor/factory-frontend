import { Builder } from "fresh/dev"
import { app } from "./main.ts"
import { devRoutes } from "./routes-dev/index.ts"
import { styleTransformPlugin } from "./utils/style.ts"

const builder = new Builder()

styleTransformPlugin(builder)

if (Deno.args.includes("build")) {
  await builder.build()
} else {
  devRoutes(app)

  await builder.listen(() => import("./main.ts"))
}
