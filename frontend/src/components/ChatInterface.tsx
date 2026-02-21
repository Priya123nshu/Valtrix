import React, { useState, useRef, useEffect } from 'react';
import { Agent, Message } from '@/types';
import { Send, Bot, User, Sparkles, Book, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeModal } from './KnowledgeModal';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ChatInterfaceProps {
    agent: Agent;
}

export function ChatInterface({ agent }: ChatInterfaceProps) {
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

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            role: 'user',
            parts: [{ text: input.trim() }],
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
        <div className="flex flex-col h-full bg-background border border-border rounded-xl shadow-sm overflow-hidden relative">

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-primary/10 text-primary`}>
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base text-foreground">{agent.name}</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="block w-2 h-2 bg-green-500 rounded-full" />
                            <p className="text-xs text-muted-foreground">Active</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={clearHistory}
                        className="p-2 hover:bg-red-500/10 rounded-md transition-colors text-muted-foreground hover:text-red-500 flex items-center gap-2 text-sm font-medium"
                        title="Clear Chat History"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsKnowledgeOpen(true)}
                        className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium"
                        title="Manage Knowledge"
                    >
                        <Book className="w-4 h-4" />
                        <span className="hidden sm:inline">Knowledge</span>
                    </button>
                </div>
            </div>

            <KnowledgeModal
                isOpen={isKnowledgeOpen}
                onClose={() => setIsKnowledgeOpen(false)}
                agent={agent}
            />

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 z-10 bg-muted/30">
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex gap-3 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold shadow-sm mt-1",
                                msg.role === 'user' ? "bg-primary text-primary-foreground border-primary" :
                                    msg.role === 'system' ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" :
                                        "bg-white text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                            )}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> :
                                    msg.role === 'system' ? <Sparkles className="w-4 h-4" /> :
                                        <span className="text-[10px]">{agent.name.substring(0, 2).toUpperCase()}</span>}
                            </div>

                            <div className="flex flex-col gap-1 min-w-0">
                                <div className={cn(
                                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm break-words",
                                    msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" :
                                        msg.role === 'system' ? "bg-amber-50 text-amber-900 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50 text-center w-full" :
                                            "bg-card border border-border text-foreground rounded-tl-sm"
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
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3 mr-auto"
                        >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-white border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 mt-1">
                                <Bot className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border text-foreground shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce delay-0" />
                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce delay-150" />
                                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce delay-300" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-4 bg-card border-t border-border z-10">
                <div className="relative flex items-end gap-2 bg-muted/50 border border-input rounded-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${agent.name}...`}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-muted-foreground resize-none max-h-32 min-h-[24px] py-1 px-2"
                        rows={1}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-px"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-2 opacity-60">
                    Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line
                </p>
            </div>
        </div>
    );
}
