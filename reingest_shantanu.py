import requests
import json

# 1. Get Agent ID
with open("registry.json", "r") as f:
    registry = json.load(f)
    shantanu = next((a for a in registry if a["name"].lower() == "shantanu"), None)
    agent_id = shantanu["id"]

url = f"http://localhost:8000/api/agents/{agent_id}/knowledge"

# 2. Clear existing knowledge first
from server.knowledge_base import KnowledgeBase
kb = KnowledgeBase(persistence_directory="knowledge_store")
try:
    collection = kb.client.get_collection(f"agent_{agent_id.replace('-', '_')}")
    # Delete all documents
    all_ids = collection.get()["ids"]
    if all_ids:
        collection.delete(ids=all_ids)
        print(f"Cleared {len(all_ids)} existing chunks.")
    else:
        print("No existing chunks to clear.")
except Exception as e:
    print(f"Clear error (may be ok): {e}")

# 3. Re-ingest with SEPARATE chunks per section
chunks = [
    """Full Name: Shantanu Desai
Current Role: Principal AI Scientist & LLM Architect at Neurix Labs
Location: Hyderabad, India
Contact: shantanu.desai@neurixlabs.com | +91-99450-67890

Professional Summary:
Pioneering LLM researcher and engineer with 10+ years in AI, specializing in model fine-tuning, scaling, and ethical deployment. Authored 20+ papers cited 5k+ times; built production LLMs powering 10M+ users in enterprise RAG and agentic systems.""",

    """Education & Academic Qualifications:
- PhD in AI & NLP from IIT Madras (2022). Thesis: "Scalable Retrieval-Augmented Generation for Low-Resource Languages."
- M.Tech in Machine Learning from IISc Bangalore (2016).
- B.Tech in Computer Science from NIT Surathkal (2014).

Certifications & Awards:
- AI Young Researcher, NASI 2025
- Google PhD Fellowship (2020)
- NeurIPS 2024 paper on "Hybrid GraphRAG for LLMs" (best paper runner-up)
- ACL 2023 paper on Indic LLMs""",

    """Career Highlights:
- Neurix Labs (2023–Present): Leads LLM platform team; developed GraphRAG-enhanced models reducing hallucination by 40%. Scaled inference to 1k QPS on Kubernetes.
- Hugging Face India (2021–2023): Staff ML Engineer; contributed to BLOOM and Llama fine-tunes; optimized for Indic languages (Hindi, Tamil).
- Google Cloud AI (2018–2021): Senior Research Engineer; worked on Vertex AI LLMs, focusing on multilingual retrieval and safety alignments.
- Early Career (2016–2018): ML Engineer at Mu Sigma, building NLP pipelines with BERT precursors.""",

    """Key Skills & Expertise:
- LLM Core: Fine-tuning (LoRA/PEFT), RAG (LangChain, LlamaIndex), agent frameworks (CrewAI).
- Tech Stack: PyTorch, Hugging Face Transformers, vLLM inference; Docker/K8s for deployment.
- Advanced Topics: Mixture-of-Experts (MoE), RLHF, synthetic data generation, eval benchmarks (MT-Bench).
- Scaling: Distributed training (DeepSpeed, FSDP), cost-optimized serving on AWS/GCP.
- Domain Specialties: Indic LLMs, enterprise RAG for finance/healthcare, safety/red-teaming.""",

    """Personal Interests & Open Source:
- Open-source advocate; creator of IndicFinGPT (10k+ GitHub stars); contributor to EleutherAI.
- Blogs on "LLMs in India" (Substack, 15k subscribers).
- Mentors at ML India community.
- Plays tabla."""
]

print(f"Adding {len(chunks)} chunks to agent {agent_id}...")
for i, chunk in enumerate(chunks):
    resp = requests.post(url, json={"text": chunk})
    if resp.status_code == 200:
        print(f"  Chunk {i+1}: {resp.json()}")
    else:
        print(f"  Chunk {i+1} FAILED: {resp.status_code} {resp.text}")

print("Done!")
