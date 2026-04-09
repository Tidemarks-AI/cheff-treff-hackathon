import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: () =>
      apiFetch<{ status: string; timestamp: string }>("/health"),
  })

  return (
    <div className="space-y-4 py-8">
      <h2 className="text-3xl font-bold">Welcome</h2>
      <p className="text-muted-foreground">
        Your hackathon project is ready. Start building!
      </p>
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold">Backend Status</h3>
        {isLoading && <p>Checking...</p>}
        {error && <p className="text-red-500">Backend offline</p>}
        {data && (
          <p className="text-green-600">
            {data.status} &mdash; {data.timestamp}
          </p>
        )}
      </div>
    </div>
  )
}
