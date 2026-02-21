from typing import Optional, Any, Union
from pydantic import BaseModel, Field

class JSONRPCBase(BaseModel):
    jsonrpc: str = Field(default="2.0", pattern="2.0")
    id: Optional[Union[str, int]] = None

class JSONRPCRequest(JSONRPCBase):
    method: str
    params: Optional[Any] = None

class JSONRPCError(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None

class JSONRPCResponse(JSONRPCBase):
    result: Optional[Any] = None
    error: Optional[JSONRPCError] = None

class InternalError(JSONRPCError):
    def __init__(self, message: str):
        super().__init__(code=-32603, message=message)
