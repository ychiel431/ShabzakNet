import csv
import codecs
from pymongo import MongoClient

# 1. חיבור למסד הנתונים
client = MongoClient("mongodb://127.0.0.1:27017")
db = client.shabzak_db

def sync_vehicles_from_csv(file_path):
    unique_vehicles = set()
    
    print(f"--- מתחיל סריקת קובץ: {file_path} ---")
    
    try:
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                v_id = row.get('assigned_vehicle_id', '').strip()
                # מסננים שדות ריקים או כאלו שסומנו כ"לא משובץ"
                if v_id and v_id != "לא משובץ":
                    unique_vehicles.add(v_id)
        
        if not unique_vehicles:
            print("לא נמצאו רכבים תקינים בקובץ.")
            return

        print(f"נמצאו {len(unique_vehicles)} רכבים ייחודיים: {unique_vehicles}")

        # 2. הכנת הנתונים להזרקה
        vehicles_data = []
        for v_id in sorted(list(unique_vehicles)):
            # קביעת סוג הרכב לפי השם (לוגיקה בסיסית)
            v_type = "tank" if "MERKAVA" in v_id.upper() else \
                     "apc" if "NAMER" in v_id.upper() else \
                     "jeep" if "HUMMER" in v_id.upper() else "protected_vehicle"
            
            # קביעת קיבולת ברירת מחדל
            capacity = 4 if v_type == "tank" else 12 if v_type == "apc" else 8
            
            vehicles_data.append({
                "id": v_id,
                "name": v_id.replace("-", " "), # הופך MERKAVA-4 למרכבה 4
                "capacity": capacity,
                "type": v_type
            })

        # 3. עדכון ה-Collection במונגו
        db.vehicles.drop() # מנקה רשימה ישנה
        db.vehicles.insert_many(vehicles_data)
        
        print(f"✅ הצלחה: {len(vehicles_data)} רכבים עודכנו ב-Collection 'vehicles'.")

    except Exception as e:
        print(f"שגיאה במהלך הסריקה: {e}")

if __name__ == "__main__":
    # וודא שהשם של הקובץ תואם למה שיש לך בתיקייה
    sync_vehicles_from_csv("soldiers_200.csv")