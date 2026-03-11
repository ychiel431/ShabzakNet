import os
import socket
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# --- ניהול כתובת השרת ---
SERVER_IP = "172.29.234.124"
PORT = 8080
<<<<<<< Updated upstream
CURRENT_BASE_URL = os.getenv("BASE_URL", "http://172.29.234.124:8080")

# --- הגדרות נתיבים (זה מה שהיה חסר!) ---
=======
CURRENT_BASE_URL = os.getenv("BASE_URL", f"http://{SERVER_IP}:{PORT}")
CURRENT_BASE_URL = "http://98.83.47.167"
# --- הגדרות נתיבים ---
>>>>>>> Stashed changes
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
QR_DIR = os.path.join(STATIC_DIR, "qrcodes")
PHOTO_DIR = os.path.join(STATIC_DIR, "photos")

# וודא שהתיקיות קיימות פיזית
for d in [QR_DIR, PHOTO_DIR]:
    os.makedirs(d, exist_ok=True)

# --- חיבור למסד הנתונים ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017") #
client_async = AsyncIOMotorClient(MONGO_URI)
db = client_async.shabzak_db 

client_sync = MongoClient(MONGO_URI)
db_sync = client_sync.shabzak_db

<<<<<<< Updated upstream
# קיצורי דרך לקולקשנים
soldiers_col = db.soldiers
vehicles_col = db.vehicles
=======
soldiers_col = database.soldiers
vehicles_col = database.vehicles
>>>>>>> Stashed changes
