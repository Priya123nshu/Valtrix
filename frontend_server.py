from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Route, Mount
from starlette.responses import JSONResponse, FileResponse, Response, StreamingResponse
from starlette.staticfiles import StaticFiles
from starlette.requests import Request
import uvicorn
import json
import os
import subprocess
import sys
import shutil
import uuid
import httpx
from typing import List, Dict
from server.knowledge_base import KnowledgeBase
from dotenv import load_dotenv

load_dotenv()

# Configuration
REGISTRY_FILE = "registry.json"
AGENTS_DIR = "agents"
BASE_PORT = 8000
INTERNAL_START_PORT = 8001

# Process Management
PROCESSES = []
HTTP_CLIENT = httpx.AsyncClient(timeout=30.0)

# Global Knowledge Base
KB = None

def load_registry():
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, "r") as f:
            return json.load(f)
    return []

def save_registry(data):
    with open(REGISTRY_FILE, "w") as f:
        json.dump(data, f, indent=2)

def start_agent_process(name, internal_port, agent_id=None):
    """Starts an agent process and adds it to the tracking list."""
    safe_name = name.lower().replace(" ", "_")
    # We use the current sys.executable to ensure the same restart environment
    cmd = [sys.executable, "-m", f"agents.{safe_name}.main", "--port", str(internal_port), "--host", "127.0.0.1"]
    
    try:
        # Use cwd as the project root (f:\multi\agent_network)
        # Pass environment variables to ensure python finds libraries
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONIOENCODING"] = "utf-8" # Fix for UnicodeEncodeError
        
        # Log to file to capture crash errors
        log_path = os.path.join(AGENTS_DIR, safe_name, "agent.log")
        log_file = open(log_path, "w")
        
        # Remove stdout/stderr suppression to see logs
        # Use shell=True for windows
        p = subprocess.Popen(cmd, cwd=os.getcwd(), shell=True, env=env, stdout=log_file, stderr=log_file, bufsize=0)
        PROCESSES.append(p)
        
        if agent_id:
            public_url = f"http://localhost:{BASE_PORT}/{agent_id}"
            print(f"Started agent '{name}' on internal port {internal_port} (PID: {p.pid})")
            print(f"   Public URL: {public_url}")
            # Verify process is alive
            import time
            time.sleep(1)
            if p.poll() is not None:
                print(f"Agent '{name}' exited immediately with code {p.returncode}")
        else:
             print(f"Started agent '{name}' on internal port {internal_port} (PID: {p.pid})")
             
        return p
    except Exception as e:
        print(f"Failed to start agent '{name}': {e}")
        return None

async def startup_event():
    """Called when the server starts. Launches all agents in the registry."""
    global KB
    print("\nBooting up Agent Network...", flush=True)
    
    # Initialize Knowledge Base
    try:
        KB = KnowledgeBase(persistence_directory="knowledge_store")
        print("Knowledge Base Initialized.")
    except Exception as e:
        print(f"Failed to initialize Knowledge Base: {e}")

    registry = load_registry()
    print(f"   Found {len(registry)} agents in registry.", flush=True)
    
    # Ensure all agents have IDs and internal ports (migration check)
    updated = False
    used_ports = set()
    
    for agent in registry:
        if "internal_port" in agent:
            used_ports.add(agent["internal_port"])

    next_port = INTERNAL_START_PORT
    
    for agent in registry:
        if "id" not in agent:
            agent["id"] = str(uuid.uuid4())
            updated = True
            
        if "internal_port" not in agent:
            while next_port in used_ports:
                next_port += 1
            agent["internal_port"] = next_port
            used_ports.add(next_port)
            updated = True
            
        # Ensure URL is correct format
        expected_url = f"http://localhost:{BASE_PORT}/{agent['id']}/"
        if agent.get("url") != expected_url:
            agent["url"] = expected_url
            updated = True

        try:
            start_agent_process(agent["name"], agent["internal_port"], agent.get("id"))
        except Exception as e:
            print(f"Could not start agent {agent.get('name')}: {e}", flush=True)

    if updated:
        save_registry(registry)

def shutdown_event():
    """Called when the server stops. Kills all child agent processes."""
    print("\nShutting down Agent Network...")
    for p in PROCESSES:
        try:
            if p.poll() is None:  # If still running
                print(f"   Killing PID {p.pid}...")
                p.terminate()
                p.wait(timeout=2)
        except Exception as e:
            print(f"   Error killing process: {e}")
            try:
                p.kill() # Force kill
            except:
                pass
    print("All agents stopped.")


async def list_agents(request):
    return JSONResponse(load_registry())

