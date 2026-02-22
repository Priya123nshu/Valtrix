"use client";

import { AnimatedAIChat } from "@/components/ui/animated-ai-chat"
import { useState } from "react";

export function Demo() {
    const [isTyping, setIsTyping] = useState(false);

    const handleSendMessage = (text: string) => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
    };

    return (
        <div className="flex w-screen overflow-x-hidden">
            <AnimatedAIChat
                agentName="Demo Agent"
                isTyping={isTyping}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
}
