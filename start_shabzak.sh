#!/bin/bash

echo ">>> מתחיל תהליך איתחול למערכת ShabzakNet..."

# 1. ניקוי יסודי - גם פורטים וגם קונטיינרים ישנים
echo ">>> מנקה פורטים וקונטיינרים ישנים..."
docker-compose down 2>/dev/null # זה הכי חשוב! משחרר את הפורטים ש-Docker תפס
fuser -k 8080/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null

# 2. ניקוי קודי QR ישנים
echo ">>> מנקה קודי QR ישנים..."
rm -rf server/static/qrcodes/*.png

# 3. איתחול רק של ה-Database (בלי ה-Backend של דוקר)
echo ">>> מאתחל את ה-Database (MongoDB)..."
docker-compose up -d mongo # מפעיל רק את מסד הנתונים

# 4. הרצת Backend (כדי שנוכל לראות לוגים ולפתח)
echo ">>> מפעיל את ה-Backend (FastAPI) על 0.0.0.0..."
cd server
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8080 --reload & 
BACKEND_PID=$!

# 5. המתנה קצרה
sleep 3

# 6. הרצת Frontend - כולל ה-host עבור הפוקו
echo ">>> מפעיל את ה-Frontend (Vite)..."
cd ../client
npm run dev -- --host 0.0.0.0 & # הוספנו 0.0.0.0 לביטחון
FRONTEND_PID=$!

echo ">>> המערכת עלתה בהצלחה!"
wait $BACKEND_PID $FRONTEND_PID