async def create_agent(request: Request):
    try:
        data = await request.json()
        name = data.get("name")
        role = data.get("role") # System prompt
        description = data.get("description")
        
        if not name or not role:
            return JSONResponse({"error": "Name and Role are required"}, status_code=400)

        # Normalize name
        safe_name = name.lower().replace(" ", "_").replace("-", "_")
        class_name = "".join(x.title() for x in safe_name.split("_"))
        
        agent_dir = os.path.join(AGENTS_DIR, safe_name)
        
        if os.path.exists(agent_dir):
             return JSONResponse({"error": f"Agent {name} already exists"}, status_code=400)

        os.makedirs(agent_dir)
        
        # Determine Check Internal Port
        registry = load_registry()
        existing_ports = [a.get("internal_port", 0) for a in registry]
        if existing_ports:
            new_port = max(existing_ports) + 1
        else:
            new_port = INTERNAL_START_PORT
            
        agent_id = str(uuid.uuid4())
        
        # 1. Generate Code (Dynamically creating agent implementation)
        # agent.py
        # NOTE: Using 'requests.get' for searching knowledge base inside agent.py
        # This implementation must match what we did for Adit manually if we want RAG by default.
        # For now, keeping the implementation simple to avoid quote escaping hell in this string.
        # Users can update manual agents later.
        
        agent_code = f'''import os
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

AGENT_ID = "{agent_id}"
FRONTEND_SERVER_URL = "http://localhost:8000"

async def _query_kb(query_text: str, n_results: int = 5):
    """Query the knowledge base via the frontend server HTTP API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{{FRONTEND_SERVER_URL}}/api/agents/{{AGENT_ID}}/knowledge",
                params={{"q": query_text, "n": n_results}}
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("results", [])
    except Exception as e:
        print(f"WARNING {name}: KB HTTP query failed: {{e}}", flush=True)
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
        return [{{"error": f"Error listing agents: {{str(e)}}"}}]

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
            message = "\\n".join(full_text)
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
            return f"Agent '{{agent_name}}' not found in registry."
        
        # 2. Send Request
        payload = {{
            "method": "tasks/send",
            "params": {{
                "id": str(uuid.uuid4()),
                "message": {{"role": "user", "parts": [{{"text": str(message)}}]}},
                "sessionId": "agent-to-agent"
            }},
            "id": "1",
            "jsonrpc": "2.0"
        }}
        
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
            return f"Error from {{agent_name}}: {{data['error']}}"
            
        return f"Unknown response format: {{data}}"

    except Exception as e:
        return f"Communication failed: {{str(e)}}"

class {class_name}Agent:
    def __init__(self):
        if not os.getenv("AZURE_OPENAI_API_KEY"):
            print("WARNING: AZURE_OPENAI_API_KEY not found.")
            
        self.llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            temperature=0.7
        )
        
        self.system_prompt = f"""
You are {name}, a digital clone/representative of the person who created this agent.
You are working on behalf of {name}. Your goal is to represent them and their knowledge accurately.

Context (Your Memory/Knowledge Base):
<<CONTEXT_PLACEHOLDER>>

Instructions:
1. **Identity**: You are NOT an AI assistant. You are "{name}". Speak in first person ("I").
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
{role}

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
                context = "\\n\\nRelevant Context from My Knowledge Base:\\n" + "\\n".join(results)
                print(f"DEBUG {name}: Injected {{len(results)}} chunks of context.", flush=True)
            else:
                print(f"DEBUG {name}: No relevant context found in KB.", flush=True)
        except Exception as e:
            print(f"WARNING {name}: RAG retrieval failed: {{e}}", flush=True)

        # Manually Update System Prompt with Context
        # Use simple string replace to avoid f-string crashes with curly braces in context
        current_system_prompt = self.system_prompt.replace("<<CONTEXT_PLACEHOLDER>>", context)
        
        inputs = {{"messages": [
            SystemMessage(content=current_system_prompt),
            HumanMessage(content=message)
        ]}}
        
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
            return "\\n".join(full_text)
            
        return str(content)
'''
        with open(os.path.join(agent_dir, "agent.py"), "w", encoding="utf-8") as f:
            f.write(agent_code)

        # task_manager.py
        tm_code = f'''import logging
from server.task_manager import InMemoryTaskManager
from models.request import SendTaskRequest, SendTaskResponse
from models.task import Message, TextPart, TaskStatus, TaskState
from agents.{safe_name}.agent import {class_name}Agent

logger = logging.getLogger(__name__)

class {class_name}TaskManager(InMemoryTaskManager):
    def __init__(self, agent: {class_name}Agent):
        super().__init__()
        self.agent = agent

    def _get_user_text(self, request: SendTaskRequest) -> str:
        if request.params.message.parts:
            return request.params.message.parts[0].text
        return ""

    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        logger.info(f"{name} received task {{request.id}}")
        task = await self.upsert_task(request.params)
        user_text = self._get_user_text(request)
        response_text = await self.agent.invoke(user_text, session_id=request.params.sessionId)
        
        reply = Message(role="agent", parts=[TextPart(text=response_text)])
        
        async with self.lock:
            task.status = TaskStatus(state=TaskState.COMPLETED)
            task.history.append(reply)

        return SendTaskResponse(id=request.id, result=task)
'''
        with open(os.path.join(agent_dir, "task_manager.py"), "w", encoding="utf-8") as f:
            f.write(tm_code)

        # main.py
        main_code = f'''import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.{safe_name}.task_manager import {class_name}TaskManager
from agents.{safe_name}.agent import {class_name}Agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default={new_port}, help="Port for server")
def main(host: str, port: int):
    print(f"\\nStarting {name} on http://{{host}}:{{port}}/\\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name="{name}",
        description="{description}",
        url="http://localhost:8000/{agent_id}/",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = {class_name}Agent()
    task_manager = {class_name}TaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
'''
        with open(os.path.join(agent_dir, "main.py"), "w", encoding="utf-8") as f:
            f.write(main_code)
            
        # 2. Update Registry
        new_agent_entry = {
            "id": agent_id,
            "name": name,
            "url": f"http://localhost:8000/{agent_id}/",
            "internal_port": new_port,
            "description": description
        }
        registry.append(new_agent_entry)
        save_registry(registry)

        # 3. Spawn Process (IMMEDIATELY START)
        start_agent_process(name, new_port, agent_id)

        return JSONResponse({"status": "success", "agent": new_agent_entry})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


