export interface Agent {
    id: string;
    name: string;
    description: string;
    url: string;
    role?: string;
    status?: 'online' | 'offline' | 'busy';
}

export interface MessagePart {
    text: string;
}

export interface Message {
    role: 'user' | 'agent' | 'system';
    parts: MessagePart[];
    timestamp?: string;
}

export interface AgentCardProps {
    agent: Agent;
    isActive: boolean;
    onClick: () => void;
}

export interface CreateAgentPayload {
    name: string;
    description: string;
    role: string;
}
