import logging
import click
from server.server import A2AServer
from models.agent import AgentCard, AgentCapabilities, AgentSkill
from agents.arjun_patel.task_manager import ArjunPatelTaskManager
from agents.arjun_patel.agent import ArjunPatelAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@click.command()
@click.option("--host", default="127.0.0.1", help="Host to bind server to")
@click.option("--port", default=8014, help="Port for server")
def main(host: str, port: int):
    print(f"\n🚀 Starting Arjun Patel on http://{host}:{port}/\n")

    capabilities = AgentCapabilities(streaming=False)
    
    agent_card = AgentCard(
        name="Arjun Patel",
        description=" Lead Generative AI Engineer at SynthAI Labs ",
        url="http://localhost:8000/0cdca328-0d0e-4ffc-82e4-753202933e25/",
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=capabilities
    )

    agent = ArjunPatelAgent()
    task_manager = ArjunPatelTaskManager(agent=agent)
    
    server = A2AServer(
        host=host,
        port=port,
        agent_card=agent_card,
        task_manager=task_manager
    )
    server.start()

if __name__ == "__main__":
    main()
