import React, { useState, useRef, useEffect } from 'react';
import { Agent, Message } from '@/types';
import { Send, Bot, User, Sparkles, Book, Trash2, Users, UserPlus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeModal } from '@/components/KnowledgeModal';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { AnimatedAIChat } from '@/components/ui/animated-ai-chat';

interface ChatInterfaceProps {
    agent: Agent;
    onOpenConnections?: () => void;
    onOpenMyAgent?: () => void;
    onFindPeople?: () => void;
}

export function ChatInterface({ agent, onOpenConnections, onOpenMyAgent, onFindPeople }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    // Unique storage key per agent
    const storageKey = `chat_history_${agent.id}`;

    useEffect(() => {
        // Load chat history from localStorage on mount/agent change
        const savedHistory = localStorage.getItem(storageKey);

        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                // Update the system message if name/description changed
                if (parsed.length > 0 && parsed[0].role === 'system') {
                    parsed[0].parts[0].text = `Connected to ${agent.name}\n${agent.description}`;
                }
                setMessages(parsed);
            } catch (e) {
                console.error("Failed to parse chat history");
                setMessages([{
                    role: 'system',
                    parts: [{ text: `Connected to ${agent.name}\n${agent.description}` }],
                    timestamp: new Date().toISOString()
                }]);
            }
        } else {
            // First time connecting
            setMessages([{
                role: 'system',
                parts: [{ text: `Connected to ${agent.name}\n${agent.description}` }],
                timestamp: new Date().toISOString()
            }]);
        }
        setInput('');
    }, [agent.id, storageKey, agent.name, agent.description]);

    // Save chat history whenever messages array changes
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(messages));
        }
    }, [messages, storageKey]);

    const clearHistory = () => {
        if (window.confirm("Are you sure you want to clear this chat history?")) {
            localStorage.removeItem(storageKey);
            setMessages([{
                role: 'system',
                parts: [{ text: `Connected to ${agent.name}\n${agent.description}` }],
                timestamp: new Date().toISOString()
            }]);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const sendMessage = async (overrideText?: string) => {
        const textToSend = overrideText || input;
        if (!textToSend.trim() || isLoading) return;

        const userMsg: Message = {
            role: 'user',
            parts: [{ text: textToSend }],
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            // Get Supabase Session Token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Determine backend URL (fallback to local if agent.url is just an ID or path)
            // For FastAPI backend we expect /api/agents/{agent_id}/chat
            const apiUrl = agent.url.includes('http') ? agent.url : `${API_BASE}/api/agents/${agent.id}/chat`;

            // Updated payload to match new FastAPI Schema (ChatRequest)
            const payload = {
                message: userMsg.parts[0].text,
                session_id: "chat-ui-" + agent.id
            };

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (res.status === 401) {
                router.push('/login');
                return;
            }

            if (res.status === 403) {
                throw new Error("Unauthorized access. This agent does not belong to you.");
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.detail || `HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            if (data.reply) {
                setMessages(prev => [...prev, {
                    role: 'agent',
                    parts: [{ text: data.reply }],
                    timestamp: new Date().toISOString()
                }]);
            } else {
                throw new Error("Invalid response format from server");
            }

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setMessages(prev => [...prev, {
                role: 'system',
                parts: [{ text: `Error: ${errorMessage}` }],
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-black/90 overflow-hidden relative backdrop-blur-3xl">
            {/* Background Orbs */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full mix-blend-screen filter blur-[128px] animate-pulse delay-700" />
                <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-[96px] animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner overflow-hidden shadow-lg">
                        {agent.avatarUrl ? (
                            <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                        ) : (
                            <Bot className="w-6 h-6 text-white/80" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-white/90">{agent.name}</h3>
                        <div className="flex items-center gap-1.5 opacity-80">
                            <span className="block w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                            <p className="text-xs text-white/60 font-medium">Active</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={clearHistory}
                        className="p-2 hover:bg-red-500/20 rounded-xl transition-all text-white/50 hover:text-red-400 flex items-center gap-2 text-sm font-medium hover:scale-105 active:scale-95"
                        title="Clear Chat History"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <KnowledgeModal
                isOpen={isKnowledgeOpen}
                onClose={() => setIsKnowledgeOpen(false)}
                agent={agent}
            />

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 z-10 relative">
                {messages.length <= 1 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none opacity-50">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/10">
                            <Sparkles className="w-10 h-10 text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-light text-white mb-3">How can I help today?</h2>
                        <p className="text-sm text-white/40 max-w-md">
                            I'm {agent.name}, your intelligent assistant. Use the command palette or type a message to get started.
                        </p>
                    </div>
                )}
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            className={cn(
                                "flex gap-3 max-w-[85%] relative z-10",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold shadow-lg mt-1",
                                msg.role === 'user' ? "bg-white/10 text-white border-white/20 backdrop-blur-md" :
                                    msg.role === 'system' ? "bg-amber-500/10 text-amber-400 border-amber-500/20 backdrop-blur-md" :
                                        "bg-black/40 text-blue-400 border-white/10 backdrop-blur-md overflow-hidden p-0"
                            )}>
                                {msg.role === 'user' ? <User className="w-5 h-5 text-white/70" /> :
                                    msg.role === 'system' ? <Sparkles className="w-5 h-5" /> :
                                        agent.avatarUrl ? <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" /> :
                                            <Bot className="w-5 h-5 text-white/70" />}
                            </div>

                            <div className="flex flex-col gap-1.5 min-w-0">
                                <div className={cn(
                                    "px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-xl break-words backdrop-blur-md border",
                                    msg.role === 'user' ? "bg-blue-600/30 text-white/90 border-blue-500/30 rounded-tr-sm" :
                                        msg.role === 'system' ? "bg-amber-500/10 text-amber-200/90 border-amber-500/20 text-center w-full" :
                                            "bg-white/5 border-white/10 text-white/90 rounded-tl-sm"
                                )}>
                                    {msg.parts[0].text}
                                </div>
                                {msg.timestamp && (
                                    <span className={cn(
                                        "text-[10px] text-muted-foreground opacity-70",
                                        msg.role === 'user' ? "text-right" : "text-left"
                                    )}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            className="flex gap-3 mr-auto relative z-10"
                        >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold shadow-lg mt-1 bg-black/40 text-blue-400 border-white/10 backdrop-blur-md overflow-hidden p-0">
                                {agent.avatarUrl ? <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-white/70" />}
                            </div>
                            <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-white/90 shadow-xl flex items-center gap-2 backdrop-blur-md">
                                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-0" />
                                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-150" />
                                <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-300" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="z-20 bg-transparent flex flex-col pt-2 bg-gradient-to-t from-black/80 to-transparent">
                {/* Horizontal Action Bar */}
                <div className="flex items-center justify-center gap-2 px-4 pb-2 w-full max-w-2xl mx-auto overflow-x-auto no-scrollbar scroll-smooth">
                    <button
                        onClick={onFindPeople}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-full text-sm text-white/70 hover:text-white transition-all whitespace-nowrap active:scale-95"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Find People</span>
                    </button>
                    <button
                        onClick={onOpenConnections}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-full text-sm text-white/70 hover:text-white transition-all whitespace-nowrap active:scale-95"
                    >
                        <Users className="w-4 h-4" />
                        <span>Connections</span>
                    </button>
                    <button
                        onClick={onOpenMyAgent}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-full text-sm text-white/70 hover:text-white transition-all whitespace-nowrap active:scale-95"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Agent Settings</span>
                    </button>
                    <button
                        onClick={() => setIsKnowledgeOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-full text-sm text-white/70 hover:text-white transition-all whitespace-nowrap active:scale-95"
                    >
                        <Book className="w-4 h-4" />
                        <span>Knowledge</span>
                    </button>
                </div>

                <div className="mb-[-80px] w-full max-w-4xl mx-auto">
                    <AnimatedAIChat
                        agentName={agent.name}
                        isTyping={isLoading}
                        onSendMessage={(text: string) => {
                            setInput(text);
                            sendMessage(text);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
