import { assertEquals, assertThrows } from "@std/assert"
import { stub } from "@std/testing/mock"

import { envOverridden } from "../config.ts"

const initial = {
  str: "some string",
  num: 42,
  nested: {
    nStr: "blabla",
    nNum: 1700,
    nested: {
      nnBool: true,
    },
  },
  bool: false,
}

Deno.test("keeps values if no environment variables are set", () => {
  const overridden = envOverridden(initial)

  assertEquals(overridden, initial)
})

Deno.test("overrides the values from environment", () => {
  const fakeEnv: Record<string, string> = {
    STR: "something other",
    NUM: "984",
    NESTED_N_STR: "blibli",
    NESTED_N_NUM: "8946",
    NESTED_NESTED_NN_BOOL: "0",
    BOOL: "1",
  }
  const envStub = stub(Deno.env, "get", (key) => fakeEnv[key])

  const overridden = envOverridden(initial)
  const expected = {
    str: "something other",
    num: 984,
    nested: {
      nStr: "blibli",
      nNum: 8946,
      nested: {
        nnBool: false,
      },
    },
    bool: true,
  }

  try {
    assertEquals(overridden, expected)
  } finally {
    envStub.restore()
  }
})

Deno.test("throws if parsing a number fails", () => {
  const fakeEnv: Record<string, string> = {
    NESTED_N_NUM: "abcd",
  }
  const envStub = stub(Deno.env, "get", (key) => fakeEnv[key])

  try {
    assertThrows(() => envOverridden(initial))
  } finally {
    envStub.restore()
  }
})

Deno.test("throws if an array is encountered", () => {
  const initialCopy = JSON.parse(JSON.stringify(initial))
  initialCopy.nested.nArray = [1, 2, 3]
  const fakeEnv: Record<string, string> = {
    NESTED_N_ARRAY: "abcd",
  }
  const envStub = stub(Deno.env, "get", (key) => fakeEnv[key])

  try {
    assertThrows(() => envOverridden(initialCopy))
  } finally {
    envStub.restore()
  }
})

Deno.test("throws if an unsupported type is encountered", () => {
  const initialCopy = JSON.parse(JSON.stringify(initial))
  initialCopy.nested.nFunc = () => ""
  const fakeEnv: Record<string, string> = {
    NESTED_N_FUNC: "abcd",
  }
  const envStub = stub(Deno.env, "get", (key) => fakeEnv[key])

  try {
    assertThrows(() => envOverridden(initialCopy))
  } finally {
    envStub.restore()
  }
})
