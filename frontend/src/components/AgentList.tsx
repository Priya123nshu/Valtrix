import React from 'react';
import { Agent } from '@/types';
import { cn } from '@/lib/utils';
import { User, Activity, Circle } from 'lucide-react';

interface AgentListProps {
    agents: Agent[];
    currentAgent: Agent | null;
    onSelectAgent: (agent: Agent) => void;
    loading: boolean;
}

export function AgentList({ agents, currentAgent, onSelectAgent, loading }: AgentListProps) {
    if (loading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
                ))}
            </div>
        )
    }

    if (agents.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border m-4 rounded-xl bg-muted/20">
                <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active agents found.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1 p-2">
            {agents.map((agent) => (
                <button
                    key={agent.url}
                    onClick={() => onSelectAgent(agent)}
                    className={cn(
                        "flex items-start gap-3 p-3 text-left transition-all duration-200 rounded-lg group",
                        currentAgent?.url === agent.url
                            ? "bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                >
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                        currentAgent?.url === agent.url ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"
                    )}>
                        <span className="text-xs font-semibold">{agent.name.substring(0, 2).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className={cn("text-sm font-medium truncate", currentAgent?.url === agent.url && "text-primary")}>
                                {agent.name}
                            </span>
                            {currentAgent?.url === agent.url && (
                                <span className="flex h-2 w-2 rounded-full bg-green-500" />
                            )}
                        </div>
                        <p className="text-xs truncate opacity-80">
                            {agent.description}
                        </p>
                    </div>
                </button>
            ))}
        </div>
    );
}
