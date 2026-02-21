import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.pankhuri_mehta.task_manager import PankhuriMehtaTaskManager
from agents.pankhuri_mehta.agent import PankhuriMehtaAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8017, help="Port for server")
def main(host: str, port: int):
    print(f"\nStarting Pankhuri Mehta on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name="Pankhuri Mehta",
        description="Lead AI Content Creator & Head of Community at AIEdge Academy",
        url="http://localhost:8000/bb4ee161-16e2-476b-984e-9b9ca9ca41c2/",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = PankhuriMehtaAgent()
    task_manager = PankhuriMehtaTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
