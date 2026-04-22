import asyncio
import os
import sys

# Add the BE directory to sys.path to import app modules
sys.path.append(os.getcwd())

from app.services.auth_service import AuthService
from app.db.postgres import async_session_factory
from sqlalchemy import text

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.db.mongodb import connect_mongodb

async def test_registration_email():
    # Initialize MongoDB connection for notifications
    await connect_mongodb()
    email = "madsan123456@gmail.com"
    password = "TestPassword123!"
    first_name = "Madsan"
    last_name = "Test"

    print(f"--- Starting Test Registration for {email} ---")
    
    async with async_session_factory() as session:
        auth_service = AuthService(session)
        
        # 1. Clean up existing user if any (to allow re-running the test)
        print(f"Cleaning up any existing user with email {email}...")
        await session.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
        await session.commit()
        
        # 2. Call register_student which triggers the Novu 'welcome' workflow
        print("Registering student and triggering Novu...")
        try:
            user_data = await auth_service.register_student(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            await session.commit()
            print("--- Success! ---")
            print(f"User created with ID: {user_data['user_id']}")
            print(f"Check your inbox at {email} and the Novu 'Activity Feed'.")
        except Exception as e:
            print(f"--- Failed! ---")
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_registration_email())
