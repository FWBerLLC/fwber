import ProximityFeed from '@/components/ProximityFeed';

export default function PulsePage() {
  return (
    <div className="min-h-screen bg-muted dark:bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Local Pulse</h1>
          <p className="mt-2 text-muted-foreground">Discover what&rsquo;s happening around you right now.</p>
        </div>
        <ProximityFeed />
      </div>
    </div>
  );
}
