from typing import List, Optional
from pydantic import BaseModel

class AgentCapabilities(BaseModel):
    streaming: bool = False
    history: bool = True

class AgentSkill(BaseModel):
    id: str
    name: str
    description: str
    tags: List[str] = []
    examples: List[str] = []

class AgentCard(BaseModel):
    name: str
    description: str
    url: str
    version: str = "1.0.0"
    defaultInputModes: List[str] = ["text"]
    defaultOutputModes: List[str] = ["text"]
    capabilities: AgentCapabilities
    skills: List[AgentSkill] = []
    id: Optional[str] = None
