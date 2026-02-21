import logging
from server.task_manager import InMemoryTaskManager
from models.request import SendTaskRequest, SendTaskResponse
from models.task import Message, TextPart, TaskStatus, TaskState
from agents.arjun_patel.agent import ArjunPatelAgent

logger = logging.getLogger(__name__)

class ArjunPatelTaskManager(InMemoryTaskManager):
    def __init__(self, agent: ArjunPatelAgent):
        super().__init__()
        self.agent = agent

    def _get_user_text(self, request: SendTaskRequest) -> str:
        if request.params.message.parts:
            return request.params.message.parts[0].text
        return ""

    async def on_send_task(self, request: SendTaskRequest) -> SendTaskResponse:
        logger.info(f"Arjun Patel received task {request.id}")
        task = await self.upsert_task(request.params)
        user_text = self._get_user_text(request)
        response_text = await self.agent.invoke(user_text, session_id=request.params.sessionId)
        
        reply = Message(role="agent", parts=[TextPart(text=response_text)])
        
        async with self.lock:
            task.status = TaskStatus(state=TaskState.COMPLETED)
            task.history.append(reply)

        return SendTaskResponse(id=request.id, result=task)
