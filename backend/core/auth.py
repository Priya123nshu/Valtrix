import os
import urllib.request
from jose import jwt, jwk
from jose.utils import base64url_decode
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json

security = HTTPBearer()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", os.getenv("SUPABASE_URL", ""))
if not SUPABASE_URL:
    print("WARNING: SUPABASE_URL is missing. JWT JWKS validation will fail.")

# The JWKS endpoint for a Supabase project
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Cache for JWKS to avoid fetching on every request
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        try:
            with urllib.request.urlopen(JWKS_URL) as response:
                _jwks_cache = json.loads(response.read().decode())
        except Exception as e:
            print(f"Error fetching JWKS: {e}")
            return None
    return _jwks_cache

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    jwks = get_jwks()
    
    if not jwks:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to fetch JWKS for token validation",
        )

    try:
        unverified_header = jwt.get_unverified_header(token)
        print(f"Token Header: {unverified_header}")
        
        # Extract signing key from JWKS
        SigningKey = None
        if "kid" in unverified_header:
            for key in jwks["keys"]:
                if key["kid"] == unverified_header["kid"]:
                    SigningKey = key
                    break
        
        if not SigningKey:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate signing key in JWKS",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Supabase defaults to audience "authenticated"
        # Token header confirmed 'alg': 'ES256'
        payload = jwt.decode(
            token,
            SigningKey,
            algorithms=["ES256"],
            audience="authenticated", 
            issuer=f"{SUPABASE_URL}/auth/v1"
        )
        
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials (missing subject)",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user_id
        
    except jwt.ExpiredSignatureError:
        print("Auth Exception: Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTClaimsError as e:
        print(f"Auth Exception: Incorrect claims. Details: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect claims. Please, check the audience and issuer. Details: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"Auth Exception: Could not validate credentials. Details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials. Details: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
