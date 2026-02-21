from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.requests import Request
from models.agent import AgentCard
from models.request import A2ARequest, SendTaskRequest
from models.json_rpc import JSONRPCResponse, InternalError
from server.task_manager import TaskManager
import json
import logging
from datetime import datetime
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger(__name__)

from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

class A2AServer:
    def __init__(self, host="0.0.0.0", port=5000, agent_card: AgentCard = None, task_manager: TaskManager = None):
        self.host = host
        self.port = port
        self.agent_card = agent_card
        self.task_manager = task_manager
        
        middleware = [
            Middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
        ]
        
        self.app = Starlette(middleware=middleware)
        self.app.add_route("/", self._handle_request, methods=["POST"])
        self.app.add_route("/.well-known/agent.json", self._get_agent_card, methods=["GET"])

    def start(self):
        if not self.agent_card or not self.task_manager:
            raise ValueError("Agent card and task manager are required")
        import uvicorn
        # Force uvicorn to log to stdout
        uvicorn.run(self.app, host=self.host, port=self.port, log_level="info")

    def _get_agent_card(self, request: Request) -> JSONResponse:
        return JSONResponse(self.agent_card.model_dump(exclude_none=True))

    async def _handle_request(self, request: Request):
        try:
            body = await request.json()
            print("\n🔍 Incoming JSON:", json.dumps(body, indent=2))
            
            # Using TypeAdapter validation from our models
            json_rpc = A2ARequest.validate_python(body)

            if isinstance(json_rpc, SendTaskRequest):
                result = await self.task_manager.on_send_task(json_rpc)
            else:
                # We can add GetTaskRequest handling here too if needed
                raise ValueError(f"Unsupported A2A method: {type(json_rpc)}")

            return self._create_response(result)

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Exception: {e}")
            return JSONResponse(
                JSONRPCResponse(id=None, error=InternalError(message=str(e))).model_dump(),
                status_code=400
            )

    def _create_response(self, result):
        if isinstance(result, JSONRPCResponse):
            return JSONResponse(content=jsonable_encoder(result.model_dump(exclude_none=True)))
        else:
            raise ValueError("Invalid response type")
