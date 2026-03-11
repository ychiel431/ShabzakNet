import os
import qrcode
import datetime
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse

# ייבוא התשתית
from database import db, CURRENT_BASE_URL, QR_DIR, PHOTO_DIR

router = APIRouter()

# --- פונקציית עזר לסידור כתובות תמונה ---
def fix_photo_url(url_path):
    if not url_path:
        return ""
    if url_path.startswith("http"):
        return url_path
    return f"{CURRENT_BASE_URL}{url_path}"

# ---------------------------------------------------------------------
# פונקציה 1: עבור הדשבורד (JSON) + יצירת QR
# ---------------------------------------------------------------------
@router.get("/identify/{military_id}")
async def identify_soldier(military_id: str):
    # 1. עדכון סטטוס "הגיע" (V ירוק) אבל טרם אומת לכלי
    soldier = await db.soldiers.find_one_and_update(
        {"military_id": military_id},
        {"$set": {
            "last_seen": datetime.datetime.now().strftime("%H:%M")
        }},
        return_document=True
    )
    
    if not soldier:
        raise HTTPException(status_code=404, detail="חייל לא נמצא")

    # 2. יצירת ה-QR
    qr_file = f"{military_id}.png"
    qr_path = os.path.join(QR_DIR, qr_file)
    qr_url_to_encode = f"{CURRENT_BASE_URL}/kiosk/verify?military_id={military_id}"
    
    img = qrcode.make(qr_url_to_encode)
    img.save(qr_path)

    v_id = soldier.get("assigned_vehicle_id", "לא משובץ")
    
    return {
        "military_id": soldier["military_id"],
        "full_name": soldier["full_name"],
        "rank": soldier.get("rank", ""),
        "unit": soldier.get("unit", "כללי"),
        "mission_role": soldier.get("mission_role", "לוחם"),
        "assigned_vehicle": v_id,
        "is_finalized": soldier.get("is_finalized", False),
        "photo_url": fix_photo_url(soldier.get("photo_url", "")),
        "qr_url": f"/static/qrcodes/{qr_file}?v={os.path.getmtime(qr_path)}"
    }

