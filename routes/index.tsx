import { useSignal } from "@preact/signals"

import Counter from "../islands/Counter.tsx"
import { define } from "../utils/state.ts"

export default define.page(function Home({ state }) {
  const count = useSignal(3)

  return (
    <div class="px-4 py-5 mx-auto fresh-gradient">
      <div class="mx-auto is-flex is-flex-direction-column is-align-items-center is-justify-content-center">
        <img
          class="my-6"
          src="/logo.svg"
          width="128"
          height="128"
          alt="the Fresh logo: a sliced lemon dripping with juice"
        />
        <h1 class="is-size-2 has-text-weight-bold">{state.t("welcomeFresh")}</h1>
        <p class="my-4">
          Try updating this message in the
          <code class="mx-2">./routes/index.tsx</code> file, and refresh.
        </p>
        <Counter count={count} />
      </div>
    </div>
  )
})
