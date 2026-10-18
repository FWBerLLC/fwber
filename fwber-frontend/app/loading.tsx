export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-border dark:border-border" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
