"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, personalAgentId, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Only redirect context is fully loaded
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Show loading spinner while AuthContext is stabilizing or fetching
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    // Don't render protected content until we have the user AND the profile AND the personalAgentId are finished loading
    // Since loading=false means we've tried to fetch them, we can proceed. If they are missing, the context handles logging.
    if (!user) {
        return null; // Will redirect in useEffect
    }

    // Wait until profile and personalAgentId are ready before rendering children (as per user req #3)
    if (!profile || !personalAgentId) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 space-y-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-gray-500 text-sm">Loading user profile and personal agent...</p>
            </div>
        );
    }

    return <>{children}</>;
}
