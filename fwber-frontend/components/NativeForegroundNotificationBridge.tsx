'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

/**
 * Bridges native foreground push notifications into the web app's toast layer.
 * This is designed to run when the app is being viewed inside the ReactNative WebView.
 */
export default function NativeForegroundNotificationBridge() {
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // Setup global callback for the mobile native bridge
        (window as any).handleNativeNotification = (content: any) => {
            console.log('Native Notification Received:', content);
            
            const title = content.title || 'New Notification';
            const body = content.body || '';
            const url = content.data?.url;

            toast({
                title: title,
                description: body,
                duration: 5000,
                // If a URL is provided, allow the user to jump to it
                action: url ? (
                    <button type="button" 
                        onClick={() => router.push(url)}
                        className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-bold"
                    >
                        View
                    </button>
                ) : undefined
            });
        };

        return () => {
            delete (window as any).handleNativeNotification;
        };
    }, [toast, router]);

    return null; // This component has no UI
}
