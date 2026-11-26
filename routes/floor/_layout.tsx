import { mdiDataMatrixScan, mdiDockLeft, mdiHome } from "@mdi/js"
import { getCookies } from "@std/http/cookie"

import { Icon } from "@/components/Icon.tsx"
import { Clock } from "@/islands/Clock.tsx"
import { define } from "@/utils/state.ts"

import { BadgeListener } from "./(_islands)/BadgeListener.tsx"
import { SideBarToggle } from "./(_islands)/SideBarToggle.tsx"

/** An element of the sidebar menu. */
type MenuElement = {
  /** SVG path of the icon */
  iconSvg: string
  /** Name displayed in the menu */
  name: string
  /** Path to use as link target */
  path: string
}

export default define.layout(({ Component, req, state }) => {
  const drawerOpen = getCookies(req.headers)["floor-drawer"] === "open"

  // Side menu elements.
  const menuElements: MenuElement[] = [
    {
      iconSvg: mdiHome,
      name: state.t(($) => $.floorMenu.home),
      path: "/floor/home",
    },
    {
      iconSvg: mdiDataMatrixScan,
      name: state.t(($) => $.floorMenu.traceability),
      path: "/floor/traceability",
    },
  ]

  return (
    <div class="drawer drawer-open">
      <SideBarToggle id="app-drawer" class="drawer-toggle" checked={drawerOpen} />

      <div class="drawer-content flex flex-col min-h-screen">
        <header class="navbar gap-2 bg-linear-45 from-primary to-secondary min-h-0 shadow-md text-white">
          <label
            for="app-drawer"
            aria-label="toggle sidebar"
            class="btn btn-sm btn-square btn-ghost hover:bg-sky-700 hover:border-sky-700 drawer-button"
          >
            <Icon class="size-5 fill-white" iconSvg={mdiDockLeft} />
          </label>
          <a href="/" class="navbar-start">
            <img src="/logo.svg" width="29" height="33" />
            <span class="font-brand text-2xl leading-none font-bold ml-2">
              {state.appConfig.productName}
            </span>
          </a>
          <div class="navbar-end">
            <img src="/logo-company.png" width="57" height="33" />
          </div>
        </header>

        <main class="grow">
          <Component />
        </main>

        <footer class="footer footer-horizontal bg-base-300 shadow-md px-1">
          <BadgeListener />
          <Clock class="justify-self-end text-base" refreshMillis={5000} />
        </footer>
      </div>

      <div class="drawer-side">
        <label for="app-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
        <ul class="menu menu-lg floor-menu bg-base-200 min-h-full gap-1 font-medium is-drawer-open:w-60">
          {menuElements.map((el) => (
            <li>
              <a href={el.path} class="is-drawer-close:px-2">
                <Icon class="size-7" iconSvg={el.iconSvg} />
                <span class="is-drawer-close:hidden">{el.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})
