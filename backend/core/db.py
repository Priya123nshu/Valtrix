import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load from root directory
dotenv_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(dotenv_path)

# Load environment variables (ensure they are set in your environment or .env)
# Using Service Role Key for server-side operations
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", os.getenv("SUPABASE_URL", ""))
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("WARNING: Supabase URL or Service Role Key missing.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def get_user(user_id: str):
    """Fetch user persona from public.users"""
    response = supabase.table("users").select("*").eq("id", user_id).single().execute()
    return response.data

async def get_personal_agent(agent_id: str):
    """Fetch personal agent record"""
    response = supabase.table("personal_agents").select("*").eq("id", agent_id).single().execute()
    return response.data

async def get_user_skills(user_id: str):
    """Fetch list of user skills"""
    # Assuming there varies a skills table associated with the user
    response = supabase.table("user_skills").select("*").eq("user_id", user_id).execute()
    return response.data

async def get_public_agents():
    """Fetch all public agents with user details securely"""
    response = supabase.table("personal_agents").select(
        "id, bio, headline, created_at, avatar_url, agent_name, users(name, role_type)"
    ).eq("is_public", True).execute()
    return response.data

async def update_personal_agent(agent_id: str, updates: dict):
    """Update personal agent"""
    response = supabase.table("personal_agents").update(updates).eq("id", agent_id).execute()
    return response.data
