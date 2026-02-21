import os
import requests
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from pinecone import Pinecone
from core.db import get_personal_agent, get_user, get_user_skills

class AgentEngine:
    def __init__(self):
        # Initialize Pinecone
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        if pinecone_api_key:
            from pinecone import ServerlessSpec
            self.pc = Pinecone(api_key=pinecone_api_key)
            index_name = os.getenv("PINECONE_INDEX_NAME", "agent-memory")
            
            if index_name not in self.pc.list_indexes().names():
                print(f"Creating Pinecone index '{index_name}' for embeddings...")
                self.pc.create_index(
                    name=index_name,
                    dimension=3072,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
            
            self.index = self.pc.Index(index_name)
        else:
            self.pc = None
            self.index = None

        # Gemini API key for embeddings
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")

        # Initialize LLM
        self.llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2023-05-15"),
            temperature=0.7
        )

    def _get_gemini_embedding(self, text: str) -> list[float]:
        """Get embedding from Gemini API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={self.gemini_api_key}"
        res = requests.post(url, json={"content": {"parts": [{"text": text}]}})
        if res.status_code == 200:
            return res.json().get("embedding", {}).get("values", [])
        print(f"Gemini embedding error: {res.status_code} {res.text}")
        return []

    async def _query_pinecone(self, agent_id: str, query: str, top_k: int = 5) -> str:
        """Query Pinecone using the agent_id as the namespace."""
        if not self.index or not self.gemini_api_key:
            return ""

        try:
            query_embedding = self._get_gemini_embedding(query)
            if not query_embedding:
                return ""

            namespace = f"agent_{agent_id}"
            
            results = self.index.query(
                namespace=namespace,
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            contexts = [match.metadata.get("text", "") for match in results.matches]
            if contexts:
                return "\\n\\nRelevant Context:\\n" + "\\n".join(contexts)
            return ""
        except Exception as e:
            print(f"Pinecone query failed: {e}")
            return ""

    async def search_knowledge(self, agent_id: str, query: str, top_k: int = 5) -> list[str]:
        """Search pinecone for raw strings to return to frontend API."""
        if not self.index or not self.gemini_api_key:
            return []
        
        try:
            query_embedding = self._get_gemini_embedding(query)
            if not query_embedding:
                return []

            namespace = f"agent_{agent_id}"
            
            results = self.index.query(
                namespace=namespace,
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            return [match.metadata.get("text", "") for match in results.matches]
        except Exception as e:
            import traceback
            traceback.print_exc()
            return []

    async def add_knowledge(self, agent_id: str, text: str) -> int:
        """Chunks text, embeds it, and saves to Pinecone."""
        if not self.index:
            raise Exception("Pinecone not initialized")
        if not self.gemini_api_key:
            raise Exception("Gemini API key not configured")
            
        try:
            from langchain_text_splitters import RecursiveCharacterTextSplitter
            import uuid
            
            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            chunks = splitter.split_text(text)
            
            if not chunks:
                return 0

            namespace = f"agent_{agent_id}"
            vectors = []
            
            for i, chunk in enumerate(chunks):
                embedding = self._get_gemini_embedding(chunk)
                if not embedding:
                    continue
                vector_id = str(uuid.uuid4())
                vectors.append({
                    "id": vector_id,
                    "values": embedding,
                    "metadata": {"text": chunk}
                })
                
            # Upsert in batches of 100
            for i in range(0, len(vectors), 100):
                batch = vectors[i:i + 100]
                self.index.upsert(vectors=batch, namespace=namespace)
                
            return len(chunks)
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to add knowledge: {e}")

    async def invoke(self, agent_id: str, message: str) -> str:
        # 1. Fetch personal agent
        agent_record = await get_personal_agent(agent_id)
        if not agent_record:
            return "Agent not found."

        user_id = agent_record.get("user_id")

        # 2. Fetch user persona and skills
        user_record = await get_user(user_id)
        skills_record = await get_user_skills(user_id)
        
        name = user_record.get("name", "Unknown User")
        role_type = user_record.get("role_type", "Professional")
        
        skills_list = [skill.get("name", "") for skill in skills_record] if skills_record else []
        skills_text = ", ".join(skills_list)

        # 3. Query Pinecone namespace = agent_id
        context = await self._query_pinecone(agent_id, message)

        # 4. Construct System Prompt
        system_prompt = f"""
        You are the digital representative of {name}.
        Your role is: {role_type}.
        
        Your verifiable skills include: {skills_text}.
        
        You must accurately represent {name} based on the provided personal context.
        If you are asked a question that goes beyond your context, politely clarify that you do not recall or do not have that specific information.
        Speak in the first person ('I', 'me', 'my').
        
        If a user asks you a question outside your expertise or about another person:
        1. Use 'search_agent_directory' to find an agent who knows the answer.
        2. Use 'message_agent' with their ID to ask them the question.
        3. Relay their answer back to the user.
        4. If 'message_agent' fails because you are not connected, use 'send_friend_request' and tell the user to wait for the request to be accepted.
        
        {context}
        """

        # Define dynamic tools for this agent context
        from langchain_core.tools import tool
        from core.db import supabase

        @tool
        async def search_agent_directory(query: str = "") -> str:
            """Call this to find a list of available AI agents, their IDs, and their roles."""
            res = supabase.table("personal_agents").select("id, agent_name, headline").eq("is_public", True).execute()
            if not res.data:
                return "No public agents found."
            
            directory = "\n".join([f"Name: {a.get('agent_name', 'Unknown')}, ID: {a['id']}, Role: {a.get('headline', 'Professional')}" for a in res.data if a['id'] != agent_id])
            return directory

        @tool
        async def send_friend_request(target_agent_id: str) -> str:
            """Send a friend/connection request to another agent."""
            res1 = supabase.table("agent_connections").select("*").eq("requester_agent_id", agent_id).eq("receiver_agent_id", target_agent_id).execute()
            res2 = supabase.table("agent_connections").select("*").eq("requester_agent_id", target_agent_id).eq("receiver_agent_id", agent_id).execute()
            
            if res1.data or res2.data:
                return "A connection or request already exists between you."
            
            try:
                supabase.table("agent_connections").insert({
                    "requester_agent_id": agent_id,
                    "receiver_agent_id": target_agent_id,
                    "status": "pending"
                }).execute()
                return f"Friend request sent to agent {target_agent_id}. You must wait for them to accept."
            except Exception as e:
                return f"Error sending request: {str(e)}"

        @tool
        async def message_agent(target_agent_id: str, question: str) -> str:
            """Send a question to another AI agent to get their expert opinion or personal context. Fails if not friends."""
            res1 = supabase.table("agent_connections").select("status").eq("requester_agent_id", agent_id).eq("receiver_agent_id", target_agent_id).execute()
            res2 = supabase.table("agent_connections").select("status").eq("requester_agent_id", target_agent_id).eq("receiver_agent_id", agent_id).execute()
            
            status = None
            if res1.data:
                status = res1.data[0].get("status")
            elif res2.data:
                status = res2.data[0].get("status")
                
            if status != "accepted":
                return "Error: You are not connected to this agent. You must send a friend request first."
            
            forwarded_msg = f"[Message from {name} via agent network]: {question}"
            try:
                response = await self.invoke(target_agent_id, forwarded_msg)
                return response
            except Exception as e:
                return f"Error messaging agent: {str(e)}"

        tools = [search_agent_directory, send_friend_request, message_agent]
        from langgraph.prebuilt import create_react_agent
        agent_executor = create_react_agent(self.llm, tools=tools)

        inputs = {"messages": [
            SystemMessage(content=system_prompt.strip()),
            HumanMessage(content=message)
        ]}
        
        result = await agent_executor.ainvoke(inputs)
        content = result["messages"][-1].content
        
        if isinstance(content, list):
             full_text = []
             for item in content:
                 if isinstance(item, dict) and "text" in item:
                     full_text.append(item["text"])
                 elif isinstance(item, str):
                     full_text.append(item)
             return "\n".join(full_text)
        return str(content)
