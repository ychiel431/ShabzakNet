#!/bin/bash

echo ">>> מתחיל תהליך איתחול למערכת ShabzakNet..."

# 1. ניקוי פורטים תפוסים
echo ">>> מנקה פורטים (8080 לשרת, 5173 ללקוח)..."
fuser -k 8080/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null

# 2. ניקוי קודי QR ישנים (חשוב מאוד לסנכרון IP)
echo ">>> מנקה קודי QR ישנים כדי למנוע טעויות סריקה..."
rm -rf server/static/qrcodes/*.png

# 3. איתחול ה-Database (Docker)
echo ">>> מאתחל את ה-Database (Docker)..."
docker-compose up -d

# 4. הרצת Backend
echo ">>> מפעיל את ה-Backend (FastAPI)..."
cd server
source venv/bin/activate
# הרצה ברקע
uvicorn main:app --host 0.0.0.0 --port 8080 --reload & 
BACKEND_PID=$!

# 5. המתנה קצרה להתייצבות
sleep 3

# 6. הרצת Frontend
echo ">>> מפעיל את ה-Frontend (Vite/React)..."
cd ../client
npm run dev &
FRONTEND_PID=$!

echo ">>> המערכת עלתה בהצלחה!"
echo ">>> Backend רץ בפורט 8080"
echo ">>> Frontend רץ בפורט 5173"

# שמירה על הסקריפט רץ
wait $BACKEND_PID $FRONTEND_PID