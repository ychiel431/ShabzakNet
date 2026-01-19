import os
import qrcode
import codecs
import csv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import HTMLResponse

# ייבוא התשתית מהקובץ החדש - מוודא סנכרון מלא עם ה-IP וה-DB
from database import db, db_sync, SERVER_IP, CURRENT_BASE_URL, STATIC_DIR, QR_DIR, PHOTO_DIR

app = FastAPI()

# הגדרות CORS - מאפשר ל-Frontend לתקשר עם השרת
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# הגשת קבצים סטטיים (תמונות ו-QR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# --- מודלים ---
class PreAssignedSoldier(BaseModel):
    military_id: str
    full_name: str
    rank: str
    unit: str
    assigned_vehicle_id: str
    mission_role: Optional[str] = "לוחם"

# --- 1. Dashboard (ניהול רכבים וצוותים) ---

@app.get("/vehicles/list")
def get_vehicles_with_soldiers():
    try:
        # שליפת נתונים דרך החיבור הסינכרוני המרוכז ב-database.py
        vehicles_cursor = list(db_sync.vehicles.find({}, {"_id": 0}))
        all_soldiers = list(db_sync.soldiers.find({}, {"_id": 0}))
        
        vehicles_with_crew = []
        for vehicle in vehicles_cursor:
            v_data = vehicle.copy()
            # סינון חיילים לפי הרכב המשובץ
            crew = [s for s in all_soldiers if str(s.get("assigned_vehicle_id")).strip() == vehicle["id"]]
            v_data["crew"] = crew
            v_data["current_occupancy"] = len(crew)
            vehicles_with_crew.append(v_data)
        return vehicles_with_crew
    except Exception as e:
        return {"error": str(e)}

# --- 2. ניהול חיילים ו-CSV ---

@app.post("/admin/upload-csv")
async def upload_soldiers_csv(file: UploadFile = File(...)):
    csv_reader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8-sig'))
    count = 0
    for row in csv_reader:
        clean_row = {k.strip(): v.strip() for k, v in row.items() if k}
        if "military_id" in clean_row and clean_row["military_id"]:
            soldier = {
                "military_id": clean_row["military_id"],
                "full_name": clean_row.get("full_name", ""),
                "rank": clean_row.get("rank", "טוראי"),
                "unit": clean_row.get("unit", ""),
                "assigned_vehicle_id": clean_row.get("assigned_vehicle_id", "לא משובץ"),
                "mission_role": clean_row.get("mission_role", "לוחם"),
                "photo_url": "" 
            }
            # עדכון ב-DB האסינכרוני
            await db.soldiers.update_one(
                {"military_id": soldier["military_id"]},
                {"$set": soldier},
                upsert=True
            )
            count += 1
    return {"status": "success", "message": f"עודכנו {count} חיילים"}


# --- ניהול חיילים כללי (לניהול כ"א) ---
@app.get("/admin/soldiers/list")
async def get_all_soldiers():
    try:
        soldiers = await db.soldiers.find({}, {"_id": 0}).to_list(length=1000)
        return soldiers
    except Exception as e:
        return {"error": str(e)}
    
# --- לוגיקת שיבוץ לוחמים (הוספה/הסרה) ---
@app.post("/admin/assign-soldier")
async def assign_soldier(
    military_id: str = Form(...), 
    vehicle_id: str = Form(...), 
    override: bool = Form(False) # פרמטר חדש: האם לדרוס?
):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier:
        raise HTTPException(status_code=404, detail="חייל לא נמצא במערכת")
    
    current_vehicle = soldier.get("assigned_vehicle_id", "לא משובץ")
    
    # מנגנון בטיחות: אם החייל משובץ במקום אחר, והמפקד לא לחץ "אישור" לדריסה
    if current_vehicle != "לא משובץ" and current_vehicle != vehicle_id and not override:
        # מחזירים קוד שגיאה 409 (Conflict) עם פרטי השיבוץ הנוכחי
        raise HTTPException(
            status_code=409, 
            detail=f"שים לב! החייל כבר משובץ ב-{current_vehicle}"
        )
    
    # ביצוע השיבוץ (עדכון)
    await db.soldiers.update_one(
        {"military_id": military_id},
        {"$set": {"assigned_vehicle_id": vehicle_id}}
    )
    return {"status": "success", "message": f"חייל {military_id} שובץ לכלי {vehicle_id}"}