# ---------------------------------------------------------------------
# פונקציה 2: עבור הטלפון - העיצוב החדש והיפה (ללא חפיפה)
# ---------------------------------------------------------------------
@router.get("/verify", response_class=HTMLResponse)
async def verify_scan(request: Request, response: Response, military_id: str = None, vehicle_id: str = None):
    
    # --- תרחיש א': סריקת רכב (מצב בחירת כלי) ---
    if vehicle_id:
        content = f"""
        <html dir="rtl"><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>רכב נבחר: {vehicle_id}</title>
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #e8f5e9; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
            .card {{ background: white; padding: 40px; border-radius: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 400px; }}
            .icon {{ font-size: 80px; margin-bottom: 20px; }}
            h1 {{ color: #1b5e20; margin: 0; font-weight: 800; }}
            .badge {{ background: #1b5e20; color: white; padding: 10px 20px; border-radius: 50px; font-size: 1.5em; margin-top: 20px; display: inline-block; }}
        </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">🚜</div>
                <h1>מצב סריקה פעיל</h1>
                <div class="badge">{vehicle_id}</div>
                <p style="color: #666; margin-top: 20px;">הכלי הוגדר בהצלחה.<br>כעת סרוק את כרטיסי הלוחמים.</p>
                <button onclick="window.location.href='about:blank'" style="margin-top:30px; padding:12px 30px; border:none; background:#eee; color:#333; border-radius:10px; font-weight:bold;">סגור</button>
            </div>
        </body></html>
        """
        resp = HTMLResponse(content=content)
        resp.set_cookie(key="active_vehicle", value=vehicle_id, max_age=10800)
        return resp

    # --- תרחיש ב': סריקת חייל (הכרטיס היפה) ---
    soldier = await db.soldiers.find_one({"military_id": military_id})
    active_vehicle = request.cookies.get("active_vehicle")
    
    # CSS מתקדם לעיצוב הכרטיס
    style = """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;800&display=swap');
        
        body { margin: 0; padding: 0; direction: rtl; background-color: #f0f2f5; font-family: 'Heebo', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        
        .card { 
            background: white; 
            width: 90%; 
            max-width: 380px; 
            border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.08); 
            overflow: hidden; 
            position: relative;
            text-align: center;
        }

        /* החלק הירוק העליון */
        .header-bg {
            background-color: #1b5e20;
            height: 70px; /* הקטנתי קצת את הגובה */
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .header-title {
            color: rgba(255,255,255,0.9);
            font-size: 1rem;
            font-weight: bold;
        }

        /* תמונת הלוחם - מתחת לכותרת */
        .avatar-container {
            margin-top: 20px; /* רווח מלמעלה במקום משיכה שלילית */
            margin-bottom: 10px;
            display: flex;
            justify-content: center;
        }

        .avatar { 
            width: 120px; 
            height: 120px; 
            border-radius: 50%; 
            object-fit: cover; 
            border: 5px solid #f0f2f5; /* מסגרת בצבע הרקע */
            box-shadow: 0 5px 15px rgba(0,0,0,0.1); 
            background: #eee;
        }

        .no-avatar {
            width: 120px; height: 120px; border-radius: 50%; border: 5px solid #f0f2f5; 
            background: #e0e0e0; display: flex; align-items: center; justify-content: center; 
            font-size: 40px; color: #757575; box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        /* פרטי הלוחם */
        .info-section { padding: 10px 25px 25px 25px; }
        
        h2 { margin: 0 0 5px 0; color: #1e293b; font-size: 1.8rem; font-weight: 800; }
        .mid { color: #64748b; font-size: 1rem; margin-bottom: 25px; display: block; }

        /* שורות המידע עם האייקונים */
        .data-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 0; 
            border-bottom: 1px solid #f1f5f9;
        }
        .data-row:last-child { border-bottom: none; }

        .label-group { display: flex; align-items: center; gap: 8px; color: #64748b; font-weight: bold; }
        .value { font-weight: 800; color: #334155; font-size: 1.1rem; }

        /* סטטוס תחתון */
        .footer-status {
            padding: 18px;
            font-weight: 800;
            font-size: 1.2rem;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .status-ok { background: #4caf50; }
        .status-err { background: #e53935; }
        .status-neutral { background: #ff9800; }

    </style>
    """

    if not soldier:
        return HTMLResponse(f"<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>{style}</head><body>"
                            f"<div class='card'><div class='header-bg'></div><div style='padding:40px;'><h1>❌ שגיאה</h1><p>חייל לא נמצא במערכת</p></div></div></body></html>")

    full_name = soldier.get('full_name', 'לא ידוע')
    rank = soldier.get('rank', '')
    unit = soldier.get('unit', 'כללי')
    role = soldier.get('mission_role', 'לוחם')
    assigned_v = soldier.get('assigned_vehicle_id', 'לא משובץ')
    
    # תמונה
    photo_url = soldier.get('photo_url')
    if photo_url:
        full_url = f"{fix_photo_url(photo_url)}?t={datetime.datetime.now().timestamp()}"
        img_tag = f'<img src="{full_url}" class="avatar">'
    else:
        img_tag = f'<div class="no-avatar">{full_name[0]}</div>'

    # לוגיקה
    is_correct = False
    status_text = ""
    status_class = "status-neutral"
    icon_status = "⚠️"

    if active_vehicle:
        if str(assigned_v).strip() == str(active_vehicle).strip():
            is_correct = True
            status_text = "לוחם מאושר לשיבוץ"
            status_class = "status-ok"
            icon_status = "✅"
            
            # עדכון DB
            await db.soldiers.update_one(
                {"military_id": military_id},
                {"$set": {
                    "is_finalized": True, 
                    "finalized_at": datetime.datetime.now().strftime("%H:%M")
                }}
            )
        else:
            is_correct = False
            status_text = f"שגיאה! שייך ל: {assigned_v}"
            status_class = "status-err"
            icon_status = "🛑"
    else:
        # מצב צפייה בלבד
        is_correct = (assigned_v != 'לא משובץ')
        status_text = f"סטטוס: {assigned_v}"
        status_class = "status-ok" if is_correct else "status-neutral"
        icon_status = "ℹ️"

    return HTMLResponse(content=f"""
    <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>כרטיס לוחם</title>
            {style}
        </head>
        <body>
            <div class="card">
                <div class="header-bg">
                    <div class="header-title">שבצ"ק דיגיטלי - כרטיס לוחם</div>
                </div>

                <div class="avatar-container">
                    {img_tag}
                </div>

                <div class="info-section">
                    <h2>{rank} {full_name}</h2>
                    <span class="mid">מספר אישי: {military_id}</span>
                    
                    <div style="margin-top: 20px;">
                        <div class="data-row">
                            <span class="label-group">📦 יחידה:</span>
                            <span class="value">{unit}</span>
                        </div>
                        <div class="data-row">
                            <span class="label-group">🎖️ תפקיד:</span>
                            <span class="value">{role}</span>
                        </div>
                        <div class="data-row">
                            <span class="label-group">🚜 כלי משובץ:</span>
                            <span class="value">{assigned_v}</span>
                        </div>
                    </div>
                </div>

                <div class="footer-status {status_class}">
                    {status_text} {icon_status}
                </div>
            </div>
        </body>
    </html>
    """)