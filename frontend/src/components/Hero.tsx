"use client";

import { motion } from "framer-motion";
import { SplineSceneBasic } from "./ui/demo";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="relative w-full overflow-hidden bg-[#0B0F14] pt-32 pb-20">
            {/* Subtle background grid/mesh for depth */}
            <div className="absolute inset-0 bg-[url('/grid-dark.svg')] opacity-20 bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] mix-blend-overlay pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">

                {/* LEFT COLUMN: Text Content (50-55% width) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full lg:w-[55%] flex flex-col items-start text-left"
                >
                    {/* Tagline */}
                    <span className="text-[#9CA3AF] text-sm uppercase tracking-[0.2em] font-semibold mb-6">
                        AI-Native Hiring Infrastructure
                    </span>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white mb-6 leading-[1.1]">
                        Autonomous <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#60A5FA]">Job</span> Intelligence
                    </h1>

                    {/* Supporting Paragraph */}
                    <p className="text-[#9CA3AF] text-lg md:text-xl max-w-[520px] leading-relaxed mb-6">
                        We build autonomous job agents that independently source, evaluate, and rank candidates using structured, merit-based decision logic. Designed for recruiters who want precision, speed, and unbiased evaluation at scale.
                    </p>

                    {/* Bullet Points */}
                    <ul className="space-y-3 mb-10 text-[#D1D5DB] text-base md:text-lg">
                        {[
                            "Each job becomes a decision-making AI agent",
                            "Structured skill credibility and verification",
                            "Integrated AI interviewing and coding evaluation",
                            "Transparent scoring, not black-box ranking"
                        ].map((point, i) => (
                            <li key={i} className="flex items-start">
                                <svg className="w-6 h-6 mr-3 text-[#3B82F6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button className="bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors duration-200 text-white font-medium py-3 px-8 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                            Request Early Access
                        </button>
                        <Link href="/chat" className="w-full sm:w-auto">
                            <button className="bg-white hover:bg-zinc-200 transition-colors duration-200 text-black font-medium py-3 px-8 rounded-2xl w-full">
                                Talk to your agent
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* RIGHT COLUMN: Robot Animation (45-50% width) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative w-full lg:w-[45%] max-w-[480px] lg:max-w-[560px] h-[350px] md:h-[450px] lg:h-[500px] xl:h-[600px] flex items-center justify-center shrink-0 mx-auto lg:mx-0"
                >
                    {/* Subtle spotlight glow behind robot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#2563EB]/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>

                    {/* Robot instance container */}
                    <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden z-10 border border-white/5 bg-[#0B0F14] shadow-2xl">
                        <SplineSceneBasic />
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
