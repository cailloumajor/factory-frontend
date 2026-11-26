import type { InputHTMLAttributes, TargetedEvent } from "preact"

/** Manages the dynamic part of the sidebar toggle. */
export function SideBarToggle(attrs: InputHTMLAttributes) {
  const onToggleChange = (e: TargetedEvent<HTMLInputElement>) => {
    const open = e.currentTarget.checked
    cookieStore.set({
      name: "floor-drawer",
      value: open ? "open" : "closed",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // One year
    }).catch((err) => {
      // deno-lint-ignore no-console -- console is used by purpose
      console.error("Failed to set side bar toggle state cookie:", err)
    })
  }

  return <input type="checkbox" onChange={onToggleChange} {...attrs} />
}
