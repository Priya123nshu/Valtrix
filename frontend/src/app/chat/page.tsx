'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Agent } from '@/types';
import { AgentList } from '@/components/AgentList';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsModal } from '@/components/SettingsModal';
import { Command, MessageSquare, ShieldAlert, Settings, Users, Check, X, Compass } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

function ChatContent() {
  const { personalAgentId, profile, agentHeadline } = useAuth();
  const [myAgent, setMyAgent] = useState<Agent | null>(null);
  const [connectedAgents, setConnectedAgents] = useState<Agent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchConnections = async () => {
    if (!personalAgentId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Set My Agent
      const pAgent = {
        id: personalAgentId,
        name: profile?.name || "My Agent",
        description: agentHeadline || "Your personalized AI assistant.",
        url: `http://localhost:8001/api/agents/${personalAgentId}/chat`
      };
      setMyAgent(pAgent);
      if (!currentAgent) setCurrentAgent(pAgent); // Only set if not already set

      // 2. Fetch Connections securely
      const res = await fetch(`http://localhost:8001/api/agents/${personalAgentId}/connections`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const json = await res.json();

        // Map Accepted connections to Agent[]
        const acceptedList: Agent[] = json.data.accepted.map((conn: any) => ({
          id: conn.agent_id,
          name: conn.agent_name || "Unknown User",
          description: conn.headline || "Professional",
          url: `http://localhost:8001/api/agents/${conn.agent_id}/chat`
        }));

        setConnectedAgents(acceptedList);
        setPendingRequests(json.data.pending_incoming);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [personalAgentId]);

  const handleAcceptRequest = async (connectionId: string) => {
    if (!personalAgentId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`http://localhost:8001/api/agents/${personalAgentId}/connections/${connectionId}/accept`, {
        method: 'PATCH',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        // Refresh the lists
        fetchConnections();
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
    }
  };

  return (
    <main className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex flex-col border-r border-border bg-muted/20">
        <div className="p-4 border-b border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Command className="w-4 h-4" />
              </div>
              <h1 className="font-semibold text-sm tracking-tight text-foreground">Agent Network</h1>
            </div>
            <button
              onClick={() => router.push('/discover')}
              title="Discover Agents"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Compass className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => router.push('/discover')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-card border border-border rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Users className="w-4 h-4" />
            Find People to Connect With
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {myAgent && (
            <div>
              <div className="px-2 pb-1 mt-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Agent</h2>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                  title="Settings">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
              <AgentList
                agents={[myAgent]}
                currentAgent={currentAgent}
                onSelectAgent={setCurrentAgent}
                loading={loading}
              />
            </div>
          )}

          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && (
            <div>
              <div className="px-2 pb-1 mt-2">
                <h2 className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  Pending Requests ({pendingRequests.length})
                </h2>
              </div>
              <div className="space-y-1">
                {pendingRequests.map(req => (
                  <div key={req.connection_id} className="p-3 bg-card border border-border rounded-xl text-sm flex flex-col gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">{req.agent_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{req.headline}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAcceptRequest(req.connection_id)} className="flex-1 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md flex items-center justify-center gap-1 hover:bg-primary/90 transition">
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      {/* Optional decline button visual only for now */}
                      <button className="px-2 py-1.5 bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 text-xs font-semibold rounded-md flex items-center justify-center transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connections Section */}
          <div>
            <div className="px-2 pb-1 mt-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connections</h2>
            </div>

            {connectedAgents.length > 0 ? (
              <AgentList
                agents={connectedAgents}
                currentAgent={currentAgent}
                onSelectAgent={setCurrentAgent}
                loading={loading}
              />
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground mb-3">No connections yet.</p>
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col h-full bg-background">
        {!personalAgentId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Personal Agent Missing</h3>
            <p className="text-sm max-w-xs text-center text-red-500/80">No personal agent was found for your account. Please contact support.</p>
          </div>
        ) : currentAgent ? (
          <div className="p-6 h-full flex flex-col max-w-4xl mx-auto w-full">
            <ChatInterface agent={currentAgent} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 opacity-20" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Select a Connection</h3>
            <p className="text-sm max-w-xs text-center">Choose an agent from the sidebar to start communicating.</p>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}

import AuthGuard from '@/components/AuthGuard';

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <AuthGuard>
        <ChatContent />
      </AuthGuard>
    </Suspense>
  );
}
