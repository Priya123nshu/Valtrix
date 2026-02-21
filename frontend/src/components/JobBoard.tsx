"use client";

import React, { useState, useEffect } from 'react';
import { Agent } from '@/types';
import { AgentCard } from './AgentCard';
import { Search, Filter, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function JobBoard() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Dummy data for landing page demo purposes
        const dummyAgents: Agent[] = [
            { id: "agent1", name: "DevBot Alpha", description: "Expert Full Stack Developer agent capable of building complex web apps.", url: "agent1", role: "Software Engineer", status: "online" },
            { id: "agent2", name: "CopyWriter Pro", description: "Creative writing agent for marketing copy and blog posts.", url: "agent2", role: "Content Creator", status: "busy" },
            { id: "agent3", name: "DataCruncher", description: "Data analysis expert. Python, Pandas, SQL.", url: "agent3", role: "Data Scientist", status: "online" },
            { id: "agent4", name: "DesignMate", description: "UI/UX design assistant generating Figma layouts.", url: "agent4", role: "Designer", status: "offline" },
            { id: "agent5", name: "SupportBot 3000", description: "24/7 Customer support representative.", url: "agent5", role: "Support", status: "online" },
        ];
        setAgents(dummyAgents);
        setFilteredAgents(dummyAgents);
        setLoading(false);
    }, []);

    useEffect(() => {
        const results = agents.filter(agent =>
            agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (agent.role && agent.role.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredAgents(results);
    }, [searchTerm, agents]);

    const router = useRouter();

    const handleAgentClick = (agent: Agent) => {
        // Encode agent data to pass via URL or just use ID if strictly backend driven
        // For now, we'll pass the necessary data via query params for the demo
        const params = new URLSearchParams({
            name: agent.name,
            role: agent.role || '',
            description: agent.description,
            url: agent.url
        });
        router.push(`/chat?${params.toString()}`);
    };

    return (
        <section className="py-20 bg-transparent min-h-screen" id="job-board">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4 clay-text-gradient">
                        Available Agents
                    </h2>
                    <p className="text-lg text-gray-600">
                        Browse our network of high-performance autonomous agents ready to join your team.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-12 justify-between items-center bg-white/50 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/60 clay-card">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search for skills, roles, or names..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder:text-gray-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button className="flex items-center px-4 py-3 rounded-xl bg-white/50 hover:bg-white text-gray-600 transition-colors shadow-sm">
                            <Filter className="w-5 h-5 mr-2" />
                            Filters
                        </button>
                        <select className="px-4 py-3 rounded-xl bg-white/50 hover:bg-white text-gray-600 outline-none cursor-pointer border-none shadow-sm">
                            <option>Sort by: Relevance</option>
                            <option>Sort by: Newest</option>
                            <option>Sort by: Rating</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredAgents.map((agent, index) => (
                            <motion.div
                                key={agent.url || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                                <AgentCard agent={agent} onClick={handleAgentClick} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
