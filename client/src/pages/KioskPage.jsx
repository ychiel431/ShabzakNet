import React, { useState } from 'react';
import { 
  Box, Typography, Button, TextField, Paper, 
  CircularProgress 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api, API_BASE_URL } from '../services/api';

const KioskPage = ({ setView }) => {
  const [kioskMode, setKioskMode] = useState('soldier'); 
  const [militaryIdInput, setMilitaryIdInput] = useState('');
  const [generatedQr, setGeneratedQr] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQr = async () => {
    if (!militaryIdInput) return;
    setLoading(true);
    try {
      let data;
      
      // בדיקה: האם אנחנו במצב לוחם או במצב כלי?
      if (kioskMode === 'soldier') {
        // עבור לוחם - משתמשים ב-API הקיים (GET)
        data = await api.getQrData('soldier', militaryIdInput);
      } else {
        // עבור כלי - שולחים בקשת POST ישירות לנתיב החדש בשרת
        const response = await fetch(`${API_BASE_URL}/admin/vehicle-qr/${militaryIdInput}`, {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Vehicle not found');
        data = await response.json();
      }
      
      setGeneratedQr({
        ...data,
        title: kioskMode === 'soldier' ? data.full_name : `כלי: ${militaryIdInput}`,
        subtitle: kioskMode === 'soldier' ? `${data.rank} | מ"א: ${data.military_id}` : `שבצ"ק כלי פעיל`,
        mainDetail: kioskMode === 'soldier' ? `שיבוץ: ${data.assigned_vehicle}` : `סרוק לרשימת לוחמים`,
        isVehicle: kioskMode === 'vehicle'
      });
    } catch (e) { 
      // הודעת השגיאה תופיע עכשיו גם אם הכלי לא נמצא וגם אם הלוחם לא נמצא
      alert(kioskMode === 'soldier' ? "לוחם לא נמצא במערכת" : "כלי לא נמצא במערכת"); 
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', width: '100%', py: 4 }}>
      <Button 
        onClick={() => {setView('menu'); setGeneratedQr(null); setMilitaryIdInput('');}} 
        variant="outlined" 
        startIcon={<ArrowBackIcon sx={{ ml: 1 }} />}
        sx={{ mb: 3, borderRadius: 2 }}
      >
        חזרה לתפריט
      </Button>
      
      <Paper 
        elevation={10} 
        sx={{ 
          width: '95%', 
          maxWidth: 550, 
          borderRadius: '20px', 
          overflow: 'hidden', // קריטי כדי שהכותרת הירוקה לא תצא מהפינות המעוגלות
          textAlign: 'center'
          // מחקנו את ה-borderTop שהיה כאן והסתיר את הטקסט
        }}
      >
        {!generatedQr ? (
          <Box sx={{ p: 5 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20', mb: 3 }}>מרכז הנפקת QR</Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
              <Button 
                variant={kioskMode === 'soldier' ? "contained" : "outlined"} 
                onClick={() => setKioskMode('soldier')} 
                sx={{ borderRadius: 2, px: 4, py: 1.5, fontWeight: 'bold' }}
              >
                לוחם (מ"א)
              </Button>
              <Button 
                variant={kioskMode === 'vehicle' ? "contained" : "outlined"} 
                onClick={() => setKioskMode('vehicle')} 
                sx={{ borderRadius: 2, px: 4, py: 1.5, fontWeight: 'bold' }}
              >
                כלי (ID)
              </Button>
            </Box>

            <TextField 
              fullWidth 
              label={kioskMode === 'soldier' ? "הקש מספר אישי" : "ID כלי"} 
              value={militaryIdInput} 
              onChange={(e) => setMilitaryIdInput(e.target.value)} 
              sx={{ mb: 4 }} 
              inputProps={{ style: { fontSize: '2rem', textAlign: 'center', fontWeight: 'bold' } }} 
            />
            
            <Button 
              fullWidth variant="contained" size="large" 
              sx={{ height: 70, fontSize: 22, bgcolor: '#1b5e20', borderRadius: 3, fontWeight: 'bold' }} 
              onClick={handleGenerateQr}
              disabled={loading}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : "הפק מדבקה / כרטיס"}
            </Button>
          </Box>
        ) : (
            <Box sx={{ direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
                {/* 1. כותרת עליונה - "הגג" של הכרטיס */}
                <Box sx={{ 
                bgcolor: '#1b5e20', 
                py: 3, // יותר גובה לכותרת
                color: 'white', 
                textAlign: 'center',
                width: '100%'
                }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', m: 0 }}>
                    שבצ"ק-נט: {generatedQr.isVehicle ? "מדבקת רכב" : "כרטיס לוחם"}
                </Typography>
                </Box>

                {/* 2. גוף הכרטיס - מתחיל *אחרי* הכותרת הירוקה */}
                <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: '#666', fontWeight: 'bold' }}>
                    תאריך הנפקה: {new Date().toLocaleDateString('he-IL')}
                </Typography>

                {/* פרטי הלוחם/הכלי - עם רווח ברור מלמעלה */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20', mb: 1 }}>
                    {generatedQr.title}
                    </Typography>
                    <Typography variant="h5" color="text.secondary">
                    {generatedQr.subtitle}
                    </Typography>
                </Box>
                
                {/* אזור ה-QR - ללא חפיפה */}
                <Box sx={{ 
                    p: 2, 
                    bgcolor: 'white', 
                    display: 'inline-block', 
                    borderRadius: 4, 
                    border: '1px solid #ddd', 
                    my: 2 
                }}>
                    <img 
                    src={`${API_BASE_URL}${generatedQr.qr_url}`} 
                    alt="QR" 
                    style={{ width: 280, height: 280, display: 'block' }} 
                    />
                </Box>
                
                {/* סטטוס שיבוץ */}
                <Box sx={{ 
                    mt: 3, 
                    p: 2, 
                    bgcolor: generatedQr.isVehicle ? '#e3f2fd' : '#f1f8e9', 
                    borderRadius: 3, 
                    border: `3px solid ${generatedQr.isVehicle ? '#1565c0' : '#2e7d32'}` 
                }}>
                    <Typography variant="h2" sx={{ fontWeight: 'bold', color: generatedQr.isVehicle ? '#1565c0' : '#1b5e20' }}>
                    {generatedQr.mainDetail}
                    </Typography>
                </Box>
                
                {/* כפתורי פעולה */}
                <Box sx={{ display: 'flex', gap: 2, mt: 5 }}>
                    <Button fullWidth variant="outlined" size="large" onClick={() => window.print()} sx={{ height: 60, fontSize: '1.2rem' }}>הדפס מדבקה</Button>
                    <Button fullWidth variant="contained" size="large" onClick={() => {setGeneratedQr(null); setMilitaryIdInput('');}} sx={{ bgcolor: '#1b5e20', height: 60, fontSize: '1.2rem' }}>הבא בתור</Button>
                </Box>
                </Box>
            </Box>
            )}
      </Paper>
    </Box>
  );
};

export default KioskPage;