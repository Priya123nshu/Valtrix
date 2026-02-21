"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Profile = {
    id: string;
    email: string;
    name: string;
    role_type: string;
    is_verified_recruiter: boolean;
    created_at: string;
};

type AuthContextType = {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    personalAgentId: string | null;
    agentHeadline: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [personalAgentId, setPersonalAgentId] = useState<string | null>(null);
    const [agentHeadline, setAgentHeadline] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetchUserData(currentSession: Session | null) {
            try {
                if (!currentSession?.user) {
                    if (mounted) {
                        setUser(null);
                        setSession(null);
                        setProfile(null);
                        setPersonalAgentId(null);
                        setAgentHeadline(null);
                        setLoading(false);
                    }
                    return;
                }

                if (mounted) {
                    setUser(currentSession.user);
                    setSession(currentSession);
                    setLoading(true);
                }

                // Fetch profile and personal_agent in parallel
                let [profileRes, agentRes] = await Promise.all([
                    supabase
                        .from('users')
                        .select('*')
                        .eq('id', currentSession.user.id)
                        .maybeSingle(), // Use maybeSingle to prevent crashing if user deleted the row
                    supabase
                        .from('personal_agents')
                        .select('id, headline')
                        .eq('user_id', currentSession.user.id)
                        .maybeSingle() // Use maybeSingle as the user might not have one yet
                ]);

                // Auto-initialization for new signups
                if (mounted && (!profileRes.data || !agentRes.data)) {
                    const metadata = currentSession.user.user_metadata || {};
                    const token = currentSession.access_token;

                    try {
                        const initRes = await fetch('http://localhost:8001/api/auth/initialize', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                name: metadata.name || "Unknown User",
                                headline: metadata.headline || "Professional"
                            })
                        });

                        if (initRes.ok) {
                            // Re-fetch the data after successful initialization
                            const [newProfileRes, newAgentRes] = await Promise.all([
                                supabase.from('users').select('*').eq('id', currentSession.user.id).maybeSingle(),
                                supabase.from('personal_agents').select('id, headline').eq('user_id', currentSession.user.id).maybeSingle()
                            ]);
                            profileRes = newProfileRes;
                            agentRes = newAgentRes;
                        } else {
                            console.warn("Backend initialization returned an error:", await initRes.text());
                        }
                    } catch (err) {
                        console.error("Failed to call backend initialization:", err);
                    }
                }

                if (mounted) {
                    if (profileRes.error) {
                        console.warn("Notice: Missing user profile:", profileRes.error.message);
                        setProfile(null);
                    } else {
                        setProfile(profileRes.data as Profile);
                    }

                    if (agentRes.error) {
                        console.warn("Notice: Missing personal agent:", agentRes.error.message);
                        setPersonalAgentId(null);
                        setAgentHeadline(null);
                    } else if (!agentRes.data) {
                        console.warn(`Notice: No personal agent found for user ID: ${currentSession.user.id}`);
                        setPersonalAgentId(null);
                        setAgentHeadline(null);
                    } else {
                        setPersonalAgentId(agentRes.data.id);
                        setAgentHeadline(agentRes.data.headline || null);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        // Initialize auth state
        supabase.auth.getSession().then(({ data: { session: initSession } }) => {
            fetchUserData(initSession);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, changedSession) => {
                fetchUserData(changedSession);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, personalAgentId, agentHeadline, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
