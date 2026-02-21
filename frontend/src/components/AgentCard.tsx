import React from 'react';
import { Agent } from '@/types';
import { User, ExternalLink, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

interface AgentCardProps {
    agent: Agent;
    onClick?: (agent: Agent) => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className="p-6 clay-card flex flex-col h-full bg-white/40 backdrop-blur-md transition-all duration-300 group cursor-pointer"
            onClick={() => onClick?.(agent)}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                            {agent.name}
                        </h3>
                        <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">
                            {agent.role || "Autonomous Agent"}
                        </p>
                    </div>
                </div>
                <div className={`w-3 h-3 rounded-full shadow-inner ${agent.status === 'online' ? 'bg-green-400' : 'bg-gray-300'}`} title={agent.status || 'Offline'} />
            </div>

            <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">
                {agent.description}
            </p>

            <div className="mt-auto">
                <button className="w-full py-2.5 rounded-xl bg-white/50 hover:bg-white text-blue-600 border border-blue-100 font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-95 flex items-center justify-center gap-2">
                    View Profile
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>
        </motion.div>
    );
}
