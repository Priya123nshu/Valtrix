'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Agent } from '@/types';
import { ArrowLeft, UserPlus, Check, Clock, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

function DiscoverContent() {
    const { personalAgentId } = useAuth();
    const router = useRouter();

    const [publicAgents, setPublicAgents] = useState<Agent[]>([]);
    const [connections, setConnections] = useState<any>({
        accepted: [],
        pending_incoming: [],
        pending_outbound_ids: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!personalAgentId) return;
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Fetch ALL public agents
            const publicRes = await fetch(`${API_BASE}/api/agents/public`);
            if (!publicRes.ok) throw new Error("Failed to fetch public agents");
            const publicJson = await publicRes.json();

            const agentsList = publicJson.data
                .filter((a: any) => a.id !== personalAgentId) // Filter out self
                .map((a: any) => ({
                    id: a.id,
                    name: a.users?.name || "Unknown User",
                    description: a.headline || a.users?.role_type || "Professional",
                    url: `${API_BASE}/api/agents/${a.id}/chat`
                }));
            setPublicAgents(agentsList);

            // Fetch my connections
            const connRes = await fetch(`${API_BASE}/api/agents/${personalAgentId}/connections`, {
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            });
            if (connRes.ok) {
                const connJson = await connRes.json();
                setConnections(connJson.data);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [personalAgentId]);

    const handleConnect = async (targetAgentId: string) => {
        if (!personalAgentId) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const payload = { target_agent_id: targetAgentId };
            const res = await fetch(`${API_BASE}/api/agents/${personalAgentId}/connections/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Optimistically update
                setConnections((prev: any) => ({
                    ...prev,
                    pending_outbound_ids: [...prev.pending_outbound_ids, targetAgentId]
                }));
            }
        } catch (error) {
            console.error("Failed to send request", error);
        }
    };

    const getButtonState = (agentId: string) => {
        const isAccepted = connections.accepted.some((a: any) => a.agent_id === agentId);
        if (isAccepted) return "connected";

        if (connections.pending_outbound_ids.includes(agentId)) {
            return "sent";
        }

        const isIncoming = connections.pending_incoming.some((a: any) => a.agent_id === agentId);
        if (isIncoming) return "incoming";

        return "none";
    };

    return (
        <main className="min-h-screen bg-background text-foreground overflow-y-auto">
            {/* Navbar area */}
            <div className="sticky top-0 z-10 p-4 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => router.push('/chat')}
                        className="p-2 hover:bg-muted rounded-full transition-colors group flex items-center justify-center shrink-0"
                        title="Back to Chat"
                    >
                        <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Discover Agents</h1>
                        <p className="text-sm text-muted-foreground">Find public AI representatives and expand your network.</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-6 md:p-8">
                {!personalAgentId ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-20">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-100">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h3 className="font-medium text-foreground mb-1">Personal Agent Missing</h3>
                        <p className="text-sm max-w-xs text-center text-red-500/80">Configure your personal agent to start connecting with others.</p>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-card w-full h-40 rounded-2xl border border-border" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-red-500 p-4 bg-red-500/10 rounded-lg">{error}</div>
                ) : publicAgents.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>No public agents found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {publicAgents.map(agent => {
                            const status = getButtonState(agent.id);

                            return (
                                <div key={agent.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all group flex flex-col justify-between h-48">
                                    <div>
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-3">
                                            {agent.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <h3 className="font-semibold text-foreground text-sm line-clamp-1">{agent.name}</h3>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
                                    </div>

                                    <div className="mt-4">
                                        {status === "none" && (
                                            <button
                                                onClick={() => handleConnect(agent.id)}
                                                className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" /> Connect
                                            </button>
                                        )}
                                        {status === "sent" && (
                                            <div className="w-full py-2 bg-muted text-muted-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-2">
                                                <Clock className="w-3.5 h-3.5" /> Request Sent
                                            </div>
                                        )}
                                        {status === "incoming" && (
                                            <div className="w-full py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2">
                                                Accept in Chat
                                            </div>
                                        )}
                                        {status === "connected" && (
                                            <div className="w-full py-2 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2">
                                                <Check className="w-3.5 h-3.5" /> Connected
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function DiscoverPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <AuthGuard>
                <DiscoverContent />
            </AuthGuard>
        </Suspense>
    );
}
