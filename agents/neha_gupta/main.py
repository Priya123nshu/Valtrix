import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.neha_gupta.task_manager import NehaGuptaTaskManager
from agents.neha_gupta.agent import NehaGuptaAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8013, help="Port for server")
def main(host: str, port: int):
    print(f"\n🚀 Starting Neha Gupta on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name="Neha Gupta",
        description="Staff ML Engineer at DataNova Tech",
        url="http://localhost:8000/46752806-1283-4730-9765-c4acf1652753/",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = NehaGuptaAgent()
    task_manager = NehaGuptaTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
