'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, Send, Globe, Database } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { useWallet as useInternalWallet } from '@/lib/hooks/useWallet';

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendTokenModal({ isOpen, onClose, onSuccess }: SendTokenModalProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { data: internalWallet } = useInternalWallet();

  const [friends, setFriends] = useState<any[]>([]);
  const [recipientType, setRecipientType] = useState<'friend' | 'email'>('friend');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [onChain, setOnChain] = useState(false);

  useEffect(() => {
    if (isOpen && recipientType === 'friend') {
      apiClient.get('/friends').then(res => {
          const data = res.data as { data?: any[] } | any[];
          setFriends(Array.isArray(data) ? data : (data.data || []));
      });
    }
  }, [isOpen, recipientType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((recipientType === 'friend' && !selectedRecipient) || (recipientType === 'email' && !email) || !amount) return;

    setSubmitting(true);
    try {
      let signature = null;

      if (onChain) {
        if (!publicKey) throw new Error('Connect your Solana wallet first');
        if (!internalWallet?.mint_address) throw new Error('Mint address not found');

        // 1. Get recipient wallet address from API
        const res = await apiClient.get(`/users/${selectedRecipient}/wallet`) as any;
        const recipientWallet = res.data.wallet_address;
        if (!recipientWallet) throw new Error('Recipient has no wallet linked');

        const mint = new PublicKey(internalWallet.mint_address);
        const fromPubKey = publicKey;
        const toPubKey = new PublicKey(recipientWallet);
        const transferAmount = Math.floor(parseFloat(amount) * 1_000_000_000); // 9 decimals

        const fromATA = await getAssociatedTokenAddress(mint, fromPubKey);
        const toATA = await getAssociatedTokenAddress(mint, toPubKey);

        const transaction = new Transaction();
        
        // Note: In production we'd check if toATA exists and add createAssociatedTokenAccountInstruction if needed
        transaction.add(createTransferInstruction(fromATA, toATA, fromPubKey, transferAmount));

        signature = await sendTransaction(transaction, connection);
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) throw new Error('On-chain transaction failed');
      }

      await apiClient.post('/wallet/transfer', {
        ...(recipientType === 'friend' ? { recipient_id: selectedRecipient } : { recipient_email: email }),
        amount: parseFloat(amount),
        message,
        on_chain: onChain,
        signature: signature
      });

      alert(onChain ? 'On-chain transfer successful!' : 'Internal tip sent successfully!');
      onSuccess();
      onClose();
      setAmount('');
      setMessage('');
      setSelectedRecipient('');
      setEmail('');
    } catch (error: any) {
      alert(error.message || error.response?.data?.error || 'Failed to send tokens');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-card p-6 shadow-2xl focus:outline-none z-50 dark:bg-background dark:text-foreground border border-border dark:border-border">
          <Dialog.Title className="text-xl font-bold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Send Tokens
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Settlement Toggle */}
            <div className="flex gap-2 p-1 bg-muted dark:bg-card rounded-lg">
                <button
                    type="button"
                    onClick={() => setOnChain(false)}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold rounded-md transition-all ${
                        !onChain ? 'bg-card shadow text-indigo-600' : 'text-muted-foreground'
                    }`}
                >
                    <Database className="w-3 h-3" />
                    Internal
                </button>
                <button
                    type="button"
                    onClick={() => setOnChain(true)}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 text-xs font-bold rounded-md transition-all ${
                        onChain ? 'bg-purple-600 shadow text-white' : 'text-muted-foreground'
                    }`}
                >
                    <Globe className="w-3 h-3" />
                    On-Chain
                </button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center italic">
                {onChain 
                    ? "Settles on Solana Devnet. Requires connected wallet. Small gas fee applies."
                    : "Settles instantly in-app. Zero fees. Managed by fwber treasury."}
            </p>

            {/* Recipient Toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-muted dark:bg-card rounded-lg">
                <button
                    type="button"
                    onClick={() => setRecipientType('friend')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        recipientType === 'friend' ? 'bg-card shadow text-indigo-600' : 'text-muted-foreground'
                    }`}
                >
                    Select Friend
                </button>
                <button
                    type="button"
                    onClick={() => setRecipientType('email')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        recipientType === 'email' ? 'bg-card shadow text-indigo-600' : 'text-muted-foreground'
                    }`}
                >
                    Enter Email
                </button>
            </div>

            {recipientType === 'friend' ? (
                <div>
                <label className="block text-sm font-medium mb-1">Recipient</label>
                <select
                    value={selectedRecipient}
                    onChange={e => setSelectedRecipient(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-card dark:border-border"
                    required={recipientType === 'friend'}
                >
                    <option value="">Select a friend...</option>
                    {friends.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
                {friends.length === 0 && <p className="text-xs text-muted-foreground mt-1">No friends found.</p>}
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium mb-1">Recipient Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-2 border rounded-lg dark:bg-card dark:border-border"
                        placeholder="friend@example.com"
                        required={recipientType === 'email'}
                    />
                </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Amount (FWB)</label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-card dark:border-border"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Message (Optional)</label>
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-card dark:border-border"
                placeholder="What's this for?"
                maxLength={255}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted dark:bg-background dark:border-border dark:text-muted-foreground dark:hover:dark:bg-card"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (recipientType === 'friend' ? !selectedRecipient : !email)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Now
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
