import os
import qrcode
import codecs
import csv
import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import HTMLResponse

# ייבוא התשתית מהקובץ database.py
# וודא ש-database.py מעודכן עם ה-IP הנכון!
from database import db, db_sync, SERVER_IP, CURRENT_BASE_URL, STATIC_DIR, QR_DIR, PHOTO_DIR

app = FastAPI()

# הגדרות CORS - קריטי לתקשורת תקינה
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# הגשת קבצים סטטיים
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# --- מודלים (החזרתי את המודל המקורי) ---
class PreAssignedSoldier(BaseModel):
    military_id: str
    full_name: str
    rank: str
    unit: str
    assigned_vehicle_id: str
    photo_url: Optional[str] = None
    mission_role: Optional[str] = "לוחם"

# --- פונקציית עזר לסידור כתובות תמונה (התיקון החדש) ---
# מונעת כפילות של http://.../http://...
def fix_photo_url(url_path):
    if not url_path:
        return ""
    # אם הכתובת כבר מלאה (מתחילה ב-http), לא ניגע בה
    if url_path.startswith("http"):
        return url_path
    # אחרת, נוסיף לה את הכתובת של השרת
    return f"{CURRENT_BASE_URL}{url_path}"


# --- 1. Dashboard (ניהול רכבים וצוותים) ---
@app.get("/vehicles/list")
async def get_vehicles_with_soldiers():
    try:
        # שליפת כל הרכבים והחיילים מה-DB
        vehicles_cursor = await db.vehicles.find({}, {"_id": 0}).to_list(length=100)
        all_soldiers = await db.soldiers.find({}, {"_id": 0}).to_list(length=1000)
        
        vehicles_with_crew = []
        for vehicle in vehicles_cursor:
            v_data = vehicle.copy()
            crew = []
            for s in all_soldiers:
                if str(s.get("assigned_vehicle_id")).strip() == vehicle["id"]:
                    soldier_data = s.copy()
                    # תיקון נתיב תמונה
                    soldier_data["photo_url"] = fix_photo_url(s.get("photo_url"))
                    # שדה חדש: האם החייל עבר אימות סופי ע"י קצין בשטח
                    soldier_data["is_finalized"] = s.get("is_finalized", False)
                    soldier_data["finalized_at"] = s.get("finalized_at", "")
                    crew.append(soldier_data)
            
            v_data["crew"] = crew
            v_data["current_occupancy"] = len(crew)
            # ספירה כמה חיילים כבר אומתו סופית בתוך הכלי הזה
            v_data["finalized_count"] = len([s for s in crew if s.get("is_finalized")])
            vehicles_with_crew.append(v_data)
            
        return vehicles_with_crew
    except Exception as e:
        print(f"Error in Dashboard list: {e}")
        return {"error": str(e)}

# --- 2. ניהול חיילים ו-CSV ---

@app.post("/admin/upload-csv")
async def upload_soldiers_csv(file: UploadFile = File(...)):
    try:

        await db.soldiers.delete_many({})
        await db.vehicles.delete_many({})
        
        content = await file.read()
        
        # קריאת תוכן הקובץ ופיענוח עברית (utf-8-sig)
        content = await file.read()
        decoded = content.decode('utf-8-sig')
        csv_reader = csv.DictReader(decoded.splitlines())
        
        count = 0
        vehicle_count = 0
        
        for row in csv_reader:
            # ניקוי רווחים משמות העמודות והערכים
            clean_row = {k.strip(): v.strip() for k, v in row.items() if k}
            
            military_id = clean_row.get("military_id")
            if not military_id:
                continue

            vehicle_id = clean_row.get("assigned_vehicle_id", "לא משובץ")
            
            # 1. יצירת/עדכון לוחם ב-DB
            soldier = {
                "military_id": military_id,
                "full_name": clean_row.get("full_name", ""),
                "rank": clean_row.get("rank", "טוראי"),
                "unit": clean_row.get("unit", ""),
                "assigned_vehicle_id": vehicle_id,
                "mission_role": clean_row.get("mission_role", "לוחם"),
                "is_finalized": False # איפוס סטטוס אימות בטעינה חדשה
            }
            
            await db.soldiers.update_one(
                {"military_id": military_id},
                {"$set": soldier},
                upsert=True
            )

            # 2. יצירת רכב אוטומטית אם הוא לא קיים (התיקון הקריטי)
            if vehicle_id and vehicle_id != "לא משובץ":
                # נשתמש ב-$setOnInsert כדי ליצור רק אם לא קיים ולא לדרוס נתונים
                res = await db.vehicles.update_one(
                    {"id": vehicle_id},
                    {"$setOnInsert": {
                        "id": vehicle_id,
                        "type": vehicle_id.split('-')[0] if '-' in vehicle_id else "כלי",
                        "current_occupancy": 0,
                        "finalized_count": 0
                    }},
                    upsert=True
                )
                # אם נוצר רכב חדש, נספור אותו
                if res.upserted_id:
                    vehicle_count += 1
            
            count += 1
            
        return {
            "status": "success", 
            "message": f"עודכנו {count} חיילים ונוצרו {vehicle_count} רכבים חדשים"
        }
    except Exception as e:
        print(f"Error processing CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/soldiers/list")
