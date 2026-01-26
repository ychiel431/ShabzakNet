FROM python:3.10-slim

WORKDIR /app

# התקנת ספריות נדרשות
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# העתקת הקוד והתיקיות הסטטיות
COPY . .

# יצירת תיקיות סטטיות אם אינן קיימות
RUN mkdir -p static/qrcodes static/photos

# הרצת השרת
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]