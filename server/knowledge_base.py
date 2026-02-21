import os
import uuid
import threading
import time

# Lazy imports to avoid blocking server startup
_pinecone_module = None
_sentence_transformers_module = None
_init_lock = threading.Lock()

def _get_dependencies():
    global _pinecone_module, _sentence_transformers_module
    if _pinecone_module is None:
        with _init_lock:
            if _pinecone_module is None:
                import pinecone
                import sentence_transformers
                _pinecone_module = pinecone
                _sentence_transformers_module = sentence_transformers
    return _pinecone_module, _sentence_transformers_module


class KnowledgeBase:
    def __init__(self, persistence_directory=None):
        # persistence_directory kept for backward compatibility with kb_singleton.py
        self._index = None
        self._embedding_model = None
        self._ready = False
        self._ready_lock = threading.Lock()
        
        # Initialize in background thread so server startup is not blocked
        t = threading.Thread(target=self._initialize, daemon=True)
        t.start()

    def _initialize(self):
        """Background initialization of Pinecone and embedding model."""
        try:
            print("KB: Starting background initialization for Pinecone...", flush=True)
            pinecone, sentence_transformers = _get_dependencies()
            
            api_key = os.environ.get("PINECONE_API_KEY")
            if not api_key:
                print("KB: WARNING - PINECONE_API_KEY environment variable is not set.", flush=True)
                
            pc = pinecone.Pinecone(api_key=api_key)
            index_name = "agent-memory"
            
            # Auto-create index if not exists
            existing_indexes = pc.list_indexes().names()
            if index_name not in existing_indexes:
                print(f"KB: Creating Pinecone index '{index_name}'...", flush=True)
                pc.create_index(
                    name=index_name,
                    dimension=384,
                    metric="cosine",
                    spec=pinecone.ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
            
            self._index = pc.Index(index_name)
            
            print("KB: Pinecone index ready. Loading embedding model...", flush=True)
            self._embedding_model = sentence_transformers.SentenceTransformer("all-MiniLM-L6-v2")
            
            with self._ready_lock:
                self._ready = True
            print("KB: Knowledge Base fully initialized and ready.", flush=True)
        except Exception as e:
            print(f"KB: Background initialization failed: {e}", flush=True)

    def _is_ready(self):
        with self._ready_lock:
            return self._ready

    def _wait_until_ready(self, timeout=30):
        """Block until KB is ready or timeout (seconds) is reached. Returns True if ready."""
        start = time.time()
        while not self._is_ready():
            if time.time() - start > timeout:
                print("KB: Timed out waiting for initialization.", flush=True)
                return False
            time.sleep(0.5)
        return True

    def add_document(self, agent_id: str, text: str):
        """
        Adds a document to the agent's SPECIFIC knowledge base namespace.
        Chunks the text using a recursive character splitting strategy.
        """
        if not self._wait_until_ready():
            print("KB: Not ready, skipping add_document.", flush=True)
            return 0

        def recursive_split(text, max_chunk_size=500, overlap=50):
            if len(text) <= max_chunk_size:
                return [text]
            splits = text.split('\n\n')
            if len(splits) == 1:
                splits = text.split('\n')
                if len(splits) == 1:
                    splits = text.split('. ')
                    if len(splits) == 1:
                        return [text[i:i+max_chunk_size] for i in range(0, len(text), max_chunk_size-overlap)]
            chunks = []
            current_chunk = ""
            for split in splits:
                candidate = split if not current_chunk else current_chunk + " " + split
                if len(candidate) <= max_chunk_size:
                    current_chunk = candidate
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = split
            if current_chunk:
                chunks.append(current_chunk)
            return chunks

        chunks = recursive_split(text)
        filtered_chunks = [c.strip() for c in chunks if c.strip()]
        
        if not filtered_chunks:
            return 0

        # Generate embeddings
        embeddings = self._embedding_model.encode(filtered_chunks).tolist()
        
        # Prepare vectors for Pinecone
        vectors = []
        for i, chunk in enumerate(filtered_chunks):
            vector_id = str(uuid.uuid4())
            metadata = {
                "text": chunk,
                "source": "user_upload"
            }
            vectors.append({
                "id": vector_id,
                "values": embeddings[i],
                "metadata": metadata
            })

        namespace = f"agent_{agent_id}"
        
        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            try:
                self._index.upsert(vectors=batch, namespace=namespace)
            except Exception as e:
                print(f"KB: Failed to upsert batch: {e}", flush=True)

        print(f"KB: ✅ RAG updated for agent [{agent_id[:8]}...] — {len(filtered_chunks)} chunk(s) added. Ready to query.", flush=True)
        return len(filtered_chunks)

    def query(self, agent_id: str, query_text: str, n_results=3):
        """
        Retrieves relevant context for the given agent from its SPECIFIC namespace.
        """
        if not self._wait_until_ready():
            print("KB: Not ready after timeout, returning empty results.", flush=True)
            return []
            
        try:
            query_embedding = self._embedding_model.encode(query_text).tolist()
            namespace = f"agent_{agent_id}"
            
            results = self._index.query(
                namespace=namespace,
                vector=query_embedding,
                top_k=n_results,
                include_metadata=True
            )
            
            matches = results.get("matches", [])
            documents = []
            for match in matches:
                if "metadata" in match and "text" in match["metadata"]:
                    documents.append(match["metadata"]["text"])
                    
            return documents
        except Exception as e:
            print(f"KB: Query failed: {e}", flush=True)
            return []

    def clear_knowledge(self, agent_id: str):
        """Deletes all vectors in the namespace for the agent."""
        if not self._wait_until_ready():
            return
            
        namespace = f"agent_{agent_id}"
        try:
            self._index.delete(delete_all=True, namespace=namespace)
            print(f"KB: Cleared knowledge for agent {agent_id}", flush=True)
        except Exception as e:
            # Pinecone might throw an exception if the namespace does not exist
            pass
