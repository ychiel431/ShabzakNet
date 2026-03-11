import os
import datetime
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from typing import Optional
from pydantic import BaseModel

# ייבוא התשתית 
from database import db, CURRENT_BASE_URL, STATIC_DIR

# ייבוא הראוטים 
from routes import admin, kiosk
from routes.kiosk import fix_photo_url, identify_soldier

app = FastAPI()

# --- הגדרות CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- הגשת קבצים סטטיים ---
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# --- חיבור הראוטים הראשיים ---
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(kiosk.router, prefix="/kiosk", tags=["Kiosk"])

@app.get("/")
def read_root():
    return {"message": "ShabzakNet System is Online 🚀"}

@app.get("/verify")
async def verify_gateway(military_id: str):
    """שער כניסה ראשי לסריקת חיילים"""
    return await identify_soldier(military_id)

@app.get("/soldiers/profile/{military_id}", response_class=HTMLResponse)
async def get_soldier_profile(military_id: str):
    """דף HTML: כרטיס לוחם (מוצג לאחר סריקה)"""
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier: 
        return "<h1 style='text-align:center; padding-top:50px; direction:rtl;'>❌ חייל לא נמצא במערכת</h1>"
    
    full_photo_url = fix_photo_url(soldier.get('photo_url'))
    
    return f"""
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>כרטיס לוחם: {soldier['full_name']}</title>
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #f0f2f5; margin: 0; padding: 20px; direction: rtl; }}
            .card {{ background: white; width: 100%; max-width: 350px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; margin: 0 auto; }}
            .header {{ background: #1b5e20; padding: 30px 20px; color: white; font-weight: bold; font-size: 20px; }}
            .avatar-container {{ margin-top: 20px; position: relative; display: flex; justify-content: center; }}
            .avatar {{ width: 100px; height: 100px; border-radius: 50%; border: 4px solid #1b5e20; background: #eee; object-fit: cover; }}
            .info {{ padding: 20px; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }}
            .detail-label {{ font-weight: bold; color: #1b5e20; }}
            .footer-status {{ background: #e8f5e9; color: #2e7d32; padding: 15px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">כרטיס לוחם דיגיטלי</div>
            <div class="avatar-container"><img src="{full_photo_url}" class="avatar"></div>
            <div class="info">
                <h1>{soldier.get('rank', '')} {soldier.get('full_name', '')}</h1>
                <div style="color: #666; margin-bottom: 20px;">מספר אישי: {soldier.get('military_id', '')}</div>
                <div class="detail-row"><span class="detail-label">📦 יחידה:</span><span>{soldier.get('unit', 'ללא')}</span></div>
                <div class="detail-row"><span class="detail-label">🎖️ תפקיד:</span><span>{soldier.get('mission_role', 'לוחם')}</span></div>
                <div class="detail-row" style="border-bottom: none;"><span class="detail-label">🚜 כלי משובץ:</span><span style="font-weight: bold;">{soldier.get('assigned_vehicle_id', 'לא משובץ')}</span></div>
            </div>
            <div class="footer-status">✅ הנתונים מאומתים במערכת</div>
        </div>
    </body>
    </html>
    """

@app.get("/vehicle/check/{vehicle_id}", response_class=HTMLResponse)
async def check_vehicle_page(vehicle_id: str):
    """דף HTML: רשימת תכולת רכב (מוצג בסריקת QR של רכב)"""
    all_soldiers = await db.soldiers.find({"assigned_vehicle_id": vehicle_id}, {"_id": 0}).to_list(length=100)
    current_date = datetime.datetime.now().strftime("%d.%m.%Y")

    soldiers_html = ""
    for s in all_soldiers:
        role = s.get('mission_role', 'לוחם')
        soldiers_html += f"""
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
            <div style="text-align: right;">
                <div style="font-weight: bold; font-size: 1.1rem;">{s.get('rank', '')} {s.get('full_name', '')}</div>
                <div style="color: #666; font-size: 0.9rem;">מ"א: {s.get('military_id', '')}</div>
            </div>
            <div style="background: #f1f8e9; color: #1b5e20; padding: 5px 12px; border-radius: 15px; font-weight: bold; font-size: 0.9rem;">
                {role}
            </div>
        </div>
        """

    if not all_soldiers:
        soldiers_html = "<div style='padding: 40px; text-align:center; color: #666;'>אין לוחמים משובצים לכלי זה כרגע</div>"

    return f"""
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>בדיקת כלי: {vehicle_id}</title>
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #f4f6f8; margin: 0; padding: 0; }}
            .header {{ background: #1b5e20; color: white; padding: 30px 20px; text-align: center; }}
            .container {{ background: white; max-width: 500px; margin: 0 auto; border-radius: 0 0 20px 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }}
            .info-bar {{ background: #e8f5e9; padding: 12px; text-align: center; font-size: 0.9rem; font-weight: bold; color: #2e7d32; border-bottom: 1px solid #c8e6c9; }}
            .list-container {{ padding: 10px; }}
            .footer {{ text-align: center; padding: 20px; color: #999; font-size: 0.8rem; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin: 0; font-size: 1.8rem;">שבצ"ק כלי: {vehicle_id}</h1>
        </div>
        <div class="container">
            <div class="info-bar">
                תאריך: {current_date} | סה"כ לוחמים: {len(all_soldiers)}
            </div>
            <div class="list-container">
                {soldiers_html}
            </div>
            <div class="footer">מערכת שבצ"ק-נט - חטיבה מבצעית</div>
        </div>
    </body>
    </html>
    """

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)