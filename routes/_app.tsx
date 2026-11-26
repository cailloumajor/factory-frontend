import { define } from "@/utils/state.ts"

export default define.page(({ Component, state }) => {
  return (
    <html class="has-[.line-dashboard-root]:text-[2vh]">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <title>{state.appConfig.productName}</title>
      </head>
      <body>
        <Component />
      </body>
    </html>
  )
})
