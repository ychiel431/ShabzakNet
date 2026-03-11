import os
import shutil
import csv
import codecs
import qrcode
import io
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import FileResponse, JSONResponse

# ייבוא התשתית
from database import (
    db, 
    vehicles_col, 
    soldiers_col, 
    CURRENT_BASE_URL, 
    QR_DIR, 
    PHOTO_DIR,
    STATIC_DIR
)

router = APIRouter()

# ---------------------------------------------------------
# 1. העלאת קובץ CSV (גרסת "כיפת ברזל" - מזהה ומתקנת הכל)
# ---------------------------------------------------------
@router.post("/upload-csv")
async def upload_soldiers_csv(file: UploadFile = File(...)):
    try:
        content_bytes = await file.read()
        if not content_bytes:
            raise HTTPException(status_code=400, detail="הקובץ ריק")
            
        try:
            decoded = content_bytes.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                decoded = content_bytes.decode('cp1255')
            except:
                raise HTTPException(status_code=400, detail="שגיאת קידוד בקובץ")

        f = io.StringIO(decoded)
        sample = decoded[:2000]
        delimiter = ';' if ';' in sample and ',' not in sample else ','
        
        csv_reader = csv.DictReader(f, delimiter=delimiter, skipinitialspace=True)
        raw_headers = csv_reader.fieldnames or []
        headers = [h.strip().replace('"', '').replace("'", "") for h in raw_headers]
        csv_reader.fieldnames = headers

        has_id = any(h.lower() in ["military_id", "מספר אישי"] for h in headers)
        if not has_id:
             raise HTTPException(status_code=400, detail=f"חסרה עמודת מזהה. נמצאו: {headers}")

        # ניקוי DB רק לאחר וידוא קובץ
        await db.soldiers.delete_many({})
        await db.vehicles.delete_many({})
        
        count = 0
        vehicle_count = 0
        
        for row in list(csv_reader):
            def clean_val(keys):
                for k in keys:
                    for row_key in row.keys():
                        if row_key and k.lower() == str(row_key).lower().strip():
                            val = row[row_key]
                            return str(val).strip().replace('"', '') if val else ""
                return ""

            m_id = clean_val(["military_id", "מספר אישי"])
            if not m_id or not any(c.isdigit() for c in m_id): continue

            name = clean_val(["full_name", "שם מלא"]) or "לוחם"
            v_id = clean_val(["assigned_vehicle_id", "שיבוץ", "vehicle_id"])
            if v_id.lower() in ["null", "none", "", "לא משובץ"]: v_id = "לא משובץ"
            
            await db.soldiers.insert_one({
                "military_id": m_id,
                "full_name": name,
                "rank": clean_val(["rank", "דרגה"]) or "טוראי",
                "unit": clean_val(["unit", "יחידה"]) or "",
                "assigned_vehicle_id": v_id,
                "mission_role": clean_val(["mission_role", "תפקיד"]) or "לוחם",
                "is_finalized": False,
                "photo_url": "" 
            })
            
            if v_id != "לא משובץ":
                cap = 11 if "NAMER" in v_id.upper() else (12 if "ZEEV" in v_id.upper() else 4)
                res = await db.vehicles.update_one(
                    {"id": v_id},
                    {"$setOnInsert": {"id": v_id, "type": v_id.split('-')[0] if '-' in v_id else "כלי", "current_occupancy": 0, "capacity": cap, "finalized_count": 0}},
                    upsert=True
                )
                if res.upserted_id: vehicle_count += 1
            count += 1
            
        return {"status": "success", "message": f"נטענו {count} לוחמים ו-{vehicle_count} רכבים."}
    except HTTPException: raise
    except Exception as e:
        print(f"FATAL CSV ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 2. רשימת רכבים (מלאה)
# ---------------------------------------------------------
@router.get("/vehicles/list")
async def get_vehicles_with_soldiers():
    try:
        vehicles_cursor = await db.vehicles.find().to_list(length=100)
        all_soldiers = await db.soldiers.find().to_list(length=2000)
        vehicles_with_crew = []
        for vehicle in vehicles_cursor:
            v_data = vehicle.copy()
            v_data["_id"] = str(v_data["_id"])
            v_id = str(v_data.get("id")).strip()
            crew = []
            for s in all_soldiers:
                if str(s.get("assigned_vehicle_id")).strip() == v_id:
                    s_copy = s.copy()
                    s_copy["_id"] = str(s_copy["_id"])
                    crew.append(s_copy)
            v_data["crew"] = crew
            v_data["current_occupancy"] = len(crew)
            v_data["finalized_count"] = len([s for s in crew if s.get("is_finalized")])
            vehicles_with_crew.append(v_data)
        return vehicles_with_crew
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 3. רשימת חיילים (המלאה - ללא כפילויות נתיבים)
# ---------------------------------------------------------
@router.get("/soldiers/list")
async def get_all_soldiers():
    try:
        return await db.soldiers.find({}, {"_id": 0}).to_list(length=2000)
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 4. שיבוץ וביטול שיבוץ (עם כל הבדיקות שדרשת)
# ---------------------------------------------------------
@router.post("/assign-soldier")
async def assign_soldier(military_id: str = Form(...), vehicle_id: str = Form(...), override: bool = Form(False)):
    try:
        soldier = await db.soldiers.find_one({"military_id": military_id})
        if not soldier: raise HTTPException(status_code=404, detail="חייל לא נמצא")
        
        curr = soldier.get("assigned_vehicle_id", "לא משובץ")
        if curr != "לא משובץ" and curr != vehicle_id and not override:
            raise HTTPException(status_code=409, detail=f"החייל כבר משובץ ב-{curr}")
            
        await db.soldiers.update_one({"military_id": military_id}, {"$set": {"assigned_vehicle_id": vehicle_id}})
        return {"status": "success", "message": "שיבוץ בוצע"}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.post("/unassign-soldier")
async def unassign_soldier(military_id: str = Form(...)):
    try:
        result = await db.soldiers.update_one({"military_id": military_id}, {"$set": {"assigned_vehicle_id": "לא משובץ"}})
        if result.matched_count == 0: raise HTTPException(status_code=404, detail="חייל לא נמצא")
        return {"status": "success", "message": "השיבוץ בוטל"}
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 5. ניהול תמונות (יחסי ובטוח)
# ---------------------------------------------------------
@router.post("/upload-photo/{military_id}")
async def upload_photo(military_id: str, file: UploadFile = File(...)):
    try:
        ext = os.path.splitext(file.filename)[1] or ".png"
        fname = f"{military_id}{ext}"
        path = os.path.join(PHOTO_DIR, fname)
        with open(path, "wb") as buffer: buffer.write(await file.read())
        photo_url = f"/static/photos/{fname}"
        await db.soldiers.update_one({"military_id": military_id}, {"$set": {"photo_url": photo_url}})
        return {"status": "success", "photo_url": photo_url}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete-photo/{military_id}")
async def delete_photo(military_id: str):
    try:
        soldier = await db.soldiers.find_one({"military_id": military_id})
        if soldier and soldier.get("photo_url"):
            p = os.path.join(PHOTO_DIR, os.path.basename(soldier["photo_url"]))
            if os.path.exists(p): os.remove(p)
        await db.soldiers.update_one({"military_id": military_id}, {"$set": {"photo_url": ""}})
        return {"status": "success"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 6. איפוסים ו-QR
# ---------------------------------------------------------
@router.post("/vehicle-qr/{vehicle_id}")
async def generate_vehicle_qr(vehicle_id: str):
    try:
        link = f"{CURRENT_BASE_URL}/kiosk/verify?vehicle_id={vehicle_id}"
        qr_img = qrcode.make(link)
        fname = f"vehicle_{vehicle_id}.png"
        qr_img.save(os.path.join(QR_DIR, fname))
        return {"status": "created", "qr_url": f"/static/qrcodes/{fname}", "isVehicle": True, "mainDetail": f"רכב: {vehicle_id}"}
    except Exception as e: raise HTTPException(status_code=500, detail="QR error")

@router.post("/vehicles/{vehicle_id}/reset")
async def reset_vehicle(vehicle_id: str):
    await db.soldiers.update_many({"assigned_vehicle_id": vehicle_id}, {"$set": {"is_finalized": False, "finalized_at": None}})
    return {"status": "success"}

@router.post("/reset-all-verifications")
async def reset_all():
    await db.soldiers.update_many({}, {"$set": {"is_finalized": False, "finalized_at": None}})
    return {"status": "success"}

@router.post("/clear-database")
async def clear_database():
    await db.soldiers.delete_many({}); await db.vehicles.delete_many({})
    return {"status": "success"}