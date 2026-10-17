'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Loader2, Check, X, Plus } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface Request {
  id: number;
  amount: string;
  note: string;
  status: string;
  requester?: { id: number; name: string; email: string };
  payer?: { id: number; name: string; email: string };
  created_at: string;
}

interface RequestsResponse {
  incoming: Request[];
  outgoing: Request[];
}

export default function PaymentRequests() {
  const [incoming, setIncoming] = useState<Request[]>([]);
  const [outgoing, setOutgoing] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get<RequestsResponse>('/wallet/requests');
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handlePay = async (id: number) => {
    if (!confirm('Pay this request?')) return;
    try {
      await apiClient.post(`/wallet/requests/${id}/pay`);
      fetchRequests(); // Refresh
      alert('Payment successful!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Payment failed');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await apiClient.post(`/wallet/requests/${id}/cancel`);
      fetchRequests();
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Payment Requests</h3>
        <button type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      <CreateRequestModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchRequests}
      />

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Incoming */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">To Pay (Incoming)</h4>
            {incoming.length === 0 && <p className="text-sm text-gray-400 italic">No pending requests.</p>}
            {incoming.map(req => (
              <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">{req.requester?.name}</span>
                    <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{req.amount} FWB</span>
                </div>
                {req.note && <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-gray-900 p-2 rounded">&quot;{req.note}&quot;</p>}

                {req.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => handlePay(req.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded text-sm font-medium flex justify-center items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Pay
                    </button>
                    <button type="button"
                      onClick={() => handleCancel(req.id)}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 py-1.5 px-3 rounded text-sm font-medium flex justify-center items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-sm font-medium text-gray-500 capitalize bg-gray-100 dark:bg-gray-800 dark:bg-gray-700 py-1 rounded">
                    {req.status}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Outgoing */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Sent (Outgoing)</h4>
            {outgoing.length === 0 && <p className="text-sm text-gray-400 italic">No sent requests.</p>}
            {outgoing.map(req => (
              <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 opacity-90">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm text-gray-500">To: </span>
                    <span className="font-bold text-gray-900 dark:text-white">{req.payer?.name}</span>
                    <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold text-gray-600 dark:text-gray-400">{req.amount} FWB</span>
                </div>
                {req.note && <p className="text-sm text-gray-500 mb-3 italic">&quot;{req.note}&quot;</p>}

                <div className="flex justify-between items-center">
                   <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                     req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                     req.status === 'paid' ? 'bg-green-100 text-green-800' :
                     'bg-gray-100 text-gray-800'
                   }`}>
                     {req.status}
                   </span>

                   {req.status === 'pending' && (
                     <button type="button"
                       onClick={() => handleCancel(req.id)}
                       className="text-xs text-red-500 hover:text-red-700 hover:underline"
                     >
                       Cancel
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateRequestModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedPayer, setSelectedPayer] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      apiClient.get<any>('/friends').then(res => setFriends(res.data.data || res.data));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayer || !amount) return;

    setSubmitting(true);
    try {
      await apiClient.post('/wallet/requests', {
        payer_id: selectedPayer,
        amount: parseFloat(amount),
        note
      });
      onSuccess();
      onClose();
      setAmount('');
      setNote('');
      setSelectedPayer('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-2xl focus:outline-none z-50 dark:bg-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
          <Dialog.Title className="text-xl font-bold mb-4">Request Money</Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payer (Friend)</label>
              <select
                value={selectedPayer}
                onChange={e => setSelectedPayer(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                required
              >
                <option value="">Select a friend...</option>
                {friends.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {friends.length === 0 && <p className="text-xs text-red-500 mt-1">You need to add friends first.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount (FWB)</label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                placeholder="What's this for?"
                maxLength={50}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedPayer}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Request
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
