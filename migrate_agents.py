import json
import os
import uuid
import re

REGISTRY_FILE = "e:/agent_network/agent_network/registry.json"
AGENTS_DIR = "e:/agent_network/agent_network/agents"

def load_registry():
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, "r") as f:
            return json.load(f)
    return []

def save_registry(data):
    with open(REGISTRY_FILE, "w") as f:
        json.dump(data, f, indent=2)

def update_agent_main_file(agent_name, agent_id, internal_port):
    safe_name = agent_name.lower().replace(" ", "_")
    main_path = os.path.join(AGENTS_DIR, safe_name, "main.py")
    
    if not os.path.exists(main_path):
        print(f"⚠️  Could not find main.py for {agent_name} at {main_path}")
        return

    with open(main_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Update the port in the main function decorator or call
    # We want to keep the process running on internal_port, but the AgentCard URL should be the public one
    
    # Update default port in click option
    # @click.option("--port", default=8001, help="Port for server")
    content = re.sub(r'@click\.option\("--port", default=\d+,', f'@click.option("--port", default={internal_port},', content)

    # Update or Add Host Option
    if '@click.option("--host"' not in content:
         # Add host option before port option if missing (legacy agents)
         content = content.replace('@click.option("--port"', '@click.option("--host", default="127.0.0.1", help="Host to bind server to")\n@click.option("--port"')
         # Update main signature
         content = content.replace('def main(port: int):', 'def main(host: str, port: int):')
         content = content.replace('def main(port):', 'def main(host, port):')
         # Update server start print
         content = content.replace('print(f"\\n🚀 Starting {name} on http://localhost:{port}/\\n")', 'print(f"\\n🚀 Starting {name} on http://{host}:{port}/\\n")')
         # Update server init
         content = content.replace('host="localhost",', 'host=host,')
         content = content.replace('host="0.0.0.0",', 'host=host,')
    else:
         # Enforce default host to 127.0.0.1
         content = re.sub(r'@click\.option\("--host", default="[^"]+",', '@click.option("--host", default="127.0.0.1",', content)

    
    # Update AgentCard URL
    # url=f"http://{host}:{port}/", -> url=f"http://localhost:8000/{agent_id}/",
    # We need to be careful with regex here.
    # The existing code typically looks like:
    # url=f"http://{host}:{port}/",
    
    new_url_line = f'        url="http://localhost:8000/{agent_id}",'
    
    # Regex to replace the url line in AgentCard instantiation
    content = re.sub(r'url=f"http://\{host\}:\{port\}/?",', new_url_line, content)
    content = re.sub(r'url="http://localhost:\d+/?",', new_url_line, content) # Handle cases where it might be hardcoded

    with open(main_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Updated main.py for {agent_name}")

def main():
    registry = load_registry()
    start_port = 8001
    
    updated_registry = []
    
    print(f"Found {len(registry)} agents. Starting migration...")

    for i, agent in enumerate(registry):
        # Generate ID if not exists (or just overwrite to ensure consistency for now?)
        # Let's preserve if exists, but most don't have it.
        agent_id = agent.get("id", str(uuid.uuid4()))
        internal_port = start_port + i
        
        agent["id"] = agent_id
        agent["internal_port"] = internal_port
        
        # Update public URL in registry to point to the proxy
        agent["url"] = f"http://localhost:8000/{agent_id}"
        
        update_agent_main_file(agent["name"], agent_id, internal_port)
        
        updated_registry.append(agent)
        print(f"🔹 Processed {agent['name']}: ID={agent_id}, InternalPort={internal_port}")

    save_registry(updated_registry)
    print("\n🎉 Migration complete. Registry updated.")

if __name__ == "__main__":
    main()
