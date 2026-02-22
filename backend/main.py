from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from core.schemas import ChatRequest, ChatResponse, AddKnowledgeRequest, AgentPatchRequest
from core.agent_engine import AgentEngine
from core.auth import get_current_user_id
from core.db import get_personal_agent, get_public_agents, update_personal_agent

app = FastAPI(title="Verityn Agent API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = AgentEngine()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/agents/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(
    agent_id: str, 
    request: ChatRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        # Verify agent ownership before invoking the engine
        agent_record = await get_personal_agent(agent_id)
        if not agent_record:
            raise HTTPException(status_code=404, detail="Agent not found.")
            
        if agent_record.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You are not authorized to interact with this agent.")
            
        reply = await engine.invoke(agent_id, request.message)
        return ChatResponse(reply=reply)
    except HTTPException:
        # Re-raise known HTTPExceptions (like the 403 or 404 above)
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/{agent_id}/knowledge")
async def add_agent_knowledge(
    agent_id: str,
    request: AddKnowledgeRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        agent_record = await get_personal_agent(agent_id)
        if not agent_record or agent_record.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this agent's knowledge.")
            
        chunks_added = await engine.add_knowledge(agent_id, request.text)
        return {
            "status": "success", 
            "chunks_added": chunks_added, 
            "message": f"Successfully added {chunks_added} chunks to knowledge base."
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents/{agent_id}/knowledge")
async def search_agent_knowledge(
    agent_id: str,
    q: str,
    n: int = 5,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        agent_record = await get_personal_agent(agent_id)
        if not agent_record or agent_record.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to read this agent's knowledge.")
            
        if not q:
            raise HTTPException(status_code=400, detail="Query 'q' is required.")
            
        results = await engine.search_knowledge(agent_id, q, top_k=n)
        return {"results": results}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents/public")
async def get_public_agents_list():
    try:
        agents = await get_public_agents()
        return {"data": agents}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel
class InitProfileRequest(BaseModel):
    name: str | None = None
    headline: str | None = None

@app.post("/api/auth/initialize")
async def initialize_user_profile(
    req: InitProfileRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        from core.db import supabase
        
        # 1. Check if user profile exists
        user_res = supabase.table("users").select("*").eq("id", current_user_id).execute()
        
        # Fetch actual auth user to get email safely
        auth_res = supabase.auth.admin.get_user_by_id(current_user_id)
        email = auth_res.user.email if auth_res and auth_res.user else ""

        if not user_res.data:
            supabase.table("users").insert({
                "id": current_user_id,
                "email": email,
                "name": req.name or "Unknown User"
            }).execute()

        # 2. Check if personal agent exists
        agent_res = supabase.table("personal_agents").select("*").eq("user_id", current_user_id).execute()
        if not agent_res.data:
            supabase.table("personal_agents").insert({
                "user_id": current_user_id,
                "is_public": True,
                "agent_name": req.name or "Default Agent",
                "headline": req.headline or "Professional"
            }).execute()

        return {"status": "success", "message": "Profile initialized."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/agents/{agent_id}")
async def patch_personal_agent(
    agent_id: str,
    request: AgentPatchRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        agent_record = await get_personal_agent(agent_id)
        if not agent_record:
            raise HTTPException(status_code=404, detail="Agent not found.")
        
        if agent_record.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this agent.")
            
        updates = request.dict(exclude_unset=True)
        
        # If agent_name is provided, update it in the users table concurrently
        if "agent_name" in updates and updates["agent_name"] is not None:
             from core.db import supabase
             supabase.table("users").update({"name": updates["agent_name"]}).eq("id", current_user_id).execute()

        if not updates:
            return {"status": "success", "message": "No fields to update."}
            
        updated = await update_personal_agent(agent_id, updates)

        return {"status": "success", "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from core.schemas import AgentConnectionRequest

@app.get("/api/agents/{agent_id}/connections")
async def get_agent_connections(
    agent_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        from core.db import supabase
        agent_record = await get_personal_agent(agent_id)
        if not agent_record or agent_record.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized.")

        # Fetch pending requests received by this agent
        pending_res = supabase.table("agent_connections").select(
            "id, status, created_at, requester_agent_id, personal_agents!agent_connections_requester_agent_id_fkey(agent_name, headline, avatar_url)"
        ).eq("receiver_agent_id", agent_id).eq("status", "pending").execute()

        # Fetch accepted connections (where this agent is requester OR receiver)
        acc_req_res = supabase.table("agent_connections").select(
            "id, status, created_at, receiver_agent_id, personal_agents!agent_connections_receiver_agent_id_fkey(agent_name, headline, avatar_url)"
        ).eq("requester_agent_id", agent_id).eq("status", "accepted").execute()
        
        acc_rec_res = supabase.table("agent_connections").select(
            "id, status, created_at, requester_agent_id, personal_agents!agent_connections_requester_agent_id_fkey(agent_name, headline, avatar_url)"
        ).eq("receiver_agent_id", agent_id).eq("status", "accepted").execute()

        # Normalize accepted connections format for the frontend
        accepted = []
        for req in acc_req_res.data:
            accepted.append({
                "connection_id": req["id"],
                "agent_id": req["receiver_agent_id"],
                "agent_name": req["personal_agents"]["agent_name"],
                "headline": req["personal_agents"]["headline"],
                "avatar_url": req["personal_agents"].get("avatar_url"),
                "created_at": req["created_at"]
            })
        for rec in acc_rec_res.data:
            accepted.append({
                "connection_id": rec["id"],
                "agent_id": rec["requester_agent_id"],
                "agent_name": rec["personal_agents"]["agent_name"],
                "headline": rec["personal_agents"]["headline"],
                "avatar_url": rec["personal_agents"].get("avatar_url"),
                "created_at": rec["created_at"]
            })

        pending = []
        for p in pending_res.data:
             pending.append({
                "connection_id": p["id"],
                "agent_id": p["requester_agent_id"],
                "agent_name": p["personal_agents"]["agent_name"],
                "headline": p["personal_agents"]["headline"],
                "avatar_url": p["personal_agents"].get("avatar_url"),
                "created_at": p["created_at"]
            })

        # Also fetch outbound pending requests so UI knows what has been sent
        outbound_res = supabase.table("agent_connections").select("receiver_agent_id").eq("requester_agent_id", agent_id).eq("status", "pending").execute()
        outbound_ids = [r["receiver_agent_id"] for r in outbound_res.data]

        return {
            "status": "success", 
            "data": {
                "accepted": accepted,
                "pending_incoming": pending,
                "pending_outbound_ids": outbound_ids
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/{agent_id}/connections/request")
async def send_connection_request(
    agent_id: str,
    request: AgentConnectionRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        from core.db import supabase
        agent_record = await get_personal_agent(agent_id)
        if not agent_record or agent_record.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized.")

        target_id = request.target_agent_id
        if agent_id == target_id:
            raise HTTPException(status_code=400, detail="Cannot connect to yourself.")

        # Check existing connection
        res1 = supabase.table("agent_connections").select("*").eq("requester_agent_id", agent_id).eq("receiver_agent_id", target_id).execute()
        res2 = supabase.table("agent_connections").select("*").eq("requester_agent_id", target_id).eq("receiver_agent_id", agent_id).execute()
        
        if res1.data or res2.data:
            raise HTTPException(status_code=400, detail="Connection or request already exists.")

        inserted = supabase.table("agent_connections").insert({
            "requester_agent_id": agent_id,
            "receiver_agent_id": target_id,
            "status": "pending"
        }).execute()

        return {"status": "success", "data": inserted.data}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/agents/{agent_id}/connections/{connection_id}/accept")
async def accept_connection_request(
    agent_id: str,
    connection_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        from core.db import supabase
        agent_record = await get_personal_agent(agent_id)
        if not agent_record or agent_record.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized.")

        # Verify the connection exists and belongs to this agent as receiver
        conn_res = supabase.table("agent_connections").select("*").eq("id", connection_id).single().execute()
        if not conn_res.data:
            raise HTTPException(status_code=404, detail="Connection not found.")
            
        if conn_res.data["receiver_agent_id"] != agent_id:
            raise HTTPException(status_code=403, detail="You can only accept requests sent to you.")

        updated = supabase.table("agent_connections").update({"status": "accepted"}).eq("id", connection_id).execute()

        return {"status": "success", "data": updated.data}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
