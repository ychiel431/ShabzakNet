import React, { useState } from 'react';
import { 
  Box, Typography, Button, TextField, Paper, 
  CircularProgress, Avatar, ToggleButtonGroup, ToggleButton 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import PersonIcon from '@mui/icons-material/Person';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { api, API_BASE_URL } from '../services/api';

const KioskPage = ({ setView }) => {
  const [kioskMode, setKioskMode] = useState('soldier'); 
  const [inputId, setInputId] = useState('');
  const [generatedQr, setGeneratedQr] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQr = async () => {
    if (!inputId) return;
    setLoading(true);
    try {
      let data;
      
      // תרחיש א': הנפקת QR ללוחם
      if (kioskMode === 'soldier') {
        data = await api.getQrData('soldier', inputId);
        setGeneratedQr({
          ...data,
          title: data.full_name,
          subtitle: `${data.rank} | מ"א: ${data.military_id}`,
          mainDetail: `שיבוץ: ${data.assigned_vehicle}`,
          isVehicle: false
        });
      } 
      // תרחיש ב': הנפקת QR לרכב
      else {
        // פנייה ישירה לשרת ב-POST עבור רכבים
        const response = await fetch(`${API_BASE_URL}/admin/vehicle-qr/${inputId}`, {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Vehicle not found');
        data = await response.json();
        
        setGeneratedQr({
          ...data,
          title: `כלי רכב: ${inputId}`,
          subtitle: `שבצ"ק כלי פעיל`,
          mainDetail: `הדבק על הכלי לסריקה`,
          isVehicle: true
        });
      }
    } catch (e) { 
      alert(kioskMode === 'soldier' ? "לוחם לא נמצא במערכת" : "שגיאה ביצירת קוד לכלי"); 
    }
    setLoading(false);
  };

  // מנקה את הנתונים כשמחליפים מצב
  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setKioskMode(newMode);
      setInputId('');
      setGeneratedQr(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '85vh', py: 4, direction: 'rtl' }}>
      <Box sx={{ width: '100%', maxWidth: 600, display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
        <Button 
          onClick={() => {setView('menu'); setGeneratedQr(null); setInputId('');}} 
          variant="outlined" 
          startIcon={<ArrowBackIcon sx={{ ml: 1 }} />}
          sx={{ borderRadius: 2, bgcolor: 'white' }}
        >
          חזרה לתפריט
        </Button>
      </Box>
      
      <Paper 
        elevation={6} 
        sx={{ 
          width: '100%', 
          maxWidth: 600, 
          borderRadius: 4, 
          overflow: 'hidden',
          textAlign: 'center',
          bgcolor: 'white'
        }}
      >
        {!generatedQr ? (
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <QrCode2Icon sx={{ fontSize: 60, color: '#1b5e20', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: '900', color: '#1b5e20', mb: 4 }}>
              הפקת מדבקות QR
            </Typography>
            
            {/* בורר המצבים (Toggle) */}
            <ToggleButtonGroup
              color="success"
              value={kioskMode}
              exclusive
              onChange={handleModeChange}
              sx={{ mb: 4, width: '100%', direction: 'ltr' }}
            >
              <ToggleButton value="vehicle" sx={{ width: '50%', fontWeight: 'bold', fontSize: '1.1rem' }}>
                 כלי רכב <DirectionsBusIcon sx={{ ml: 1 }} />
              </ToggleButton>
              <ToggleButton value="soldier" sx={{ width: '50%', fontWeight: 'bold', fontSize: '1.1rem' }}>
                 לוחם <PersonIcon sx={{ ml: 1 }} />
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField 
              fullWidth 
              variant="outlined"
              label={kioskMode === 'soldier' ? "הקש מספר אישי" : "הקש מזהה כלי (לדוגמה: NAMER-4)"} 
              value={inputId} 
              onChange={(e) => setInputId(e.target.value)} 
              sx={{ mb: 4 }} 
              inputProps={{ style: { fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' } }} 
            />
            
            <Button 
              fullWidth variant="contained" size="large" 
              sx={{ height: 60, fontSize: 20, bgcolor: '#1b5e20', borderRadius: 2, fontWeight: 'bold', '&:hover': {bgcolor: '#2e7d32'} }} 
              onClick={handleGenerateQr}
              disabled={loading || !inputId}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : "הפק QR"}
            </Button>
          </Box>
        ) : (
            /* --- מצב תצוגת ה-QR המוכן --- */
            <Box sx={{ direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ bgcolor: generatedQr.isVehicle ? '#0d47a1' : '#1b5e20', py: 2, color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {generatedQr.isVehicle ? "מדבקת כלי רכב" : "כרטיס לוחם"}
                    </Typography>
                </Box>

                <Box sx={{ p: 4, textAlign: 'center' }}>
                    {generatedQr.photo_url && !generatedQr.isVehicle && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Avatar 
                                src={`${API_BASE_URL}${generatedQr.photo_url}?t=${new Date().getTime()}`} 
                                sx={{ width: 100, height: 100, border: '4px solid #1b5e20', boxShadow: 3 }}
                            />
                        </Box>
                    )}
                    {generatedQr.isVehicle && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                             <Avatar sx={{ width: 100, height: 100, bgcolor: '#e3f2fd', color: '#0d47a1' }}>
                                 <DirectionsBusIcon sx={{ fontSize: 60 }} />
                             </Avatar>
                        </Box>
                    )}

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h4" sx={{ fontWeight: '900', color: '#333', mb: 1 }}>
                        {generatedQr.title}
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                        {generatedQr.subtitle}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 4, border: '2px dashed #ccc', my: 2 }}>
                        <img 
                            src={`${API_BASE_URL}${generatedQr.qr_url}`} 
                            alt="QR" 
                            style={{ width: 250, height: 250, display: 'block' }} 
                        />
                    </Box>
                    
                    <Box sx={{ mt: 2, p: 2, bgcolor: generatedQr.isVehicle ? '#e3f2fd' : '#f1f8e9', borderRadius: 3 }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: generatedQr.isVehicle ? '#0d47a1' : '#1b5e20' }}>
                        {generatedQr.mainDetail}
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                        <Button fullWidth variant="outlined" size="large" onClick={() => window.print()} sx={{ height: 50, fontWeight: 'bold' }}>הדפס</Button>
                        <Button fullWidth variant="contained" size="large" onClick={() => {setGeneratedQr(null); setInputId('');}} sx={{ bgcolor: '#1b5e20', height: 50, fontWeight: 'bold' }}>QR חדש</Button>
                    </Box>
                </Box>
            </Box>
        )}
      </Paper>
    </Box>
  );
};

export default KioskPage;