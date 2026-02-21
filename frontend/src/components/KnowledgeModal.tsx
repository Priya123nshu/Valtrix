import React, { useState } from 'react';
import { X, Save, Search, Database } from 'lucide-react';
import { Agent } from '@/types';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

interface KnowledgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: Agent;
}

export function KnowledgeModal({ isOpen, onClose, agent }: KnowledgeModalProps) {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    if (!isOpen) return null;

    const handleAddKnowledge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        setIsSubmitting(true);
        setStatus(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = agent.url.includes('http')
                ? `${agent.url.replace('/chat', '')}/knowledge`
                : `${API_BASE}/api/agents/${agent.id}/knowledge`;

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ text })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add knowledge');

            setStatus({ type: 'success', message: `Successfully added ${data.chunks_added} chunk(s) to knowledge base.` });
            setText(''); // Clear input
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResults([]);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = agent.url.includes('http')
                ? `${agent.url.replace('/chat', '')}/knowledge?q=${encodeURIComponent(searchQuery)}`
                : `${API_BASE}/api/agents/${agent.id}/knowledge?q=${encodeURIComponent(searchQuery)}`;

            const res = await fetch(apiUrl, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const data = await res.json();
            if (data.results) {
                setSearchResults(data.results);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Knowledge Base</h2>
                            <p className="text-sm text-muted-foreground">Manage context for {agent.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Add Knowledge Section */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground uppercase tracking-wider">Add New Knowledge</h3>
                        <form onSubmit={handleAddKnowledge} className="space-y-4">
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50 resize-y"
                                placeholder="Paste documents, manuals, or facts here..."
                            />

                            <div className="flex items-center justify-between">
                                <div className="text-sm">
                                    {status && (
                                        <span className={status.type === 'success' ? "text-green-500" : "text-red-500"}>
                                            {status.message}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !text.trim()}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                                    Save to Memory
                                </button>
                            </div>
                        </form>
                    </section>

                    <div className="h-px bg-border" />

                    {/* Test Search Section */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground uppercase tracking-wider">Inspect Knowledge</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="Search to see what the agent knows..."
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                                className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="space-y-2">
                            {searchResults.length > 0 ? (
                                searchResults.map((result, i) => (
                                    <div key={i} className="p-3 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                                        {result}
                                    </div>
                                ))
                            ) : (
                                searchQuery && !isSearching && <p className="text-xs text-muted-foreground italic">No relevant knowledge found.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
