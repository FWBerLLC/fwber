'use client';
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import dynamic from 'next/dynamic';
import { useWallet as useInternalWallet } from '@/lib/hooks/useWallet';
import { useState } from 'react';
import { api } from '@/lib/api/client';
import { Loader2, ArrowDownCircle, ArrowUpCircle, Send, Key, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PaymentRequests from './PaymentRequests';
import SendTokenModal from './SendTokenModal';
import TopUpModal from './TopUpModal';
import { SwapInterface } from './SwapInterface';

const WalletMultiButton = dynamic(
    () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
    { ssr: false }
);

export default function WalletDashboard() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useSolanaWallet();
    const { data: internalWallet, refresh } = useInternalWallet();

    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'wallet' | 'requests' | 'merchant' | 'bridge'>('wallet');
    const [isSendOpen, setIsSendOpen] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [merchantKeys, setMerchantKeys] = useState<{ merchant_secret: string } | null>(null);

    const handleWithdraw = async () => {
        if (!publicKey || !withdrawAmount) return;
        setLoading(true);
        try {
            await api.post('/wallet/withdraw', {
                amount: parseFloat(withdrawAmount),
                destination_address: publicKey.toBase58()
            });
            refresh();
            setWithdrawAmount('');
            alert('Withdrawal successful! Check your wallet.');
        } catch (e: any) {
            alert('Withdrawal failed: ' + (e.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeposit = async () => {
        if (!publicKey || !depositAmount || !internalWallet?.treasury_address || !internalWallet?.mint_address) return;

        setLoading(true);
        try {
            const mint = new PublicKey(internalWallet.mint_address);
            const treasury = new PublicKey(internalWallet.treasury_address);
            const amount = Math.floor(parseFloat(depositAmount) * 1_000_000_000);

            const fromATA = await getAssociatedTokenAddress(mint, publicKey);
            const toATA = await getAssociatedTokenAddress(mint, treasury);

            const transaction = new Transaction();
            transaction.add(createTransferInstruction(fromATA, toATA, publicKey, amount));

            const signature = await sendTransaction(transaction, connection);
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            if (confirmation.value.err) throw new Error('Transaction failed on-chain');

            await api.post('/wallet/deposit', {
                amount: parseFloat(depositAmount),
                signature: signature
            });

            refresh();
            setDepositAmount('');
            alert('Deposit successful!');

        } catch (e: any) {
            console.error(e);
            alert('Deposit failed: ' + (e.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const generateMerchantKeys = async () => {
        try {
            const res = await api.post<{ merchant_secret: string }>('/merchant/keys');
            setMerchantKeys(res);
        } catch (e: any) {
            alert('Failed to generate keys');
        }
    };

    return (
        <div className="p-6 bg-card dark:bg-card rounded-lg shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Wallet & Crypto</h2>
                <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Devnet</div>
            </div>

            <div className="flex space-x-1 p-1 bg-muted dark:bg-card dark:dark:bg-muted/50 rounded-lg overflow-x-auto">
                {(['wallet', 'requests', 'merchant', 'bridge'] as const).map(tab => (
                    <button type="button"
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all whitespace-nowrap capitalize ${activeTab === tab
                            ? 'bg-card dark:dark:bg-muted shadow text-foreground dark:text-foreground'
                            : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <SendTokenModal
                isOpen={isSendOpen}
                onClose={() => setIsSendOpen(false)}
                onSuccess={refresh}
            />

            <TopUpModal
                isOpen={isTopUpOpen}
                onClose={() => setIsTopUpOpen(false)}
                onSuccess={() => {
                    refresh();
                    alert('Wallet topped up successfully!');
                }}
            />

            {activeTab === 'wallet' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 border border-purple-200 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">Internal Balance ($FWB)</h3>
                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                    {internalWallet?.balance || '0.00'} FWB
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Use for instant tips and boosts.</p>
                            </div>
                            <div className="flex gap-2">
                                <button type="button"
                                    onClick={() => setIsTopUpOpen(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                                >
                                    <ArrowDownCircle className="w-4 h-4" />
                                    Buy FWB
                                </button>
                                <button type="button"
                                    onClick={() => setIsSendOpen(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <h3 className="font-medium">External Wallet (Solana)</h3>
                        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
                    </div>

                    {publicKey ? (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-xl space-y-4 dark:border-border bg-card dark:bg-card">
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                                    <ArrowUpCircle className="w-5 h-5" /> Withdraw
                                </div>
                                <div className="space-y-2">
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        className="w-full p-2 border rounded dark:dark:bg-muted dark:border-border"
                                        placeholder="Amount (FWB)"
                                    />
                                    <button type="button"
                                        onClick={handleWithdraw}
                                        disabled={loading || !withdrawAmount}
                                        className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Withdraw to Wallet
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">To: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</p>
                            </div>

                            <div className="p-4 border rounded-xl space-y-4 dark:border-border bg-card dark:bg-card">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                                    <ArrowDownCircle className="w-5 h-5" /> Deposit
                                </div>
                                <div className="space-y-2">
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        className="w-full p-2 border rounded dark:dark:bg-muted dark:border-border"
                                        placeholder="Amount (FWB)"
                                    />
                                    <button type="button"
                                        onClick={handleDeposit}
                                        disabled={loading || !depositAmount || !internalWallet?.treasury_address}
                                        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex justify-center items-center gap-2"
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Deposit to App
                                    </button>
                                </div>
                                <div className="flex justify-center">
                                    <QRCodeSVG value={internalWallet?.treasury_address || ''} size={64} className="p-1 bg-card dark:bg-card rounded border" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-muted dark:bg-background rounded-xl text-center">
                            <p className="text-sm text-muted-foreground mb-2">Connect your wallet to deposit or withdraw tokens.</p>
                        </div>
                    )}

                    {internalWallet?.referral_code && (
                        <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl">
                            <p className="text-sm opacity-90">Refer a friend & earn 50 FWB</p>
                            <p className="text-2xl font-mono font-bold mt-1 tracking-wider">{internalWallet.referral_code}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="font-medium">Transaction History</h3>
                        <div className="space-y-2">
                            {internalWallet?.transactions?.length ? (
                                internalWallet.transactions.map((tx: any) => (
                                    <div key={tx.id} className="flex justify-between items-center p-3 border rounded dark:border-border text-sm bg-muted dark:dark:bg-background/50">
                                        <div>
                                            <p className="font-medium">{tx.description}</p>
                                            {tx.metadata?.message && (
                                                <p className="text-xs text-muted-foreground italic">&quot;{tx.metadata.message}&quot;</p>
                                            )}
                                            <p className="text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`font-bold ${parseFloat(tx.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {parseFloat(tx.amount) > 0 ? '+' : ''}{tx.amount} FWB
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm">No transactions yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <PaymentRequests />
                </div>
            )}

            {activeTab === 'bridge' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <SwapInterface />
                </div>
            )}

            {activeTab === 'merchant' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                    <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl">
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            Merchant API
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Accept FWB tokens on your website or app. Generate a secret key to use the fwber Merchant API.
                        </p>

                        {!merchantKeys ? (
                            <button type="button"
                                onClick={generateMerchantKeys}
                                className="bg-card dark:bg-card text-foreground dark:text-foreground px-4 py-2 rounded-lg font-bold hover:bg-muted transition-colors"
                            >
                                Generate API Keys
                            </button>
                        ) : (
                            <div className="bg-black/30 p-4 rounded-lg space-y-2">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Secret Key (Keep Safe)</p>
                                <div className="flex items-center gap-2">
                                    <code className="font-mono text-green-400 break-all">{merchantKeys.merchant_secret}</code>
                                    <button type="button" onClick={() => navigator.clipboard.writeText(merchantKeys.merchant_secret)} className="text-muted-foreground hover:text-white">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-red-400 mt-2">Do not share this key.</p>
                            </div>
                        )}
                    </div>

                    <div className="border dark:border-border rounded-lg p-4">
                        <h4 className="font-bold mb-2">Integration Guide</h4>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-2">
                            1. Create a payment intent via API:
                        </p>
                        <pre className="bg-muted dark:bg-card dark:bg-background p-2 rounded text-xs overflow-x-auto">
                            {`POST /api/merchant/checkout
Headers: { "X-Merchant-Secret": "sk_..." }
Body: {
  "amount": 100,
  "description": "Order #123",
  "redirect_url": "https://yoursite.com/success"
}`}
                        </pre>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground my-2">
                            2. Redirect user to the returned \`checkout_url\`.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
