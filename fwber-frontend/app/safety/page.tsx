'use client';

import { useState, useEffect, useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Crosshair, Users, MapPin, Plus, Trash2, BellRing, Navigation } from 'lucide-react';
import {
    getContacts,
    addContact,
    deleteContact,
    triggerPanic,
    startSafeWalk,
    EmergencyContact
} from '@/lib/api/safety';

export default function SafetyPage() {
    const { toast } = useToast();

    // Contacts State
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(true);
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [isAddingContact, setIsAddingContact] = useState(false);

    // Safe Walk State
    const [destination, setDestination] = useState('');
    const [isStartingWalk, setIsStartingWalk] = useState(false);

    // Panic State
    const [isPanicking, setIsPanicking] = useState(false);

    const loadContacts = useCallback(async () => {
        try {
            const { contacts } = await getContacts();
            setContacts(contacts);
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to load emergency contacts.', variant: 'destructive' });
        } finally {
            setIsLoadingContacts(false);
        }
    }, [toast]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    const handleAddContact = async () => {
        if (!newContactName || !newContactPhone) {
            toast({ title: 'Missing Info', description: 'Name and phone are required.', variant: 'destructive' });
            return;
        }

        setIsAddingContact(true);
        try {
            await addContact({
                name: newContactName,
                phone: newContactPhone,
                is_primary: contacts.length === 0 // First contact is primary
            });
            toast({ title: 'Success', description: 'Contact added successfully.' });
            setNewContactName('');
            setNewContactPhone('');
            await loadContacts();
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to add contact.', variant: 'destructive' });
        } finally {
            setIsAddingContact(false);
        }
    };

    const handleDeleteContact = async (id: number) => {
        try {
            await deleteContact(id);
            toast({ title: 'Contact Removed', description: 'Emergency contact removed.' });
            setContacts(contacts.filter(c => c.id !== id));
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to delete contact.', variant: 'destructive' });
        }
    };

    const handleStartWalk = () => {
        if (!destination) {
            toast({ title: 'Destination Required', description: 'Please enter where you are walking to.', variant: 'destructive' });
            return;
        }

        setIsStartingWalk(true);

        if (!('geolocation' in navigator)) {
            toast({ title: 'Unsupported', description: 'Geolocation is not supported by your browser.', variant: 'destructive' });
            setIsStartingWalk(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    await startSafeWalk({
                        destination,
                        start_lat: pos.coords.latitude,
                        start_lng: pos.coords.longitude
                    });
                    toast({ title: 'Safe Walk Started', description: 'Your location is now being securely tracked.' });
                    setDestination('');
                } catch (e) {
                    toast({ title: 'Error', description: 'Failed to start safe walk.', variant: 'destructive' });
                } finally {
                    setIsStartingWalk(false);
                }
            },
            (error) => {
                setIsStartingWalk(false);
                toast({ title: 'Location Error', description: 'Cannot start Safe Walk without location permissions.', variant: 'destructive' });
            },
            { enableHighAccuracy: true }
        );
    };

    const handlePanic = () => {
        if (contacts.length === 0) {
            toast({
                title: 'No Contacts',
                description: 'You must add at least one emergency contact before using the Panic Button.',
                variant: 'destructive'
            });
            return;
        }

        setIsPanicking(true);

        const executePanic = async (lat?: number, lng?: number) => {
            try {
                const res = await triggerPanic(lat, lng);
                toast({
                    title: 'PANIC TRIGGERED',
                    description: `Alert sent to ${res.alerts_sent} contacts.`,
                    variant: 'destructive'
                });
            } catch (e: any) {
                toast({ title: 'System Failure', description: e.message || 'Panic alert failed to send!', variant: 'destructive' });
            } finally {
                setTimeout(() => setIsPanicking(false), 3000); // Cool down
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => executePanic(pos.coords.latitude, pos.coords.longitude),
                () => executePanic(undefined, undefined), // fire panic even without location
                { timeout: 5000, maximumAge: 0 }
            );
        } else {
            executePanic(undefined, undefined);
        }
    };


    return (
        <div className="min-h-screen bg-muted dark:bg-background border-t-8 border-red-500">
            <AppHeader />

            <main className="max-w-3xl mx-auto px-4 py-8">

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Safety Center</h1>
                    <p className="text-muted-foreground dark:text-muted-foreground mt-2 max-w-lg mx-auto">
                        Your safety is our absolute priority. Manage emergency contacts, start tracked walks, and trigger panic alerts.
                    </p>
                </div>

                <div className="space-y-6">

                    {/* PANIC BUTTON */}
                    <Card className="border-red-500 shadow-red-500/10 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-bl-full opacity-10 filter blur-xl" />

                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-600">
                                <BellRing className="w-6 h-6" />
                                Emergency Panic Button
                            </CardTitle>
                            <CardDescription>
                                Pressing this instantly sends your live location and an emergency SOS message to all your trusted contacts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center py-6">
                            <Button
                                size="lg"
                                variant="destructive"
                                className={`w-48 h-48 rounded-full shadow-2xl transition-all duration-300 ${isPanicking ? 'scale-95 bg-red-800' : 'hover:scale-105 bg-red-600 hover:bg-red-700'
                                    }`}
                                onClick={handlePanic}
                                disabled={isPanicking}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Crosshair className={`w-12 h-12 ${isPanicking ? 'animate-spin text-red-400' : 'text-white'}`} />
                                    <span className="font-black text-2xl tracking-widest text-white">
                                        {isPanicking ? 'SENDING' : 'PANIC'}
                                    </span>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* SAFE WALK */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                <Navigation className="w-5 h-5" />
                                Safe Walk Home
                            </CardTitle>
                            <CardDescription>
                                Share your walking path securely. Your location is tracked in the background until you safely arrive and end the walk.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="destination">Where are you going?</Label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="destination"
                                            placeholder="e.g. Home, Nearest Subway Station..."
                                            value={destination}
                                            onChange={(e) => setDestination(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                        onClick={handleStartWalk}
                                        disabled={isStartingWalk || !destination}
                                    >
                                        Start Walk
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* EMERGENCY CONTACTS */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Trusted Emergency Contacts
                            </CardTitle>
                            <CardDescription>
                                These contacts receive an SMS/Email instantly if you trigger the Panic Button. They DO NOT need a fwber account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Add New Contact Form */}
                            <div className="bg-muted dark:bg-background dark:bg-card p-4 rounded-lg flex flex-col sm:flex-row gap-3 items-end border border-border dark:border-border">
                                <div className="space-y-1 w-full flex-1">
                                    <Label className="text-xs">Contact Name</Label>
                                    <Input
                                        placeholder="e.g. Mom"
                                        value={newContactName}
                                        onChange={(e) => setNewContactName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1 w-full flex-1">
                                    <Label className="text-xs">Phone Number</Label>
                                    <Input
                                        placeholder="+1 555-0100"
                                        type="tel"
                                        value={newContactPhone}
                                        onChange={(e) => setNewContactPhone(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleAddContact} disabled={isAddingContact} className="w-full sm:w-auto">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            </div>

                            {/* Contacts List */}
                            <div className="space-y-3">
                                {isLoadingContacts ? (
                                    <p className="text-center text-sm text-muted-foreground py-4">Loading contacts...</p>
                                ) : contacts.length === 0 ? (
                                    <div className="text-center p-6 border-2 border-dashed border-border dark:border-border dark:border-gray-800 rounded-lg">
                                        <p className="text-muted-foreground dark:text-muted-foreground">No emergency contacts set up yet. Please add one for your safety.</p>
                                    </div>
                                ) : (
                                    contacts.map(contact => (
                                        <div key={contact.id} className="flex items-center justify-between p-3 border border-border dark:border-border rounded-lg bg-card dark:bg-background">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-foreground dark:text-foreground">{contact.name}</p>
                                                    {contact.is_primary && (
                                                        <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                            Primary
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground font-mono">{contact.phone}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteContact(contact.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>

                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}
