import React, { useState } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateAgentPayload } from '@/types';

interface CreateAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (agent: CreateAgentPayload) => Promise<void>;
}

export function CreateAgentModal({ isOpen, onClose, onCreate }: CreateAgentModalProps) {
    const [formData, setFormData] = useState({ name: '', description: '', role: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onCreate(formData);
            onClose();
            setFormData({ name: '', description: '', role: '' });
        } catch (error) {
            console.error("Failed to create agent", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">New Agent</h2>
                        <p className="text-sm text-muted-foreground">Deploy a new AI agent to the network.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                            placeholder="e.g. Research Assistant"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                            placeholder="What does this agent do?"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">System Prompt</label>
                        <textarea
                            required
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50 leading-relaxed"
                            placeholder="You are a helpful assistant..."
                        />
                        <p className="text-xs text-muted-foreground">The initial instructions that define the agent&apos;s behavior.</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Deploying...
                                </>
                            ) : (
                                <>
                                    Deplay Agent
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
