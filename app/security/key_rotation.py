import secrets
import os
from datetime import datetime
from dotenv import load_dotenv, set_key
import logging

logger = logging.getLogger(__name__)

def rotate_keys(env_file=".env"):
    """
    Rotate secret keys by:
    1. Moving PRIMARY_SECRET_KEY to SECONDARY_SECRET_KEY
    2. Generating a new PRIMARY_SECRET_KEY
    3. Updating the LAST_ROTATION_DATE
    """
    load_dotenv(env_file)
    
    # Get current primary key
    current_primary = os.getenv("PRIMARY_SECRET_KEY")
    
    if current_primary:
        # Move current primary to secondary
        set_key(env_file, "SECONDARY_SECRET_KEY", current_primary)
        
    # Generate new primary key
    new_key = secrets.token_hex(32)
    set_key(env_file, "PRIMARY_SECRET_KEY", new_key)
    
    # Update rotation date
    set_key(env_file, "LAST_ROTATION_DATE", datetime.now().isoformat())
    
    logger.info("Secret keys rotated successfully")
    return True