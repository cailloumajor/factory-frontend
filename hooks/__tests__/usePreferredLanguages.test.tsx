import { assertEquals } from "@std/assert"
import { fireEvent, render } from "@testing-library/preact"

import { componentTesting } from "@/tests/utils.ts"

import { usePreferredLanguages } from "../usePreferredLanguages.ts"

function TestComponent() {
  Object.defineProperty(globalThis.navigator, "languages", {
    value: ["blabla"],
    configurable: true,
  })

  const languages = usePreferredLanguages()

  function changeLanguages() {
    Object.defineProperty(globalThis.navigator, "languages", {
      value: ["lang1", "lang2", "lang3"],
    })
    globalThis.dispatchEvent(new Event("languagechange"))
  }

  return (
    <div>
      <button type="button" data-testid="change-lang-btn" onClick={changeLanguages}></button>
      <ul>
        {languages.value.map((lang, idx) => (
          <li data-testid="lang-item" key={`item-${idx}`}>{lang}</li>
        ))}
      </ul>
    </div>
  )
}

Deno.test("gets initial value", async () => {
  await using _ctHandle = componentTesting()

  const { findAllByTestId } = render(<TestComponent />)

  const languageItems = await findAllByTestId("lang-item")

  assertEquals(languageItems.length, 1)
  assertEquals(languageItems[0].innerText, "blabla")
})

Deno.test("changes languages upon event", async () => {
  await using _ctHandle = componentTesting()

  const { findAllByText, findByTestId } = render(<TestComponent />)

  const btn = await findByTestId("change-lang-btn")
  fireEvent.click(btn)

  const languageItems = await findAllByText(/^lang\d/)

  assertEquals(languageItems.length, 3)
  assertEquals(languageItems[0].innerText, "lang1")
  assertEquals(languageItems[1].innerText, "lang2")
  assertEquals(languageItems[2].innerText, "lang3")
})
