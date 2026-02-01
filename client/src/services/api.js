// client/src/services/api.js

// זיהוי כתובת אוטומטי - עובד גם בבית וגם ב-EC2
const getBaseUrl = () => {
  const { protocol, hostname } = window.location;
  // אם אנחנו מריצים לוקאלית (מחשב פיתוח), נשתמש בפורט 8080
  // אם נריץ בעתיד עם דומיין מסודר, זה יעבוד גם שם
  return `${protocol}//${hostname}:8080`;
};

export const API_BASE_URL = getBaseUrl();

export const api = {
  // קבלת נתוני הכלים
  fetchVehicles: async () => {
    const res = await fetch(`${API_BASE_URL}/vehicles/list?t=${new Date().getTime()}`);
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    return res.json();
  },

  resetVehicle: async (vehicleId) => {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/reset`, {
      method: 'POST',
    });
    return response.json();
  },

  // קבלת רשימת הלוחמים
  fetchSoldiers: async () => {
    const res = await fetch(`${API_BASE_URL}/admin/soldiers/list?t=${new Date().getTime()}`);
    if (!res.ok) throw new Error('Failed to fetch soldiers');
    return res.json();
  },

  resetAllVerifications: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/reset-all-verifications`, {
      method: 'POST',
    });
    return response.json();
  },

  // שיבוץ לוחם (FormData - קריטי ל-Backend שלך)
  assignSoldier: async (militaryId, vehicleId, override = false) => {
    const formData = new FormData();
    formData.append('military_id', militaryId);
    formData.append('vehicle_id', vehicleId);
    formData.append('override', override.toString());

    const res = await fetch(`${API_BASE_URL}/admin/assign-soldier`, {
      method: 'POST',
      body: formData
    });
    return res; 
  },

  // ביטול שיבוץ
  unassignSoldier: async (militaryId) => {
    const formData = new FormData();
    formData.append('military_id', militaryId);
    const res = await fetch(`${API_BASE_URL}/admin/unassign-soldier`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to unassign soldier');
    return res.json();
  },

  // הפקת נתוני QR
  getQrData: async (type, id) => {
    const endpoint = type === 'soldier' 
      ? `${API_BASE_URL}/kiosk/identify/${id}`
      : `${API_BASE_URL}/admin/vehicle-qr/${id}`;
    
    const res = await fetch(`${endpoint}?t=${new Date().getTime()}`);
    if (!res.ok) throw new Error('Not found in system');
    return res.json();
  },

  // העלאת תמונה
  uploadSoldierPhoto: async (militaryId, formData) => {
    const response = await fetch(`${API_BASE_URL}/admin/upload-photo/${militaryId}`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  // מחיקת תמונה
  deleteSoldierPhoto: async (militaryId) => {
    const response = await fetch(`${API_BASE_URL}/admin/delete-photo/${militaryId}`, {
        method: 'DELETE',
    });
    return response.json();
  },

  // העלאת CSV (החזרנו את זה!)
  uploadSoldiersCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE_URL}/admin/upload-csv`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) throw new Error('CSV upload failed');
    return res.json();
  },
};