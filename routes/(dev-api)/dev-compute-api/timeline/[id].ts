import { define } from "../../../../utils/state.ts"
import timelineData from "./timeline_data.bin" with { type: "bytes" }

export const handler = define.handlers({
  GET(_ctx) {
    return new Response(timelineData)
  },
})
