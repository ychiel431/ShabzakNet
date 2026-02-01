import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# --- ניהול כתובת השרת ---
# כתובת ה-IP הקבועה של השרת ב-AWS
SERVER_IP = "98.83.47.167"
PORT = 8080
CURRENT_BASE_URL = os.getenv("BASE_URL", f"http://{SERVER_IP}:{PORT}")

# --- הגדרות נתיבים ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
QR_DIR = os.path.join(STATIC_DIR, "qrcodes")
PHOTO_DIR = os.path.join(STATIC_DIR, "photos")

# וודא שהתיקיות קיימות פיזית
for d in [QR_DIR, PHOTO_DIR]:
    os.makedirs(d, exist_ok=True)

# --- חיבור למסד הנתונים ---
# הגדרת הכתובת לחיבור בתוך Docker
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017")

# חיבור אסינכרוני
client = AsyncIOMotorClient(MONGO_URI)
database = client.shabzaknet_db

# --- תיקון השמות עבור main.py ---
# אנחנו מגדירים את 'db' ככינוי ל-'database' כדי שהייבוא במיין יעבוד
db = database 

# חיבור סינכרוני (לשימוש ב-db_sync)
client_sync = MongoClient(MONGO_URI)
db_sync = client_sync.shabzaknet_db

# קיצורי דרך לקולקשנים (לשימוש בתוך הפונקציות)
soldiers_col = database.soldiers
vehicles_col = database.vehicles