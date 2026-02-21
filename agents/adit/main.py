import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.adit.task_manager import AditTaskManager
from agents.adit.agent import AditAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8002, help="Port for server")
def main(host: str, port: int):
    print(f"\n🚀 Starting Adit (Product Manager) on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    skill = AgentSkill(
        id="product_strategy",
        name="Product Strategy",
        description="Provides advice on product roadmaps, user stories, and prioritization.",
        tags=["product", "strategy", "roadmap", "pm"],
        examples=["How do I prioritize this feature?", "Review my user story."]
    )

    agent_card = AgentCard(
        name="Adit",
        description="Senior Product Manager Agent",
                url="http://localhost:8000/f25942ca-6ef7-4cf8-aacb-b8afa4731dbe",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities,
        skills=[skill]
    )

    agent = AditAgent()
    task_manager = AditTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
