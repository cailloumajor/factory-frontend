import { define } from "@/utils/state.ts"

export default define.page(({ Component, state }) => {
  return (
    <html class="has-[.line-dashboard-root]:text-[2vh]">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{state.appConfig.productName}</title>
      </head>
      <body>
        <Component />
      </body>
    </html>
  )
})
