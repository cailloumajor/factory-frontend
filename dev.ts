import { Builder } from "fresh/dev"
import { app } from "./main.ts"
import { styleTransformPlugin } from "./utils/style.ts"

const buildMode = Deno.args.includes("build")

const builder = new Builder()

styleTransformPlugin(builder, buildMode)

if (buildMode) {
  await builder.build(app)
} else {
  await builder.listen(app)
}
