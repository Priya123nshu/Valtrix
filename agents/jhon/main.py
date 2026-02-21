import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.jhon.task_manager import JhonTaskManager
from agents.jhon.agent import JhonAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8007, help="Port for server")
def main(host: str, port: int):
    print(f"\n🚀 Starting Jhon on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name="Jhon",
        description="financial adviser",
                url="http://localhost:8000/3bf1864d-41c1-457b-9fed-6c88c5ee1fcc",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = JhonAgent()
    task_manager = JhonTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
