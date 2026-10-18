'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Link as LinkIcon, Smartphone, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function IntegrationsPage() {
    const [connecting, setConnecting] = useState<string | null>(null);
    const { toast } = useToast();

    // Mock initial state for UI
    const [integrations, setIntegrations] = useState({
        google: false,
        microsoft: false,
        facebook: true // Mock one as already connected
    });

    const handleConnect = (provider: string) => {
        setConnecting(provider);
        // Direct the user to the backend OAuth redirect route
        // Example: /api/integrations/contacts/auth/google
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        window.location.href = `${apiUrl}/integrations/contacts/auth/${provider}`;

        // Timeout just to reset UI state if the redirect fails or is blocked
        setTimeout(() => setConnecting(null), 5000);
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <LinkIcon className="w-8 h-8 text-primary" />
                    Connected Accounts
                </h1>
            </div>

            <Card className="bg-card shadow-sm border border-gray-100 mb-8">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        Contact Synchronization
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Sync your contacts to find friends already on the platform. We never message anyone without your permission.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                        Connect your accounts to easily find friends and build your local network.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Google Integration */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xl">G</div>
                            {integrations.google ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Connected</span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">Not Connected</span>
                            )}
                        </div>
                        <CardTitle className="text-lg">Google Contacts</CardTitle>
                        <CardDescription className="text-sm">Sync your Gmail and Android address book.</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-4 border-t mt-4">
                        <Button
                            variant={integrations.google ? "outline" : "default"}
                            className="w-full"
                            onClick={() => handleConnect('google')}
                            disabled={connecting === 'google'}
                        >
                            {connecting === 'google' ? 'Redirecting...' : integrations.google ? 'Reconnect' : 'Connect Google'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Microsoft Integration */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">M</div>
                            {integrations.microsoft ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Connected</span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">Not Connected</span>
                            )}
                        </div>
                        <CardTitle className="text-lg">Outlook / Microsoft 365</CardTitle>
                        <CardDescription className="text-sm">Sync your Outlook, Live, and Hotmail contacts.</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-4 border-t mt-4">
                        <Button
                            variant={integrations.microsoft ? "outline" : "default"}
                            className="w-full"
                            onClick={() => handleConnect('microsoft')}
                            disabled={connecting === 'microsoft'}
                        >
                            {connecting === 'microsoft' ? 'Redirecting...' : integrations.microsoft ? 'Reconnect' : 'Connect Microsoft'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Facebook Integration */}
                <Card className="hover:shadow-md transition-shadow flex flex-col justify-between border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">f</div>
                            {integrations.facebook ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200"><CheckCircle2 className="w-3 h-3" /> Connected</span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">Not Connected</span>
                            )}
                        </div>
                        <CardTitle className="text-lg">Facebook Friends</CardTitle>
                        <CardDescription className="text-sm">Find mutual friends already using our platform.</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-4 border-t border-primary/10 mt-4">
                        <Button
                            variant={integrations.facebook ? "outline" : "default"}
                            className="w-full border-primary/20 hover:bg-primary/10"
                            onClick={() => handleConnect('facebook')}
                            disabled={connecting === 'facebook'}
                        >
                            {connecting === 'facebook' ? 'Redirecting...' : integrations.facebook ? 'Manage Connection' : 'Connect Facebook'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <strong>Privacy First:</strong> We use industry-standard OAuth 2.0. We never store your passwords, and we never message your contacts without explicit permission. You can revoke access at any time from your account settings.
                </div>
            </div>
        </div>
    );
}
