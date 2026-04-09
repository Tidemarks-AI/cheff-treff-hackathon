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
import Home from "./pages/Home"
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
    if (!session) {
      throw redirect({ to: "/login" })
    }
  },
})

const indexRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: "/",
  component: Home,
})

const agentsRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: "/debug/agents",
  component: Agents,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedLayout.addChildren([indexRoute, agentsRoute]),
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
