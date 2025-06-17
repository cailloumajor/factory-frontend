import type { ComponentChildren } from "preact"

export interface ButtonProps {
  onClick?: () => void
  children?: ComponentChildren
  disabled?: boolean
}

export function Button(props: ButtonProps) {
  return <button {...props} class="button" />
}
