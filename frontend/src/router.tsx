import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"
import App from "./App"
import Agents from "./pages/Agents"
import Finance from "./pages/Finance"
import Login from "./pages/Login"

const rootRoute = createRootRoute({
  component: Outlet,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      throw redirect({ to: "/" })
    }
  },
})

const authenticatedLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: App,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    // if (!session) {
    //   throw redirect({ to: "/login" })
    // }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: "/",
  component: () => <div>Welcome to StartupOS</div>,
})

const financeRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: "/finance",
  component: Finance,
})

const adminRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: "/admin",
  component: Agents,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedLayout.addChildren([indexRoute, financeRoute, adminRoute]),
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
