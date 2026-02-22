'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Agent } from '@/types';
import { AgentList } from '@/components/AgentList';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsModal } from '@/components/SettingsModal';
import { ConnectionsModal } from '@/components/ConnectionsModal';
import { ShieldAlert, MessageSquare } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

function ChatContent() {
  const { personalAgentId, profile, agentHeadline, agentAvatarUrl } = useAuth();

  const myAgent: Agent | null = React.useMemo(() => {
    return (personalAgentId && profile) ? {
      id: personalAgentId,
      name: profile.name,
      description: agentHeadline || "Your personalized AI assistant.",
      url: `${API_BASE}/api/agents/${personalAgentId}/chat`,
      avatarUrl: agentAvatarUrl || undefined
    } : null;
  }, [personalAgentId, profile, agentHeadline, agentAvatarUrl]);

  const [connectedAgents, setConnectedAgents] = useState<Agent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Auto-select myAgent on load if no agent is selected
  useEffect(() => {
    if (!currentAgent && myAgent) {
      setCurrentAgent(myAgent);
    }
  }, [currentAgent, myAgent]);

  const fetchConnections = async () => {
    if (!personalAgentId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Fetch Connections securely
      const res = await fetch(`${API_BASE}/api/agents/${personalAgentId}/connections`, {
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
          url: `${API_BASE}/api/agents/${conn.agent_id}/chat`,
          avatarUrl: conn.avatar_url
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

      const res = await fetch(`${API_BASE}/api/agents/${personalAgentId}/connections/${connectionId}/accept`, {
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
    <main className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <div className="flex-1 relative flex flex-col h-full bg-background w-full">
        {!personalAgentId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground w-full">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-100">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Personal Agent Missing</h3>
            <p className="text-sm max-w-xs text-center text-red-500/80">No personal agent was found for your account. Please contact support.</p>
          </div>
        ) : currentAgent ? (
          <div className="h-full flex flex-col w-full">
            <ChatInterface
              agent={currentAgent}
              onOpenConnections={() => setIsConnectionsOpen(true)}
              onOpenMyAgent={() => setIsSettingsOpen(true)}
              onFindPeople={() => router.push('/discover')}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground w-full">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 opacity-20" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Select a Connection</h3>
            <p className="text-sm max-w-xs text-center">Open your connections menu to choose an agent.</p>
            <button
              onClick={() => setIsConnectionsOpen(true)}
              className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View Connections
            </button>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ConnectionsModal
        isOpen={isConnectionsOpen}
        onClose={() => setIsConnectionsOpen(false)}
        myAgent={myAgent}
        connectedAgents={connectedAgents}
        pendingRequests={pendingRequests}
        currentAgent={currentAgent}
        onSelectAgent={setCurrentAgent}
        onAcceptRequest={handleAcceptRequest}
        onOpenSettings={() => {
          setIsConnectionsOpen(false);
          setIsSettingsOpen(true);
        }}
        loading={loading}
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
