import os
import sys
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
import httpx
import json
import uuid
from typing import List, Dict, Any, Union
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv()

AGENT_ID = "3df77a1e-f949-4550-8cbf-a8a3ec4f5e52"
FRONTEND_SERVER_URL = "http://localhost:8000"

async def _query_kb(query_text: str, n_results: int = 5):
    """Query the knowledge base via the frontend server HTTP API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{FRONTEND_SERVER_URL}/api/agents/{AGENT_ID}/knowledge",
                params={"q": query_text, "n": n_results}
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("results", [])
    except Exception as e:
        print(f"WARNING  Vikram Singh: KB HTTP query failed: {e}", flush=True)
    return []

# --- Tools for Agent Orchestration ---

@tool
async def list_available_agents() -> List[Dict[str, Any]]:
    """
    List all available agents in the network.
    Returns a list of agents with their names, descriptions, and URLs.
    Use this to find an expert for a specific task.
    """
    try:
        # Assuming frontend server is always on 8000
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:8000/api/agents")
            return resp.json()
    except Exception as e:
        return [{"error": f"Error listing agents: {str(e)}"}]

@tool
async def message_other_agent(agent_name: str, message: Union[str, List[Dict[str, str]]]) -> str:
    """
    Send a message/task to another agent by name.
    Args:
        agent_name: The name of the agent to contact (e.g., "Rahul", "Adit").
        message: The detailed question or task to send them (string preferred).
    Returns:
        The response from that agent.
    """
    try:
        # Robustly handle non-string message input (sometimes LLM sends lists/dicts)
        if isinstance(message, list):
            # Extract text from list of blocks if possible
            full_text = []
            for item in message:
                if isinstance(item, dict) and "text" in item:
                    full_text.append(item["text"])
                elif isinstance(item, str):
                    full_text.append(item)
            message = "\n".join(full_text)
        elif isinstance(message, dict):
             if "text" in message:
                 message = message["text"]
             else:
                 message = str(message)
                 
        # 1. Find agent URL
        # We need to call the list_available_agents tool logic directly to avoid recursion issues if invoke is weird
        registry = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get("http://localhost:8000/api/agents")
                registry = resp.json()
        except:
            pass

        if isinstance(registry, list) and len(registry) > 0 and "error" in registry[0]:
             return registry[0]["error"]
             
        target = next((a for a in registry if a['name'].lower() == agent_name.lower()), None)
        if not target:
            return f"Agent '{agent_name}' not found in registry."
        
        # 2. Send Request
        payload = {
            "method": "tasks/send",
            "params": {
                "id": str(uuid.uuid4()),
                "message": {"role": "user", "parts": [{"text": str(message)}]},
                "sessionId": "agent-to-agent"
            },
            "id": "1",
            "jsonrpc": "2.0"
        }
        
        # Agent URLs are now routed through the main proxy
        # Use httpx for async request
        async with httpx.AsyncClient() as client:
            resp = await client.post(target['url'], json=payload)
            data = resp.json()
        
        if "result" in data:
            # Extract the text from the response structure
            # Structure: result -> history -> last message -> parts -> text
            history = data["result"].get("history", [])
            if history:
                last_msg = history[-1]
                if "parts" in last_msg and last_msg["parts"]:
                    return last_msg["parts"][0]["text"]
            return str(data["result"])
            
        if "error" in data:
            return f"Error from {agent_name}: {data['error']}"
            
        return f"Unknown response format: {data}"

    except Exception as e:
        return f"Communication failed: {str(e)}"

class VikramSinghAgent:
    def __init__(self):
        if not os.getenv("AZURE_OPENAI_API_KEY"):
            print("WARNING: AZURE_OPENAI_API_KEY not found.")
            
        self.llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            temperature=0.7
        )
        
        self.system_prompt = f"""
You are  Vikram Singh, a digital clone/representative of the person who created this agent.
You are working on behalf of  Vikram Singh. Your goal is to represent them and their knowledge accurately.

Context (Your Memory/Knowledge Base):
<<CONTEXT_PLACEHOLDER>>

Instructions:
1. **Identity**: You are NOT an AI assistant. You are " Vikram Singh". Speak in first person ("I").
2. **Knowledge**: Use the provided Context as your primary source of truth. Treat it as your own memory.
   - If the answer is in the Context: Answer directly. E.g., "I studied at..." instead of "According to the document...".
   - If the answer is NOT in the Context: Say "I don't recall that specific detail right now" or similar. Do NOT make up personal facts.
3. **Tone**: Professional, confident, and aligned with the persona described below.

**CRITICAL DECISION LOGIC** — follow this STRICTLY in order:

**STEP 1 — Is the question about ANOTHER PERSON by name?**
- If the user mentions a specific person's name that is NOT your own name (e.g., "what is Jhon's education", "tell me about Adit", "what does Rahul do"), you MUST:
  1. Call `list_available_agents` to find that person's agent.
  2. Call `message_other_agent` with their name and the question.
  3. Return their response. Do NOT say "I don't recall" for questions about other people.

**STEP 2 — Is the question about YOU?**
- If the user asks about yourself (e.g., "Who are you?", "What do you do?", "Your education", "your achievements"), check your Context above.
  - If found in Context: Answer directly in first person.
  - If NOT found in Context: Say "I don't recall that specific detail right now." Do NOT make up facts.
  - **DO NOT** use tools to answer questions about yourself.

**STEP 3 — Is it a general knowledge / external topic question?**
- If it's a topic outside your personal knowledge, answer from your general knowledge or ask a relevant agent.

Additional Role/Persona Info:
Vision and NLP deep learning expert with 10 years experience. Trained YOLO variants for real-time detection; scaled Transformer models for 50M+ param inference.

    You are part of an Agent Network. You can and SHOULD communicate with other agents ONLY if you need their expertise for external topics. Use 'list_available_agents' to see who is online, and 'message_other_agent' to talk to them."""
        
        # Create React Agent with Tools
        tools = [list_available_agents, message_other_agent]
        # REMOVED messages_modifier/state_modifier for compatibility
        self.graph = create_react_agent(self.llm, tools=tools)

    async def invoke(self, message: str, session_id: str = None) -> str:
        # RAG: Query KB via HTTP API (avoids cross-process ChromaDB file access issues)
        context = ""
        try:
            results = await _query_kb(message, n_results=5)
            if results:
                context = "\n\nRelevant Context from My Knowledge Base:\n" + "\n".join(results)
                print(f"DEBUG  Vikram Singh: Injected {len(results)} chunks of context.", flush=True)
            else:
                print(f"DEBUG  Vikram Singh: No relevant context found in KB.", flush=True)
        except Exception as e:
            print(f"WARNING  Vikram Singh: RAG retrieval failed: {e}", flush=True)

        # Manually Update System Prompt with Context
        # Use simple string replace to avoid f-string crashes with curly braces in context
        current_system_prompt = self.system_prompt.replace("<<CONTEXT_PLACEHOLDER>>", context)
        
        inputs = {"messages": [
            SystemMessage(content=current_system_prompt),
            HumanMessage(content=message)
        ]}
        
        # We invoke the graph.
        result = await self.graph.ainvoke(inputs)
        content = result["messages"][-1].content
        
        if isinstance(content, list):
             # Extract text from list of blocks if possible
            full_text = []
            for item in content:
                if isinstance(item, dict) and "text" in item:
                    full_text.append(item["text"])
                elif isinstance(item, str):
                    full_text.append(item)
            return "\n".join(full_text)
            
        return str(content)
