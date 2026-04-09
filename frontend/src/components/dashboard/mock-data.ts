import type { LucideIcon } from "lucide-react"
import { Bug, Scale, Wallet, Users, Settings } from "lucide-react"

export type NavSection = {
  label: string
  icon: LucideIcon
  items: { title: string; href: string }[]
}

export const sidebarNav: NavSection[] = [
  {
    label: "Legal",
    icon: Scale,
    items: [
      { title: "Incorporation", href: "#" },
      { title: "Documents", href: "#" },
      { title: "Compliance", href: "#" },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    items: [
      { title: "Runway", href: "#" },
      { title: "Burn Rate", href: "#" },
      { title: "Forecasting", href: "#" },
    ],
  },
  {
    label: "HR",
    icon: Users,
    items: [
      { title: "Talent Pipeline", href: "#" },
      { title: "Org Structure", href: "#" },
      { title: "Onboarding", href: "#" },
    ],
  },
  {
    label: "Ops",
    icon: Settings,
    items: [
      { title: "Tooling", href: "#" },
      { title: "Workflows", href: "#" },
      { title: "Integrations", href: "#" },
    ],
  },
  {
    label: "Debug",
    icon: Bug,
    items: [{ title: "Agents Workspace", href: "/debug/agents" }],
  },
]

export const inboxItems = [
  {
    id: 1,
    title: "Delaware C-Corp filing ready for review",
    category: "Legal",
    time: "2h ago",
    urgent: true,
  },
  {
    id: 2,
    title: "Monthly burn rate report available",
    category: "Finance",
    time: "5h ago",
    urgent: false,
  },
  {
    id: 3,
    title: "3 new applicants for Senior Engineer role",
    category: "HR",
    time: "1d ago",
    urgent: false,
  },
  {
    id: 4,
    title: "Stripe integration requires re-authentication",
    category: "Ops",
    time: "1d ago",
    urgent: true,
  },
  {
    id: 5,
    title: "Board consent resolution needs signature",
    category: "Legal",
    time: "2d ago",
    urgent: false,
  },
]

export const statsData = [
  { label: "Company Status", value: "Active", description: "Delaware C-Corp" },
  { label: "Runway", value: "18 mo", description: "At current burn rate" },
  { label: "Team Size", value: "7", description: "3 open roles" },
  { label: "Pending Tasks", value: "12", description: "4 urgent" },
]
