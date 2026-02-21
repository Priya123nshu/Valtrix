import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.vikrant_joshi.task_manager import VikrantJoshiTaskManager
from agents.vikrant_joshi.agent import VikrantJoshiAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8016, help="Port for server")
def main(host: str, port: int):
    print(f"\nStarting Vikrant Joshi on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name="Vikrant Joshi",
        description="Lead Blockchain Engineer at ChainNova Labs",
        url="http://localhost:8000/d0a92738-522c-4367-9c9c-f4edc4de8216/",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = VikrantJoshiAgent()
    task_manager = VikrantJoshiTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