@app.post("/admin/unassign-soldier")
async def unassign_soldier(military_id: str = Form(...)):
    await db.soldiers.update_one(
        {"military_id": military_id},
        {"$set": {"assigned_vehicle_id": "לא משובץ"}}
    )
    return {"status": "success", "message": "השיבוץ בוטל"}    

# --- הפקת QR לרכב (להדבקה על הכלי) ---
@app.get("/admin/vehicle-qr/{vehicle_id}")
async def get_vehicle_qr_link(vehicle_id: str):
    qr_file = f"vehicle_{vehicle_id}.png"
    qr_path = os.path.join(QR_DIR, qr_file)
    # הלינק מוביל לדף האימות/סטטוס של הכלי
    qr_url_to_encode = f"{CURRENT_BASE_URL}/vehicle/check/{vehicle_id}"
    
    img = qrcode.make(qr_url_to_encode)
    img.save(qr_path)
    
    return {"qr_url": f"/static/qrcodes/{qr_file}?v={os.path.getmtime(qr_path)}"}


@app.post("/admin/upload-photo/{military_id}")
async def upload_photo(military_id: str, file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    file_name = f"{military_id}{ext}"
    file_path = os.path.join(PHOTO_DIR, file_name)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    photo_url = f"/static/photos/{file_name}"
    await db.soldiers.update_one({"military_id": military_id}, {"$set": {"photo_url": photo_url}})
    return {"status": "success", "photo_url": photo_url}


# --- 3. מערכת הקיוסק (זיהוי חייל והפקת QR) ---
@app.get("/kiosk/identify/{military_id}")
async def identify_soldier(military_id: str):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier:
        raise HTTPException(status_code=404, detail="חייל לא נמצא")

    qr_file = f"{military_id}.png"
    qr_path = os.path.join(QR_DIR, qr_file)
    qr_url_to_encode = f"{CURRENT_BASE_URL}/soldiers/profile/{military_id}"
    
    img = qrcode.make(qr_url_to_encode)
    img.save(qr_path)

    # החזרת כל השדות הנדרשים לסנכרון מלא עם ה-Frontend
    return {
        "military_id": soldier["military_id"],
        "full_name": soldier["full_name"],
        "rank": soldier["rank"],
        "unit": soldier.get("unit", "גולני"), # ערך ברירת מחדל אחיד
        "mission_role": soldier.get("mission_role", "לוחם"), # ערך ברירת מחדל אחיד
        "assigned_vehicle": soldier.get("assigned_vehicle_id", "לא משובץ"),
        "qr_url": f"/static/qrcodes/{qr_file}?v={os.path.getmtime(qr_path)}"
    }

@app.get("/soldiers/profile/{military_id}", response_class=HTMLResponse)
async def get_soldier_profile(military_id: str):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier: 
        return "<h1 style='text-align:center; padding-top:50px;'>❌ חייל לא נמצא במערכת</h1>"
    
    photo_url = soldier.get('photo_url')
    full_photo_url = f"http://{SERVER_IP}:8080{photo_url}" if photo_url else "https://cdn-icons-png.flaticon.com/512/6142/6142226.png"

    return f"""
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }}
            .card {{ background: white; width: 90%; max-width: 350px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; border-top: 8px solid #1b5e20; }}
            .header {{ background: #1b5e20; padding: 20px; color: white; }}
            .avatar-container {{ margin-top: -50px; position: relative; }}
            .avatar {{ width: 100px; height: 100px; border-radius: 50%; border: 5px solid white; background: #eee; object-fit: cover; }}
            .info {{ padding: 20px; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }}
            .detail-label {{ font-weight: bold; color: #1b5e20; }}
            .footer-status {{ background: #e8f5e9; color: #2e7d32; padding: 10px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header"><div style="font-size: 18px; font-weight: bold;">שבצ"ק-נט: כרטיס לוחם</div></div>
            <div class="avatar-container"><img src="{full_photo_url}" class="avatar"></div>
            <div class="info">
                <h1>{soldier['rank']} {soldier['full_name']}</h1>
                <div style="color: #666; margin-bottom: 20px;">מספר אישי: {soldier['military_id']}</div>
                <div class="detail-row"><span class="detail-label">📦 יחידה:</span><span>{soldier.get('unit', 'גולני')}</span></div>
                <div class="detail-row"><span class="detail-label">🎖️ תפקיד:</span><span>{soldier.get('mission_role', 'לוחם')}</span></div>
                <div class="detail-row" style="border-bottom: none;"><span class="detail-label">🚜 כלי משובץ:</span><span style="font-weight: bold;">{soldier['assigned_vehicle_id']}</span></div>
            </div>
            <div class="footer-status">✅ לוחם מאושר לשיבוץ</div>
        </div>
    </body>
    </html>
    """

# --- 4. מערכת אימות סריקת רכב (הדפים הירוקים) ---
@app.get("/vehicle/check/{vehicle_id}", response_class=HTMLResponse)
async def check_vehicle_page(vehicle_id: str):
    # שליפת נתוני הכלי והחיילים המשובצים אליו
    all_soldiers = list(db_sync.soldiers.find({"assigned_vehicle_id": vehicle_id}, {"_id": 0}))
    current_date = "19.1.2026" # תאריך מעודכן

    # יצירת רשימת החיילים ב-HTML עם עיצוב אלגנטי
    soldiers_html = ""
    for s in all_soldiers:
        soldiers_html += f"""
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
            <div style="text-align: right;">
                <div style="font-weight: bold; font-size: 1.1rem;">{s.get('rank', '')} {s.get('full_name', '')}</div>
                <div style="color: #666; font-size: 0.9rem;">מ"א: {s.get('military_id', '')}</div>
            </div>
            <div style="background: #f1f8e9; color: #1b5e20; padding: 5px 12px; border-radius: 15px; font-weight: bold; font-size: 0.9rem;">
                {s.get('mission_role', 'לוחם')}
            </div>
        </div>
        """

    # אם הכלי ריק
    if not all_soldiers:
        soldiers_html = "<div style='padding: 40px; color: #666;'>אין לוחמים משובצים לכלי זה כרגע</div>"

    return f"""
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #f4f6f8; margin: 0; padding: 20px; }}
            .container {{ background: white; max-width: 500px; margin: 0 auto; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-top: 10px solid #1b5e20; }}
            .header {{ background: #1b5e20; color: white; padding: 25px; text-align: center; }}
            .info-bar {{ background: #e8f5e9; padding: 10px; text-align: center; font-size: 0.9rem; font-weight: bold; color: #2e7d32; border-bottom: 1px solid #c8e6c9; }}
            .list-container {{ padding: 10px; }}
            .footer {{ text-align: center; padding: 20px; color: #999; font-size: 0.8rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 1.8rem;">שבצ"ק כלי: {vehicle_id}</h1>
            </div>
            <div class="info-bar">
                תאריך שיבוץ: {current_date} | סה"כ משובצים: {len(all_soldiers)}
            </div>
            <div class="list-container">
                {soldiers_html}
            </div>
            <div class="footer">מערכת שבזאק-נט v2.0 - ניהול חמ"ל</div>
        </div>
    </body>
    </html>
    """

@app.post("/vehicle/verify", response_class=HTMLResponse)
async def verify_vehicle_assignment(vehicle_id: str = Form(...), military_id: str = Form(...)):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    style = "text-align:center; font-family:Arial; padding:100px; color:white; height:100vh;"
    
    if not soldier:
        return HTMLResponse(f"<div style='{style} background:#d32f2f;'><h1>שגיאה</h1><p>מספר אישי לא קיים</p></div>")
    
    if soldier['assigned_vehicle_id'] == vehicle_id:
        return HTMLResponse(f"<div style='{style} background:#2e7d32;'><h1 style='font-size:80px;'>✅</h1><h1>מאושר!</h1><h2>{soldier['rank']} {soldier['full_name']}</h2><p>התייצבת בהצלחה בכלי {vehicle_id}</p></div>")
    else:
        return HTMLResponse(f"<div style='{style} background:#d32f2f;'><h1 style='font-size:80px;'>🛑</h1><h1>טעות בכלי</h1><h2>{soldier['full_name']}, אינך שייך לכלי {vehicle_id}</h2><h3>הכלי שלך הוא: {soldier['assigned_vehicle_id']}</h3></div>")

# --- 5. ניהול QR לרכבים (למפקד) ---

@app.post("/admin/vehicle-qr/{vehicle_id}")
async def generate_vehicle_qr(vehicle_id: str):
    verify_link = f"{CURRENT_BASE_URL}/vehicle/check/{vehicle_id}"
    qr_img = qrcode.make(verify_link)
    file_name = f"vehicle_{vehicle_id}.png"
    qr_img.save(os.path.join(QR_DIR, file_name))
    return {"status": "created", "qr_url": f"/static/qrcodes/{file_name}", "link": verify_link}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)