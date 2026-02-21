from abc import ABC, abstractmethod
from typing import Dict
import asyncio
from models.request import SendTaskRequest, SendTaskResponse, GetTaskRequest, GetTaskResponse
from models.task import Task, TaskSendParams, TaskQueryParams, TaskStatus, TaskState, Message

class TaskManager(ABC):
    @abstractmethod
    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        pass

    @abstractmethod
    async def on_get_task(self, request: GetTaskRequest) -> GetTaskResponse:
        pass

class InMemoryTaskManager(TaskManager):
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.lock = asyncio.Lock()

    async def upsert_task(self, params: TaskSendParams) -> Task:
        async with self.lock:
            task = self.tasks.get(params.id)
            if task is None:
                task = Task(
                    id=params.id,
                    status=TaskStatus(state=TaskState.SUBMITTED),
                    history=[params.message]
                )
                self.tasks[params.id] = task
            else:
                task.history.append(params.message)
            return task

    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        raise NotImplementedError("on_send_task() must be implemented in subclass")

    async def on_get_task(self, request: GetTaskRequest) -> GetTaskResponse:
        async with self.lock:
            query = request.params
            task = self.tasks.get(query.id)
            if not task:
                # In a real app we might return a specific error code
                # For now, we return a response with an error field (if the model allows) or raise
                # But looking at GetTaskResponse, it expects a result=Task. 
                # We might need to adjust JSONRPCResponse to allow error.
                # For now let's just return a dummy task or raise.
                # A better way is to return the JSONRPC error structure, but our signature says GetTaskResponse.
                # Let's assume the caller handles errors or we return None and let the server handle it.
                # Actually server.py handles exceptions.
                raise ValueError("Task not found")

            # Simple copy to avoid mutation issues if we modify it for response
            task_copy = task.model_copy()
            if query.historyLength is not None:
                task_copy.history = task_copy.history[-query.historyLength:]
            
            return GetTaskResponse(result=task_copy)
