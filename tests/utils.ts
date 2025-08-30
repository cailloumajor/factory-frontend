import { cleanup } from "@testing-library/preact"
import { GlobalRegistrator } from "@happy-dom/global-registrator"

export function componentTesting() {
  GlobalRegistrator.register()

  return {
    async [Symbol.asyncDispose]() {
      cleanup()
      await GlobalRegistrator.unregister()
    },
  }
}