async def get_all_soldiers():
    try:
        soldiers = await db.soldiers.find({}, {"_id": 0}).to_list(length=1000)
        for s in soldiers:
            # --- התיקון: תיקון הנתיב לרשימת הניהול ---
            s["photo_url"] = fix_photo_url(s.get("photo_url"))
            # -----------------------------------------
        return soldiers
    except Exception as e:
        return {"error": str(e)}


@app.post("/admin/assign-soldier")
async def assign_soldier(military_id: str = Form(...), vehicle_id: str = Form(...), override: bool = Form(False)):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier:
        raise HTTPException(status_code=404, detail="חייל לא נמצא במערכת")
    
    current_vehicle = soldier.get("assigned_vehicle_id", "לא משובץ")
    
    # בדיקת דריסה
    if current_vehicle != "לא משובץ" and current_vehicle != vehicle_id and not override:
        raise HTTPException(
            status_code=409, 
            detail=f"שים לב! החייל כבר משובץ ב-{current_vehicle}"
        )
    
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


# --- העלאת תמונה (התיקון החשוב: שמירה יחסית) ---
@app.post("/admin/upload-photo/{military_id}")
async def upload_photo(military_id: str, file: UploadFile = File(...)):
    extension = os.path.splitext(file.filename)[1] or ".png"
    file_name = f"{military_id}{extension}"
    file_path = os.path.join(PHOTO_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # --- התיקון: שמירת נתיב יחסי "נקי" ב-DB ---
    # זה מאפשר לנו לשנות IP בעתיד בלי לשבור את המערכת
    photo_url_path = f"/static/photos/{file_name}"
    
    await db.soldiers.update_one(
        {"military_id": military_id}, 
        {"$set": {"photo_url": photo_url_path}}
    )
    
    # החזרת URL מלא ל-Frontend רק לתצוגה המיידית
    return {
        "status": "success", 
        "photo_url": f"{CURRENT_BASE_URL}{photo_url_path}"
    }


# --- מחיקת תמונה (כדי שהכפתור האדום יעבוד) ---
@app.delete("/admin/delete-photo/{military_id}")
async def delete_photo(military_id: str):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier:
        raise HTTPException(status_code=404, detail="חייל לא נמצא")
    
    photo_url = soldier.get("photo_url")
    if photo_url:
        # ניקוי הנתיב למחיקה (בין אם הוא מלא ובין אם יחסי)
        clean_name = os.path.basename(photo_url.split("?")[0])
        path = os.path.join(PHOTO_DIR, clean_name)
        if os.path.exists(path):
            os.remove(path)
    
    await db.soldiers.update_one(
        {"military_id": military_id},
        {"$set": {"photo_url": ""}}
    )
    return {"status": "success", "message": "התמונה נמחקה"}


# --- 3. מערכת הקיוסק והאימות ---
# --- 3. מערכת הקיוסק והאימות (גרסה מעודכנת - QR קבוע) ---

@app.get("/kiosk/identify/{military_id}")
async def identify_soldier(military_id: str):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier:
        raise HTTPException(status_code=404, detail="חייל לא נמצא")

    qr_file = f"{military_id}.png"
    qr_path = os.path.join(QR_DIR, qr_file)
    
    v_id = soldier.get("assigned_vehicle_id", "לא משובץ")
    
    # --- השינוי המבצעי: הלינק מכיל רק מ"א כדי שה-QR לא ישתנה לעולם ---
    qr_url_to_encode = f"{CURRENT_BASE_URL}/verify?military_id={military_id}"
    # ------------------------------------------------------------------
    
    img = qrcode.make(qr_url_to_encode)
    img.save(qr_path)

    # החזרת כל השדות בדיוק כפי שהיו בקוד המקורי שלך
    return {
        "military_id": soldier["military_id"],
        "full_name": soldier["full_name"],
        "rank": soldier["rank"],
        "unit": soldier.get("unit", "גולני"),
        "mission_role": soldier.get("mission_role", "לוחם"), # נשמר!
        "assigned_vehicle": v_id,
        "qr_url": f"/static/qrcodes/{qr_file}?v={os.path.getmtime(qr_path)}"
    }


# --- הפונקציה שהייתה חסרה! דף פרופיל אישי ---
@app.get("/soldiers/profile/{military_id}", response_class=HTMLResponse)
async def get_soldier_profile(military_id: str):
    soldier = await db.soldiers.find_one({"military_id": military_id})
    if not soldier: 
        return "<h1 style='text-align:center; padding-top:50px;'>❌ חייל לא נמצא במערכת</h1>"
    
    # שימוש בתיקון ה-URL
    full_photo_url = fix_photo_url(soldier.get('photo_url'))
    if not full_photo_url:
        full_photo_url = "https://cdn-icons-png.flaticon.com/512/6142/6142226.png"

    return f"""
    <html dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

# --- 4. מערכת אימות סריקת רכב (הדפים הירוקים) - החזרתי את העיצוב המלא! ---
@app.get("/vehicle/check/{vehicle_id}", response_class=HTMLResponse)
async def check_vehicle_page(vehicle_id: str):
    # שליפת נתוני הכלי והחיילים המשובצים אליו (סינכרוני או אסינכרוני - עדיף אסינכרוני פה)
    all_soldiers = await db.soldiers.find({"assigned_vehicle_id": vehicle_id}, {"_id": 0}).to_list(length=100)
    current_date = datetime.datetime.now().strftime("%d.%m.%Y")

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
                תאריך: {current_date} | לוחמים: {len(all_soldiers)}
            </div>
            <div class="list-container">
                {soldiers_html}
            </div>
            <div class="footer">מערכת שבזאק-נט v2.0 - חטיבה מבצעית</div>
        </div>
    </body>
    </html>
    """

# --- 5. Verify (כרטיס לוחם לסריקה) ---

# --- 5. Verify (כרטיס לוחם לסריקה - גרסה מבצעית עם זיכרון רכב) ---
@app.get("/verify", response_class=HTMLResponse)
async def verify_vehicle_assignment(request: Request, response: Response, vehicle_id: str = None, military_id: str = None):
    # --- תרחיש א': קצין סרק כלי (שמירת "עוגייה" בטלפון) ---
    if vehicle_id:
        content = f"""
        <html dir="rtl"><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family:'Segoe UI', sans-serif; text-align:center; background:#e8f5e9; padding-top:50px;">
            <div style="font-size:60px;">🚜</div>
            <h1 style="color:#1b5e20;">מצב סריקה פעיל</h1>
            <h2 style="background:white; display:inline-block; padding:10px 20px; border-radius:15px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">רכב נבחר: {vehicle_id}</h2>
            <p style="margin-top:20px; color:#666;">כעת סרוק לוחמים כדי לאמת התאמה לכלי זה.</p>
        </body></html>
        """
        resp = HTMLResponse(content=content)
        resp.set_cookie(key="active_vehicle", value=vehicle_id, max_age=10800) # זוכר ל-3 שעות
        return resp

    # --- תרחיש ב': סריקת לוחם (שימוש בזיכרון של הטלפון) ---
    soldier = await db.soldiers.find_one({"military_id": military_id})
    
    # שליפת הרכב שסרקנו קודם מה-Cookie של הטלפון
    active_v = request.cookies.get("active_vehicle")
    
    # הגדרת הרכב לבדיקה: אם הקצין סרק כלי קודם, נבדוק מולו. אם לא, נבדוק מול ה-URL (תואם לאחור).
    target_vehicle = active_v if active_v else vehicle_id
    
    current_date = datetime.datetime.now().strftime("%d.%m.%Y")
    
    # --- טיפול בתמונה כולל Timestamp ו-URL Fix ---
    raw_photo = soldier.get('photo_url') if soldier else None
    if raw_photo:
        full_photo_url = f"{fix_photo_url(raw_photo)}?t={datetime.datetime.now().timestamp()}"
        avatar_content = f'<img src="{full_photo_url}" style="width: 100%; height: 100%; object-fit: cover;">'
        extra_avatar_style = "background: transparent; border: 4px solid #1b5e20;"
    else:
        avatar_content = soldier['full_name'][0] if soldier else "?"
        extra_avatar_style = "background: #f1f8e9; border: 3px solid #1b5e20; color: #1b5e20;"

    style = """
    <style>
        body { 
            margin: 0; padding: 0; direction: rtl; 
            background-color: #f4f6f8; font-family: 'Segoe UI', sans-serif;
            display: flex; justify-content: center; align-items: flex-start;
            min-height: 100vh; padding-top: 20px;
        }
        .card { 
            background: white; width: 92%; max-width: 400px; 
            border-radius: 25px; overflow: hidden;
            box-shadow: 0 12px 30px rgba(0,0,0,0.15); 
            text-align: center;
        }
        .header { 
            background: #1b5e20; color: white; 
            padding: 25px 15px; 
            border-bottom: 5px solid #144316;
        }
        .content { padding: 25px; }
        .avatar-circle { 
            width: 110px; height: 110px; 
            margin: 0 auto 15px; display: flex; align-items: center; 
            justify-content: center; font-size: 45px; font-weight: bold;
            border-radius: 50%;
            overflow: hidden; 
        }
        .info-table { width: 100%; border-spacing: 0; margin-top: 15px; }
        .info-table td { padding: 12px 5px; border-bottom: 1px solid #eee; font-size: 19px; }
        .label { color: #1b5e20; font-weight: bold; text-align: right; }
        .val { text-align: left; }
        .status-banner { 
            margin-top: 25px; padding: 18px; border-radius: 15px; 
            font-size: 24px; font-weight: bold; display: flex; 
            align-items: center; justify-content: center; gap: 10px;
        }
        .ok { background: #e8f5e9; color: #2e7d32; border: 2px solid #2e7d32; }
        .err { background: #ffebee; color: #c62828; border: 2px solid #c62828; }
    </style>
    """

    if not soldier:
        return HTMLResponse(f"<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>{style}</head><body>"
                            f"<div class='card'><div class='header'><h1 style='margin:0;'>שגיאה</h1></div>"
                            f"<div class='content'><div class='status-banner err'>🛑 חייל לא נמצא</div></div></div></body></html>")

    # בדיקת התאמה מול הרכב שהקצין סרק (target_vehicle)
    assigned_v = soldier.get('assigned_vehicle_id')
    is_correct = assigned_v == target_vehicle
    
    # אם יש התאמה והקצין סרק רכב קודם - נעדכן בשרת כאישור סופי
    if is_correct and active_v:
        await db.soldiers.update_one(
            {"military_id": military_id},
            {"$set": {"is_finalized": True, "finalized_at": datetime.datetime.now().strftime("%H:%M")}}
        )

    status_cls = "ok" if is_correct else "err"
    status_icon = "✅" if is_correct else "🛑"
    status_txt = "מאושר שיבוץ סופי" if is_correct else f"טעות! רשום ל: {assigned_v}"

    return HTMLResponse(content=f"""
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
            {style}
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <h1 style="margin:0; font-size: 24px;">שבצ"ק-נט: כרטיס לוחם</h1>
                </div>
                <div class="content">
                    <div class="avatar-circle" style="{extra_avatar_style}">
                        {avatar_content}
                    </div>
                    <h2 style="margin:0; color:#333; font-size: 28px;">{soldier['rank']} {soldier['full_name']}</h2>
                    <div style="color:#666; margin-bottom:15px; font-size: 16px;">מ"א: {soldier['military_id']}</div>
                    
                    {f'<div style="background:#f1f8e9; padding:5px; margin-bottom:10px; border-radius:10px; color:#1b5e20; font-size:14px;">בדיקה מול כלי: <b>{target_vehicle}</b></div>' if target_vehicle else ''}
                    
                    <table class="info-table">
                        <tr><td class="label">📦 יחידה:</td><td class="val">{soldier.get('unit', 'גולני')}</td></tr>
                        <tr><td class="label">🎖️ תפקיד:</td><td class="val">{soldier.get('mission_role', 'לוחם')}</td></tr>
                        <tr><td class="label">🚜 כלי יעד:</td><td class="val" style="font-weight:bold; color:#1b5e20;">{assigned_v}</td></tr>
                    </table>
                    <div class="status-banner {status_cls}">
                        <span>{status_icon}</span> {status_txt}
                    </div>
                    <div style="margin-top:20px; font-size:14px; color:#999; font-weight: bold;">תאריך: {current_date}</div>
                </div>
            </div>
        </body>
    </html>
    """)

# --- 6. יצירת QR לרכבים (גרסה מעודכנת להפעלת מצב סריקה) ---
@app.post("/admin/vehicle-qr/{vehicle_id}")
async def generate_vehicle_qr(vehicle_id: str):
    # השינוי: הלינק מוביל ל-/verify כדי להפעיל את ה-Cookie בטלפון של הקצין
    verify_link = f"{CURRENT_BASE_URL}/verify?vehicle_id={vehicle_id}"
    
    qr_img = qrcode.make(verify_link)
    file_name = f"vehicle_{vehicle_id}.png"
    qr_img.save(os.path.join(QR_DIR, file_name))
    
    # החזרת אובייקט שתואם לציפיות של ה-Frontend (KioskPage)
    return {
        "status": "created", 
        "qr_url": f"/static/qrcodes/{file_name}", 
        "link": verify_link,
        "isVehicle": True
    }


@app.post("/admin/clear-database")
async def clear_database():
    """
    מוחק את כל החיילים והרכבים מהמערכת - לשימוש לפני טעינה מחדש
    """
    try:
        await db.soldiers.delete_many({})
        await db.vehicles.delete_many({})
        return {"status": "success", "message": "הנתונים נמחקו בהצלחה"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vehicles/{vehicle_id}/reset")
async def reset_vehicle_verification(vehicle_id: str):
    """
    מאפס את סטטוס האימות (V ירוק) לכל הלוחמים ברכב ספציפי ב-MongoDB.
    """
    try:
        # עדכון כל החיילים שמשובצים לרכב הספציפי
        result = await db.soldiers.update_many(
            {"assigned_vehicle_id": vehicle_id},
            {"$set": {
                "is_finalized": False,
                "finalized_at": None
            }}
        )
        
        return {
            "status": "success", 
            "message": f"Reset {result.modified_count} soldiers", 
            "reset_count": result.modified_count
        }
    except Exception as e:
        print(f"Error resetting vehicle: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    


@app.post("/admin/reset-all-verifications")
async def reset_all_soldiers_verification():
    """
    מאפס את ה-V הירוק לכל הלוחמים במערכת (לכל הכלים).
    """
    try:
        result = await db.soldiers.update_many(
            {}, # ללא פילטר - תופס את כולם
            {"$set": {
                "is_finalized": False,
                "finalized_at": None
            }}
        )
        return {"status": "success", "reset_count": result.modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))    

if __name__ == "__main__":
    import uvicorn
    # הפעלה על כל הממשקים כדי לאפשר גישה מהטלפון
    uvicorn.run(app, host="0.0.0.0", port=8080)