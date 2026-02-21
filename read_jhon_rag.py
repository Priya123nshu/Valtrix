import chromadb
import json

JHON_ID = "3bf1864d-41c1-457b-9fed-6c88c5ee1fcc"
safe_name = "agent_" + JHON_ID.replace("-", "_")

client = chromadb.PersistentClient(path="knowledge_store")
collection = client.get_collection(name=safe_name)
all_docs = collection.get()
docs = all_docs.get("documents", [])

with open("jhon_rag.json", "w", encoding="utf-8") as f:
    json.dump({"count": len(docs), "documents": docs}, f, ensure_ascii=False, indent=2)

print("Done, count:", len(docs))
