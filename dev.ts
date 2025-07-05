import { Builder } from "fresh/dev"
import { app } from "./main.ts"
import { styleTransformPlugin } from "./utils/style.ts"

const builder = new Builder()

styleTransformPlugin(builder)

if (Deno.args.includes("build")) {
  await builder.build(app)
} else {
  await builder.listen(app)
}
