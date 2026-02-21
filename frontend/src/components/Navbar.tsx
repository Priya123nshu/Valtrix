"use client";

import Link from "next/link";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Navbar() {
    const { user, profile, signOut } = useAuth();

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-black/50 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center">
                        <Link href="/" className="flex-shrink-0">
                            <span className="text-2xl font-bold tracking-widest text-white uppercase">
                                VALTRIX
                            </span>
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <div className="flex items-center space-x-6">
                            {user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm font-medium text-zinc-300">
                                        {profile?.name || user.email}
                                    </span>
                                    <button
                                        onClick={signOut}
                                        className="flex items-center px-4 py-2 border border-white/10 text-sm font-medium rounded-lg text-white bg-white/5 hover:bg-white/10 transition-all duration-200"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition-all duration-200 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                >
                                    <User className="w-4 h-4 mr-2" />
                                    Access System
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
