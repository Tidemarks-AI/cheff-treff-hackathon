import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "../lib/utils"
import { Input } from "../atoms/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

export interface FilterDefinition {
  key: string
  label: string
  options: { value: string; label: string }[]
}

export interface FilterBarProps extends React.ComponentProps<"div"> {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: FilterDefinition[]
  filterValues?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  actions?: React.ReactNode
}

function FilterBar({
  className,
  searchPlaceholder = "Search…",
  searchValue,
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  actions,
  ...props
}: FilterBarProps) {
  return (
    <div
      data-slot="filter-bar"
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    >
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>

      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filterValues[filter.key] ?? ""}
          onValueChange={(v) => onFilterChange?.(filter.key, v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export { FilterBar }
