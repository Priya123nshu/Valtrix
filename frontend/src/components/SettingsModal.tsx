import React, { useState, useEffect } from 'react';
import { X, Globe, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { API_BASE } from '@/lib/api';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { personalAgentId } = useAuth();

    const [agentName, setAgentName] = useState('');
    const [headline, setHeadline] = useState('');
    const [bio, setBio] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (isOpen && personalAgentId) {
            loadAgentProfile();
        }
    }, [isOpen, personalAgentId]);

    const loadAgentProfile = async () => {
        setIsLoading(true);
        try {
            // Fetch minimal data from personal_agents, and join with users table to get the current name
            const { data, error } = await supabase
                .from('personal_agents')
                .select(`
                    headline, 
                    bio, 
                    is_public,
                    avatar_url,
                    users!inner(name)
                `)
                .eq('id', personalAgentId)
                .single();

            if (error) throw error;
            if (data) {
                const userName = Array.isArray(data.users)
                    ? data.users[0]?.name
                    : (data.users as any)?.name;

                setAgentName(userName || '');
                setHeadline(data.headline || '');
                setBio(data.bio || '');
                setIsPublic(data.is_public !== false); // Defaults true
                setAvatarUrl(data.avatar_url || null);
            }
        } catch (error) {
            console.error("Error loading agent profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${personalAgentId}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            setIsUploading(true);
            setStatus({ type: 'success', message: 'Uploading image...' });

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            setAvatarUrl(data.publicUrl);
            setStatus({ type: 'success', message: 'Avatar uploaded! Click Save Config.' });
        } catch (error: any) {
            setStatus({ type: 'error', message: `Upload failed: ${error.message}` });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!personalAgentId) return;

        setIsSaving(true);
        setStatus(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE}/api/agents/${personalAgentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    agent_name: agentName.trim() || null,
                    headline: headline.trim() || null,
                    bio: bio.trim() || null,
                    is_public: isPublic,
                    avatar_url: avatarUrl
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.detail || 'Failed to update agent.');
            }

            setStatus({ type: 'success', message: 'Agent settings saved successfully!' });
            setTimeout(() => {
                onClose();
            }, 1000);

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Agent Settings</h2>
                            <p className="text-sm text-muted-foreground">Manage public directory profile</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-12 flex justify-center text-muted-foreground">
                        <span className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                                <div>
                                    <label className="text-sm font-medium text-foreground">Public Directory</label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Allow other users to discover and chat with your agent.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>

                            <div className="flex flex-col items-center gap-4 pb-4">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-muted/50 border-2 border-border flex items-center justify-center relative">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <Globe className="w-10 h-10 text-muted-foreground opacity-50" />
                                        )}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                    <label className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 ${!isUploading ? 'group-hover:opacity-100 cursor-pointer' : ''} transition-opacity`}>
                                        <span className="text-xs font-semibold">{isUploading ? '...' : 'Upload'}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            disabled={isUploading}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">Click the circle to upload a profile picture.<br />Square images work best.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Agent Name</label>
                                <input
                                    type="text"
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                    placeholder="Your Name (e.g. John Doe)"
                                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <p className="text-xs text-muted-foreground">This is the public name for your agent.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Headline</label>
                                <input
                                    type="text"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    placeholder="e.g. Senior Frontend Engineer | React & Next.js"
                                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <p className="text-xs text-muted-foreground">Appears below your name in the directory.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Bio</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Brief background about yourself..."
                                    rows={4}
                                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
                                />
                            </div>
                        </div>

                        {status && (
                            <div className={`text-sm p-3 rounded-lg border ${status.type === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                {status.message}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

