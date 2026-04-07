import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted/40 shimmer rounded-md border border-border/50", className)}
      {...props}
    />
  )
}

export { Skeleton }
