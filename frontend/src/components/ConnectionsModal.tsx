import React from 'react';
import { X, Users, Check, Settings } from 'lucide-react';
import { Agent } from '@/types';
import { AgentList } from '@/components/AgentList';

interface ConnectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    myAgent: Agent | null;
    connectedAgents: Agent[];
    pendingRequests: any[];
    currentAgent: Agent | null;
    onSelectAgent: (agent: Agent) => void;
    onAcceptRequest: (connectionId: string) => void;
    onOpenSettings: () => void;
    loading: boolean;
}

export function ConnectionsModal({
    isOpen,
    onClose,
    myAgent,
    connectedAgents,
    pendingRequests,
    currentAgent,
    onSelectAgent,
    onAcceptRequest,
    onOpenSettings,
    loading
}: ConnectionsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Connections</h2>
                            <p className="text-sm text-muted-foreground">Manage your agent network</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* My Agent Section */}
                    {myAgent && (
                        <div>
                            <div className="px-2 pb-2 flex items-center justify-between">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Agent</h2>
                                <button
                                    onClick={onOpenSettings}
                                    className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                                    title="Edit Profile & Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="bg-card border border-border rounded-xl overflow-hidden p-1">
                                <AgentList
                                    agents={[myAgent]}
                                    currentAgent={currentAgent}
                                    onSelectAgent={(agent) => {
                                        onSelectAgent(agent);
                                        onClose();
                                    }}
                                    loading={loading}
                                />
                            </div>
                        </div>
                    )}

                    {/* Pending Requests Section */}
                    {pendingRequests.length > 0 && (
                        <div>
                            <div className="px-2 pb-2">
                                <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                                    Pending Requests ({pendingRequests.length})
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {pendingRequests.map(req => (
                                    <div key={req.connection_id} className="p-4 bg-card border border-border rounded-xl text-sm flex flex-col gap-3">
                                        <div>
                                            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">{req.agent_name}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{req.headline}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onAcceptRequest(req.connection_id)}
                                                className="flex-1 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 hover:bg-primary/90 transition"
                                            >
                                                <Check className="w-4 h-4" /> Accept
                                            </button>
                                            <button className="px-3 py-2 bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 text-xs font-semibold rounded-md flex items-center justify-center transition">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Connections Section */}
                    <div>
                        <div className="px-2 pb-2">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Connections</h2>
                        </div>

                        {connectedAgents.length > 0 ? (
                            <div className="bg-card border border-border rounded-xl overflow-hidden p-1">
                                <AgentList
                                    agents={connectedAgents}
                                    currentAgent={currentAgent}
                                    onSelectAgent={(agent) => {
                                        onSelectAgent(agent);
                                        onClose();
                                    }}
                                    loading={loading}
                                />
                            </div>
                        ) : (
                            <div className="px-4 py-8 text-center bg-muted/20 border border-border border-dashed rounded-xl">
                                <p className="text-sm text-foreground font-medium mb-1">No connections yet</p>
                                <p className="text-xs text-muted-foreground">Go to Discover to find people to connect with.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
