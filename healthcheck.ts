try {
  const resp = await fetch("http://127.0.0.1:8000", { method: "HEAD" })
  if (!resp.ok) {
    throw new Error(`Bad status code: ${resp.status}`)
  }
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  // deno-lint-ignore no-console -- console is used by purpose
  console.error(message)
  Deno.exit(1)
}
