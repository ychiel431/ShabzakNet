import os
import socket
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# --- ניהול כתובת השרת ---
# אם התמונות או ה-QR לא עובדים בטלפון, ודא שה-IP כאן הוא ה-IP המעודכן של המחשב שלך (למשל 10.87.227.124)
CURRENT_BASE_URL = os.getenv("BASE_URL", "http://98.83.47.167:8080")

# --- הגדרות נתיבים ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
QR_DIR = os.path.join(STATIC_DIR, "qrcodes")
PHOTO_DIR = os.path.join(STATIC_DIR, "photos")

# וודא שהתיקיות קיימות פיזית
for d in [STATIC_DIR, QR_DIR, PHOTO_DIR]:
    os.makedirs(d, exist_ok=True)

# --- חיבור למסד הנתונים ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")
client_async = AsyncIOMotorClient(MONGO_URI)
db = client_async.shabzak_db 

client_sync = MongoClient(MONGO_URI)
db_sync = client_sync.shabzak_db

# קיצורי דרך לקולקשנים
soldiers_col = db.soldiers
vehicles_col = db.vehicles