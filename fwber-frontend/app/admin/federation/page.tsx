'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ShieldAlert, Globe, Server, AlertTriangle } from 'lucide-react'
import { toast } from 'react-toastify'

interface Peer {
    id: string
    domain: string
    software: string
    is_blocked: boolean
    discovered_at: string
}

export default function AdminFederationPage() {
    const [peers, setPeers] = useState<Peer[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadPeers = async () => {
        try {
            const data = await api.get<{ peers: Peer[] }>('/federation/admin/peers')
            setPeers(data.peers || [])
        } catch (err: any) {
            toast.error('Failed to load federation peers')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void loadPeers()
    }, [])

    const toggleBlock = async (peer: Peer) => {
        try {
            const res = await api.post<{ success: boolean, is_blocked: boolean }>(`/federation/admin/peers/${peer.id}/toggle-block`)
            if (res.success) {
                setPeers(current => current.map(p => p.id === peer.id ? { ...p, is_blocked: res.is_blocked } : p))
                toast.success(`${peer.domain} is now ${res.is_blocked ? 'blocked' : 'unblocked'}`)
            }
        } catch (err: any) {
            toast.error('Failed to toggle block status')
        }
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-muted dark:bg-background">
                <AppHeader title="Federation Management" />
                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Federation Management</h1>
                            <p className="mt-2 text-muted-foreground dark:text-muted-foreground">Monitor and control interactions with remote ActivityPub servers.</p>
                        </div>
                        <Globe className="h-12 w-12 text-blue-500 opacity-20" />
                    </div>

                    <Card className="bg-card dark:bg-background border-border dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-blue-500" />
                                Discovered Peers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="py-8 text-center text-muted-foreground">Scanning the fediverse...</div>
                            ) : peers.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    <Globe className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                                    No external peers discovered yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b dark:border-gray-800">
                                                <th className="py-3 font-medium text-muted-foreground">Domain</th>
                                                <th className="py-3 font-medium text-muted-foreground">Software</th>
                                                <th className="py-3 font-medium text-muted-foreground">Status</th>
                                                <th className="py-3 font-medium text-muted-foreground">Discovered</th>
                                                <th className="py-3 text-right font-medium text-muted-foreground">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {peers.map((peer) => (
                                                <tr key={peer.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                    <td className="py-4 font-mono text-sm">{peer.domain}</td>
                                                    <td className="py-4 text-sm text-muted-foreground dark:text-muted-foreground">{peer.software}</td>
                                                    <td className="py-4">
                                                        {peer.is_blocked ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                                                                <ShieldAlert className="h-3 w-3" />
                                                                Blocked
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                                                <Shield className="h-3 w-3" />
                                                                Active
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 text-xs text-muted-foreground">
                                                        {new Date(peer.discovered_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant={peer.is_blocked ? 'outline' : 'destructive'}
                                                            onClick={() => toggleBlock(peer)}
                                                            className="h-8"
                                                        >
                                                            {peer.is_blocked ? 'Unblock Domain' : 'Block Domain'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30">
                            <CardHeader>
                                <CardTitle className="text-amber-800 dark:text-amber-400 flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5" />
                                    Federation Policy
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-amber-700 dark:text-amber-300">
                                Blocking a domain prevents any inbound activities from that server and stops local users from following actors on that node. This is a system-wide safety measure.
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    )
}
