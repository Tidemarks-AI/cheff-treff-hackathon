import { Inbox } from "lucide-react"

import { inboxItems } from "@/components/dashboard/mock-data"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function InboxCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="size-5" />
          Inbox
          <Badge variant="secondary">{inboxItems.length}</Badge>
        </CardTitle>
        <CardDescription>
          Action items requiring your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-0">
        {inboxItems.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <Separator />}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {item.urgent && (
                  <span className="size-2 shrink-0 rounded-full bg-destructive" />
                )}
                {!item.urgent && <span className="size-2 shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
              <Badge variant="outline" className="ml-4 shrink-0">
                {item.category}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
