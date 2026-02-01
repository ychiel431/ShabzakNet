// src/services/api.js

// הגדרה קשיחה של ה-IP הקבוע שלך - זה יפתור את ה-0/0
export const API_BASE_URL = 'http://98.83.47.167:8080';

export const api = {
  // קבלת נתוני הכלים
  fetchVehicles: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/list?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      return res.json();
    } catch (e) { console.error(e); return []; }
  },

  // קבלת רשימת הלוחמים
  fetchSoldiers: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/soldiers/list?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error('Failed to fetch soldiers');
      return res.json();
    } catch (e) { console.error(e); return []; }
  },

  // שיבוץ לוחם
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
    if (!res.ok) throw new Error('Failed to unassign');
    return res.json();
  },

  // נתוני QR
  getQrData: async (type, id) => {
    const endpoint = type === 'soldier' 
      ? `${API_BASE_URL}/kiosk/identify/${id}`
      : `${API_BASE_URL}/admin/vehicle-qr/${id}`;
    
    const res = await fetch(`${endpoint}?t=${new Date().getTime()}`);
    if (!res.ok) throw new Error('Not found');
    return res.json();
  },

  // איפוסים
  resetVehicle: async (vehicleId) => {
    await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/reset`, { method: 'POST' });
  },

  resetAllVerifications: async () => {
    await fetch(`${API_BASE_URL}/admin/reset-all-verifications`, { method: 'POST' });
  },

  // תמונות
  uploadSoldierPhoto: async (militaryId, formData) => {
    const response = await fetch(`${API_BASE_URL}/admin/upload-photo/${militaryId}`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  deleteSoldierPhoto: async (militaryId) => {
    await fetch(`${API_BASE_URL}/admin/delete-photo/${militaryId}`, { method: 'DELETE' });
  },

  // ✅ שוחזר: העלאת קובץ CSV
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