import { Star } from 'lucide-react'

interface VouchUser {
  name: string
  vouches: number
  breakdown?: {
    safe: number
    fun: number
    hot: number
  }
}

interface VouchLeaderboardProps {
  data: VouchUser[]
}

export default function VouchLeaderboard({ data }: VouchLeaderboardProps) {
  return (
    <div className="bg-card dark:bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-indigo-500 to-violet-500 text-white flex items-center gap-3">
        <Star className="w-6 h-6" />
        <h2 className="text-xl font-bold">Most Vouched</h2>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {data?.map((user, index) => (
          <div key={index} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-muted text-foreground' :
                index === 2 ? 'bg-orange-100 text-orange-700' :
                'text-muted-foreground'
              }`}>
                {index + 1}
              </span>
              <p className="font-medium text-foreground dark:text-foreground">{user.name}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-bold text-foreground dark:text-foreground">
                {user.vouches}
              </span>
              {user.breakdown && (
                <div className="flex gap-1 text-[10px] mt-0.5">
                  <span title="Safe" className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">🛡️ {user.breakdown.safe}</span>
                  <span title="Fun" className="px-1 py-0.5 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded">🎉 {user.breakdown.fun}</span>
                  <span title="Hot" className="px-1 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">🔥 {user.breakdown.hot}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="p-8 text-center text-muted-foreground">
            No vouches yet.
          </div>
        )}
      </div>
    </div>
  )
}
