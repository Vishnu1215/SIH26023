from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

uri = os.getenv("MONGODB_URI")

client = MongoClient(uri)

db = client["coal_portal"]

collection = db["test"]

collection.insert_one({
    "name": "SIH Test",
    "status": "connected"
})

print("✅ Document inserted successfully!")