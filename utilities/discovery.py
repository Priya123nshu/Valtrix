import httpx
from typing import List
from models.agent import AgentCard

class DiscoveryClient:
    """
    A simple discovery client that queries a known list of agent URLs.
    In a real system, this would query a central registry.
    """
    def __init__(self, registry_path: str = "registry.json"):
        import json
        import os
        
        self.known_urls = []
        # Try to find registry.json in current or parent dir
        params = [registry_path, os.path.join("agent_network", registry_path)]
        
        for p in params:
            if os.path.exists(p):
                try:
                    with open(p, "r") as f:
                        data = json.load(f)
                        self.known_urls = [agent["url"] for agent in data]
                    break
                except Exception as e:
                    print(f"Error reading registry from {p}: {e}")
        
        if not self.known_urls:
             # Fallback
             self.known_urls = [
                "http://localhost:8001",
                "http://localhost:8002",
                "http://localhost:8003",
            ]

    async def list_agent_cards(self) -> List[AgentCard]:
        cards = []
        async with httpx.AsyncClient() as client:
            for url in self.known_urls:
                try:
                    # Append .well-known/agent.json
                    discovery_url = f"{url}/.well-known/agent.json"
                    response = await client.get(discovery_url, timeout=2.0)
                    if response.status_code == 200:
                        data = response.json()
                        cards.append(AgentCard(**data))
                except Exception as e:
                    # Ignore agents that are down
                    print(f"Failed to discover agent at {url}: {e}")
                    pass
        return cards
