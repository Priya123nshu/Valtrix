from typing import Union, Literal, Optional, Any
from pydantic import Field, TypeAdapter
from models.json_rpc import JSONRPCRequest, JSONRPCResponse
from models.task import TaskSendParams, TaskQueryParams, Task

class SendTaskRequest(JSONRPCRequest):
    method: Literal["tasks/send"] = "tasks/send"
    params: TaskSendParams

class GetTaskRequest(JSONRPCRequest):
    method: Literal["tasks/get"] = "tasks/get"
    params: TaskQueryParams

class SendTaskResponse(JSONRPCResponse):
    result: Task

class GetTaskResponse(JSONRPCResponse):
    result: Task

# Discriminated Union for validation
A2ARequestAdapter = TypeAdapter(Union[SendTaskRequest, GetTaskRequest])

class A2ARequest:
    @staticmethod
    def validate_python(data: Any):
        return A2ARequestAdapter.validate_python(data)
