// client/src/services/api.js

const SERVER_IP = window.location.hostname;
export const API_BASE_URL = `http://${SERVER_IP}:8080`;

export const api = {
  // קבלת נתוני הכלים (Fleet) - כולל חישוב הקיבולת והסטטיסטיקה
  fetchVehicles: async () => {
    // מומלץ להוסיף גם כאן timestamp כדי לראות שינויי שיבוץ בזמן אמת
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

  // קבלת רשימת הלוחמים המלאה
  // התיקון הקריטי: הוספת timestamp מונעת מהדפדפן לשמור גרסה ישנה ללא התמונות
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

  // שיבוץ לוחם לכלי (כולל תמיכה ב-Override במקרה של כפל שיבוץ)
  assignSoldier: async (militaryId, vehicleId, override = false) => {
    const formData = new FormData();
    formData.append('military_id', militaryId);
    formData.append('vehicle_id', vehicleId);
    formData.append('override', override.toString());

    const res = await fetch(`${API_BASE_URL}/admin/assign-soldier`, {
      method: 'POST',
      body: formData
    });
    return res; // מחזירים את ה-Response כדי לטפל בסטטוס 409 (קונפליקט) ב-UI
  },

  // ביטול שיבוץ לוחם
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

  // הפקת נתוני QR (לוחם או כלי)
  getQrData: async (type, id) => {
    const endpoint = type === 'soldier' 
      ? `${API_BASE_URL}/kiosk/identify/${id}`
      : `${API_BASE_URL}/admin/vehicle-qr/${id}`;
    
    // גם כאן מוסיפים timestamp כדי לוודא שמקבלים תמונה עדכנית בסריקה
    const res = await fetch(`${endpoint}?t=${new Date().getTime()}`);
    if (!res.ok) throw new Error('Not found in system');
    return res.json();
  },

  // פונקציה להעלאת תמונת לוחם לשרת
  uploadSoldierPhoto: async (militaryId, formData) => {
    const response = await fetch(`${API_BASE_URL}/admin/upload-photo/${militaryId}`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  // פונקציה למחיקת תמונת לוחם (עבור הכפתור האדום)
  deleteSoldierPhoto: async (militaryId) => {
    const response = await fetch(`${API_BASE_URL}/admin/delete-photo/${militaryId}`, {
        method: 'DELETE',
    });
    return response.json();
  },

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