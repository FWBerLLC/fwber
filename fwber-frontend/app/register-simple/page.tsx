'use client'

export default function SimpleRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground dark:text-foreground">
            Simple Register Test
          </h2>
        </div>
        <div className="text-center">
          <p>This is a simple register page to test if the issue is with the complex component.</p>
        </div>
      </div>
    </div>
  )
}
