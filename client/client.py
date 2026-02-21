import json
from uuid import uuid4
import httpx
from typing import Any, Dict
from models.request import SendTaskRequest, GetTaskRequest
from models.json_rpc import JSONRPCRequest
from models.task import Task, TaskSendParams, Message, TextPart
from models.agent import AgentCard

class A2AClientHTTPError(Exception):
    pass

class A2AClientJSONError(Exception):
    pass

class A2AClient:
    def __init__(self, agent_card: AgentCard = None, url: str = None):
        if agent_card:
            self.url = agent_card.url
        elif url:
            self.url = url
        else:
            raise ValueError("Must provide either agent_card or url")

    async def send_task(self, message_text: str) -> Task:
        # Construct the payload
        
        request = SendTaskRequest(
            id=uuid4().hex,
            params=TaskSendParams(
                id=uuid4().hex,
                message=Message(role="user", parts=[TextPart(text=message_text)])
            )
        )

        # print("\n📤 Sending JSON-RPC request:")
        # print(request.model_dump_json(indent=2))

        response = await self._send_request(request)
        # response["result"] is a dict matching Task model
        return Task(**response["result"])

    async def _send_request(self, request: JSONRPCRequest) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                # Use mode='json' to ensure datetime objects are serialized to strings
                response = await client.post(
                    self.url,
                    json=request.model_dump(mode='json'),
                    timeout=30
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise A2AClientHTTPError(f"{e.response.status_code}: {e.response.text}") from e
            except json.JSONDecodeError as e:
                raise A2AClientJSONError(str(e)) from e
