import os

app_root = os.path.join(os.path.dirname(__file__), 'fwber-frontend', 'app')

loading_tpl = """export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
"""

error_tpl = """"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">Something went wrong</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error.message || "An unexpected error occurred."}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
"""

created_loading = 0
created_error = 0

for dirpath, dirnames, filenames in os.walk(app_root):
    # Skip API routes
    rel = os.path.relpath(dirpath, app_root)
    if 'api' in rel.split(os.sep):
        continue
    has_page = 'page.tsx' in filenames or 'page.js' in filenames
    if not has_page:
        continue

    loading_path = os.path.join(dirpath, 'loading.tsx')
    error_path = os.path.join(dirpath, 'error.tsx')

    if not os.path.exists(loading_path):
        with open(loading_path, 'w', encoding='utf-8') as f:
            f.write(loading_tpl)
        created_loading += 1

    if not os.path.exists(error_path):
        with open(error_path, 'w', encoding='utf-8') as f:
            f.write(error_tpl)
        created_error += 1

print(f'Created {created_loading} loading.tsx, {created_error} error.tsx')