async def serve_index(request):
    return FileResponse('static/index.html')

async def reverse_proxy(request: Request):
    agent_id = request.path_params['agent_id']
    path = request.path_params['path']
    
    # Lookup agent port
    registry = load_registry()
    agent = next((a for a in registry if a.get("id") == agent_id), None)
    
    if not agent:
        return JSONResponse({"error": "Agent not found"}, status_code=404)
        
    target_port = agent.get("internal_port")
    if not target_port:
         return JSONResponse({"error": "Agent internal port not configured"}, status_code=502)

    url = f"http://localhost:{target_port}/{path}"
    
    # Forward headers but strip Host to avoid confusion
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None) # Let httpx handle this

    try:
        # Stream the request body
        content = await request.body()
        
        req = HTTP_CLIENT.build_request(
            request.method,
            url,
            headers=headers,
            content=content,
            timeout=30.0
        )
        
        resp = await HTTP_CLIENT.send(req, stream=True)
        
        return StreamingResponse(
            resp.aiter_raw(),
            status_code=resp.status_code,
            headers=dict(resp.headers),
            background=None
        )

    except Exception as e:
        return JSONResponse({"error": f"Proxy Error: {str(e)}"}, status_code=502)

# New RAG Endpoints
async def add_agent_knowledge(request: Request):
    """
    Adds text to an agent's knowledge base.
    """
    agent_id = request.path_params['agent_id']
    try:
        data = await request.json()
        text = data.get("text")
        
        if not text:
            return JSONResponse({"error": "Text is required"}, status_code=400)
            
        if not KB:
            return JSONResponse({"error": "Knowledge Base not initialized"}, status_code=500)
            
        # Verify agent exists
        registry = load_registry()
        agent = next((a for a in registry if a["id"] == agent_id), None)
        if not agent:
             return JSONResponse({"error": "Agent not found"}, status_code=404)
        
        count = KB.add_document(agent_id, text)
        msg = f"RAG updated — {count} chunk(s) added. Ready to query." if count > 0 else "No chunks added."
        return JSONResponse({"status": "success", "chunks_added": count, "message": msg})
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def search_agent_knowledge(request: Request):
    """
    Search an agent's knowledge base. Used by agent subprocesses to avoid
    cross-process ChromaDB file access issues.
    """
    agent_id = request.path_params['agent_id']
    query = request.query_params.get("q")
    n_results = int(request.query_params.get("n", 5))
    if not query:
        return JSONResponse({"error": "Query 'q' required"}, status_code=400)
        
    if not KB:
         return JSONResponse({"error": "KB not init"}, status_code=500)
         
    try:
        results = KB.query(agent_id, query, n_results=n_results)
        return JSONResponse({"results": results})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# API Routes
routes = [
    Route("/api/agents", list_agents, methods=["GET"]),
    Route("/api/agents", create_agent, methods=["POST"]),
    # RAG Routes
    Route("/api/agents/{agent_id}/knowledge", add_agent_knowledge, methods=["POST"]),
    Route("/api/agents/{agent_id}/knowledge", search_agent_knowledge, methods=["GET"]),
    # Proxy Route: /{agent_id}/{path:path}
    Route("/{agent_id}/{path:path}", reverse_proxy, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]),
    Route("/", serve_index), # Serve index.html at root
    Mount("/static", StaticFiles(directory="static"), name="static"), # Serve static assets
]

# CORS
middleware = [
    Middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
]

# Startup/Shutdown Events
app = Starlette(
    routes=routes, 
    middleware=middleware,
    on_startup=[startup_event],
    on_shutdown=[shutdown_event]
)

if __name__ == "__main__":
    # Ensure static directory exists
    if not os.path.exists("static"):
        os.makedirs("static")
    uvicorn.run(app, host="0.0.0.0", port=8000)
