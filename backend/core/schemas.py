from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    reply: str

class AddKnowledgeRequest(BaseModel):
    text: str

class AgentPatchRequest(BaseModel):
    bio: str | None = None
    headline: str | None = None
    is_public: bool | None = None
    agent_name: str | None = None
    avatar_url: str | None = None

class AgentConnectionRequest(BaseModel):
    target_agent_id: str
