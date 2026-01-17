import { cleanup } from "@testing-library/preact"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
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
