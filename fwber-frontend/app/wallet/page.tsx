import WalletDashboard from '@/components/wallet/WalletDashboard';
import AppHeader from '@/components/AppHeader';

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-muted dark:bg-background pb-20">
      <AppHeader />
      <div className="container mx-auto p-4 max-w-2xl mt-4">
        <WalletDashboard />
      </div>
    </div>
  );
}
