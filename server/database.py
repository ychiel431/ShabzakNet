import os
import socket
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# --- ניהול כתובת השרת ---
SERVER_IP = "10.91.81.124"
PORT = 8080
CURRENT_BASE_URL = f"http://{SERVER_IP}:{PORT}"

# --- הגדרות נתיבים (זה מה שהיה חסר!) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
QR_DIR = os.path.join(STATIC_DIR, "qrcodes")
PHOTO_DIR = os.path.join(STATIC_DIR, "photos")

# וודא שהתיקיות קיימות פיזית
for d in [QR_DIR, PHOTO_DIR]:
    os.makedirs(d, exist_ok=True)

# --- חיבור למסד הנתונים ---
MONGO_URI = "mongodb://127.0.0.1:27017"
client_async = AsyncIOMotorClient(MONGO_URI)
db = client_async.shabzak_db 

client_sync = MongoClient(MONGO_URI)
db_sync = client_sync.shabzak_db

# קיצורי דרך לקולקשנים
soldiers_col = db.soldiers
vehicles_col = db.vehicles