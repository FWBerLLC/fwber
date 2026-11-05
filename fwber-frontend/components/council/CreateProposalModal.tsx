'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Loader2, Info } from 'lucide-react';

export function CreateProposalModal({ onSuccess }: { onSuccess: () => void }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'policy',
        options: ['Yes', 'No', 'Abstain'],
        duration_days: '7'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/governance/proposals', {
                ...formData,
                duration_days: parseInt(formData.duration_days)
            });
            toast({
                title: "Proposal Submitted",
                description: "The community can now vote on your proposal.",
            });
            setIsOpen(false);
            onSuccess();
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: err.message || "Ensure you have at least 100 FWB Tokens.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Proposal
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card dark:bg-card dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Submit Council Proposal</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg flex items-start gap-3 border border-purple-100 dark:border-purple-800/50">
                        <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-purple-700 dark:text-purple-300 font-bold uppercase tracking-widest leading-relaxed">
                            Requires 100 FWB Tokens to post. These tokens will be held during the voting period.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Proposal Title</Label>
                        <Input 
                            id="title" 
                            placeholder="e.g. Expand Detroit Proximity Radius to 5km" 
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="policy">Policy</SelectItem>
                                <SelectItem value="mod">Moderation</SelectItem>
                                <SelectItem value="tech">Technical</SelectItem>
                                <SelectItem value="treasury">Treasury</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Detailed Description</Label>
                        <Textarea 
                            id="description" 
                            rows={4} 
                            placeholder="Provide rationale for this change..." 
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="duration">Voting Duration (Days)</Label>
                            <Input 
                                id="duration" 
                                type="number" 
                                min="1" 
                                max="30"
                                value={formData.duration_days}
                                onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-12 bg-zinc-900 dark:bg-card dark:bg-card text-white dark:text-zinc-900 font-black uppercase italic" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Launch Proposal'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
