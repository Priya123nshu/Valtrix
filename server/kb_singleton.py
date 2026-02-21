"""
Shared singleton for KnowledgeBase access across agent processes.
Import this module to get a single KB instance that initializes once.
"""
import os
import sys

# Ensure root is on path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(os.path.dirname(_current_dir))
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from server.knowledge_base import KnowledgeBase as _KnowledgeBase

_KB_INSTANCE = None

def get_kb() -> _KnowledgeBase:
    """Returns the shared singleton KnowledgeBase instance."""
    global _KB_INSTANCE
    if _KB_INSTANCE is None:
        kb_path = os.path.join(_root_dir, 'knowledge_store')
        _KB_INSTANCE = _KnowledgeBase(persistence_directory=kb_path)
    return _KB_INSTANCE
