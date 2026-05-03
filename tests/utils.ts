import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { cleanup } from "@testing-library/preact"
import * as sinon from "sinon"

export function componentTesting() {
  GlobalRegistrator.register({ url: "http://testing.com/" })

  return {
    async [Symbol.asyncDispose]() {
      sinon.restore()
      cleanup()
      await GlobalRegistrator.unregister()
    },
  }
}
