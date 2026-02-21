import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents._vikram_singh.task_manager import VikramSinghTaskManager
from agents._vikram_singh.agent import VikramSinghAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8015, help="Port for server")
def main(host: str, port: int):
    print(f"\nStarting  Vikram Singh on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name=" Vikram Singh",
        description="Principal Deep Learning Engineer at VisionCore AI",
        url="http://localhost:8000/3df77a1e-f949-4550-8cbf-a8a3ec4f5e52/",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = VikramSinghAgent()
    task_manager = VikramSinghTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
