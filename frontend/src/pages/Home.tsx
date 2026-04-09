import { InboxCard } from "@/components/dashboard/inbox-card"
import { StatsCards } from "@/components/dashboard/stats-cards"

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, Founder
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your startup today.
        </p>
      </div>

      <StatsCards />

      <InboxCard />
    </div>
  )
}
