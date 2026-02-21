import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.shantanu.task_manager import shantanuTaskManager
from agents.shantanu.agent import shantanuAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8008, help="Port for server")
def main(host: str, port: int):
    print(f"\n🚀 Starting shantanu on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name="shantanu",
        description="llm expert",
        url="http://localhost:8000/9a66adbd-588b-4f77-9712-c13a0df12d0f",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = shantanuAgent()
    task_manager = shantanuTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
