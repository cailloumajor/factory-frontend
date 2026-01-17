import { HttpError } from "fresh"

import { define } from "@/utils/state.ts"

interface ServerCodePageProps {
  code?: number
  description: string
  goHomeText: string
}

function ServerCodePage(props: ServerCodePageProps) {
  return (
    <main class="fixed top-0 bottom-0 left-0 right-0 flex flex-col justify-center text-center">
      {props.code && <h1 class="text-9xl/normal text-error">{props.code}</h1>}
      <h2 class="text-6xl opacity-40">{props.description}</h2>
      <a class="btn mt-8 mx-auto" href="/">{props.goHomeText}</a>
    </main>
  )
}

export default define.page(({ state, error }) => {
  const goHomeText = state.t(($) => $.goHome)

  if (error instanceof HttpError) {
    const description = state.t(($) => $.httpError[error.status === 404 ? "404" : "unspecific"])
    return ServerCodePage({
      code: error.status,
      description,
      goHomeText,
    })
  }

  // deno-lint-ignore no-console -- console is used by purpose
  console.error(error)

  return ServerCodePage({
    description: state.t(($) => $.httpError.unspecific),
    goHomeText,
  })
})
