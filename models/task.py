from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class TextPart(BaseModel):
    text: str

class Message(BaseModel):
    role: str
    parts: List[TextPart]
    timestamp: datetime = Field(default_factory=datetime.now)

class TaskState(str, Enum):
    SUBMITTED = "submitted"
    processing = "processing" # Case sensitive matching might happen, adding variations just in case or keep standard
    COMPLETED = "completed"
    FAILED = "failed"

class TaskStatus(BaseModel):
    state: TaskState
    progress: Optional[float] = 0.0
    message: Optional[str] = None

class Task(BaseModel):
    id: str
    status: TaskStatus
    history: List[Message] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class TaskSendParams(BaseModel):
    id: str
    sessionId: Optional[str] = None
    message: Message

class TaskQueryParams(BaseModel):
    id: str
    historyLength: Optional[int] = None
