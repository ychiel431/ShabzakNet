import csv
import random

# --- מאגר נתונים ליצירה רנדומלית ---
first_names = ["יוסי", "דוד", "משה", "אבי", "דני", "גיא", "עומר", "עידן", "רועי", "איתי", "נועם", "אורי", "יובל", "אלון", "תומר", "אריאל", "שלומי", "יקיר", "מתן", "גל"]
last_names = ["כהן", "לוי", "מזרחי", "פרץ", "ביטון", "דהן", "אברהם", "פרידמן", "מלכה", "אזולאי", "כץ", "יוסף", "חדד", "גבאי", "בן דוד", "שוורץ", "בר", "לביא", "סגל", "שפירא"]
ranks = ["טוראי", "רב\"ט", "סמל", "סמ\"ר", "רס\"ל", "סג\"מ", "סגן", "סרן"]
units = ["גולני", "צנחנים", "גבעתי", "נח\"ל", "כפיר", "שריון 7", "שריון 188", "שריון 401", "הנדסה קרבית", "איסוף קרבי", "מג\"ב"]
roles = ["לוחם", "נהג", "מפקד", "חובש", "קשר", "מאגיסט", "קלע", "מטוליסט", "נהג נגמ\"ש", "טען", "תותחן"]
vehicles = [f"MERKAVA-{i}" for i in range(1, 15)] + \
           [f"NAMER-{i}" for i in range(1, 15)] + \
           [f"ZEEV-{i}" for i in range(1, 10)] + \
           [f"HUMMER-{i}" for i in range(1, 10)]

def generate_id():
    return str(random.randint(1000000, 9999999))

def create_csv(filename, count=200):
    with open(filename, 'w', newline='', encoding='utf-8-sig') as file:
        writer = csv.writer(file)
        # כותרות
        writer.writerow(["military_id", "full_name", "rank", "unit", "assigned_vehicle_id", "mission_role"])
        
        for _ in range(count):
            m_id = generate_id()
            f_name = f"{random.choice(first_names)} {random.choice(last_names)}"
            rank = random.choice(ranks)
            unit = random.choice(units)
            role = random.choice(roles)
            
            # 80% סיכוי שיהיה משובץ לרכב, 20% סיכוי שלא משובץ
            if random.random() > 0.2:
                vehicle = random.choice(vehicles)
            else:
                vehicle = "לא משובץ"
                
            writer.writerow([m_id, f_name, rank, unit, vehicle, role])
            
    print(f"✅ הקובץ {filename} נוצר בהצלחה עם {count} חיילים!")

if __name__ == "__main__":
    create_csv("soldiers_200.csv", 200)