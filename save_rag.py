import chromadb
import json

AGENT_ID = "f25942ca-6ef7-4cf8-aacb-b8afa4731dbe"
safe_name = "agent_" + AGENT_ID.replace("-", "_")

client = chromadb.PersistentClient(path="knowledge_store")
collection = client.get_collection(name=safe_name)
all_docs = collection.get()
docs = all_docs.get("documents", [])

with open("rag_data.json", "w", encoding="utf-8") as f:
    json.dump({"count": len(docs), "documents": docs}, f, ensure_ascii=False, indent=2)

print("Saved to rag_data.json, count:", len(docs))
