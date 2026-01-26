import React, { useState, useEffect, useRef } from 'react';
import { 
  ThemeProvider, Box, AppBar, Toolbar, Typography, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions, List, ListItem, 
  ListItemButton, Avatar, Divider, TextField, IconButton, 
  Container, Grid, Tooltip 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DashboardIcon from '@mui/icons-material/Dashboard';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { shabzakTheme } from './theme/shabzakTheme';
import { api, API_BASE_URL } from './services/api';
import DashboardPage from './pages/DashboardPage';
import KioskPage from './pages/KioskPage';
import FleetPage from './pages/FleetPage';
import SoldiersPage from './pages/SoldiersPage';

function App() {
  // --- 1. הגדרת States (מצב) ---
  const [view, setView] = useState('menu');
  const [vehicles, setVehicles] = useState([]);
  const [soldiersList, setSoldiersList] = useState([]);
  const [stats, setStats] = useState({ readiness: 0, totalSoldiers: 0, assignedSoldiers: 0, totalVehicles: 0, fullVehicles: 0 });
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [openVehicleDialog, setOpenVehicleDialog] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState(null);
  const [openSoldierDialog, setOpenSoldierDialog] = useState(false);
  const [newSoldierId, setNewSoldierId] = useState('');
  
  // שימוש ב-Ref כדי למנוע רינדורים מיותרים אם לא צריך
  const lastVerifiedCount = useRef(0);

  // --- 2. פונקציות לוגיקה (Logic) ---

  const calculateStats = (vData, sData) => {
    const assigned = sData.filter(s => s.assigned_vehicle_id && s.assigned_vehicle_id !== 'לא משובץ').length;
    // לוגיקה לחישוב רכב מלא (נמר=11, זאב=12, אחרים=4)
    const fullVehicles = vData.filter(v => v.current_occupancy >= v.capacity).length;
    const readiness = Math.round(((assigned / sData.length || 0) + (fullVehicles / vData.length || 0)) / 2 * 100);
    setStats({ readiness, totalSoldiers: sData.length, assignedSoldiers: assigned, totalVehicles: vData.length, fullVehicles });
  };

  const loadData = async () => {
    try {
      console.log("Loading data..."); 
      const [vData, sData] = await Promise.all([api.fetchVehicles(), api.fetchSoldiers()]);
      
      const enrichedVehicles = vData.map(v => {
        const sortedCrew = [...(v.crew || [])].sort((a, b) => (b.is_finalized - a.is_finalized));
        return { 
          ...v, 
          crew: sortedCrew,
          capacity: v.id.includes('NAMER') ? 11 : (v.id.includes('ZEEV') ? 12 : 4) 
        };
      });

      // התיקון הקריטי: יצירת מערך חדש (...) כדי להכריח את React לרענן את ה-V הירוק
      setVehicles([...enrichedVehicles]); 
      setSoldiersList([...sData]);
      calculateStats(enrichedVehicles, sData);

      // אם דיאלוג פתוח - עדכן גם אותו בזמן אמת
      if (openVehicleDialog && selectedVehicle) {
        const updated = enrichedVehicles.find(v => v.id === selectedVehicle.id);
        if (updated) {
          setSelectedVehicle({ ...updated });
        }
      }
    } catch (e) { 
      console.error("Load error:", e); 
    }
  };

  // --- 3. פונקציות טיפול (Event Handlers) ---

  // פונקציה לאיפוס כללי
  const handleResetAll = async () => {
    if (window.confirm("⚠️ שים לב: פעולה זו תאפס את ה-✅ (האימות) לכל הלוחמים בכל הכלים במערכת.\nהשיבוצים עצמם לא יימחקו.\n\nהאם לאפס הכל?")) {
      try {
        if (api.resetAllVerifications) {
          await api.resetAllVerifications();
          await loadData(); 
          alert("כל האימותים במערכת אופסו בהצלחה!");
        } else {
          alert("שגיאה: פונקציית resetAllVerifications חסרה ב-api.js");
        }
      } catch (e) {
        console.error(e);
        alert("שגיאה באיפוס הכללי.");
      }
    }
  };

  const handleOpenVehicle = (v) => { setSelectedVehicle(v); setOpenVehicleDialog(true); };
  
  const handleResetVehicle = async () => {
    if (window.confirm(`שים לב: איפוס יומי לכלי ${selectedVehicle.id}?\nזה ינקה את ה-✅.`)) {
      try {
        await api.resetVehicle(selectedVehicle.id);
        await loadData(); 
      } catch (e) {
        console.error(e);
        alert("שגיאה באיפוס נתונים.");
      }
    }
  };

  const handleOpenSoldier = async (mId) => {
    try {
      const data = await api.getQrData('soldier', mId);
      setSelectedSoldier(data);
      setOpenSoldierDialog(true);
    } catch (e) {
      alert("שגיאה בטעינת נתוני לוחם");
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.uploadSoldierPhoto(selectedSoldier.military_id, formData);
      if (response.status === "success") {
        const timestamp = new Date().getTime();
        const freshPhotoUrl = `${response.photo_url}?t=${timestamp}`;
        setSelectedSoldier((prev) => ({ ...prev, photo_url: freshPhotoUrl }));
        loadData(); 
        alert("התמונה עודכנה בהצלחה!");
      }
    } catch (error) { alert("שגיאה בהעלאת התמונה"); }
  };

  const handlePhotoDelete = async () => {
    if (!window.confirm("האם למחוק את התמונה?")) return;
    try {
        if(api.deleteSoldierPhoto) {
            await api.deleteSoldierPhoto(selectedSoldier.military_id);
            alert("התמונה נמחקה");
            setOpenSoldierDialog(false);
            loadData();
        } else {
            alert("חסרה פונקציית מחיקה ב-API");
        }
    } catch (error) { alert("שגיאה במחיקה"); }
  };

  const handleAssign = async () => {
    const soldier = soldiersList.find(s => s.military_id === newSoldierId);
    const currentVehicle = soldier?.assigned_vehicle_id || 'לא משובץ';
    const res = await api.assignSoldier(newSoldierId, selectedVehicle.id);
    
    if (res.ok) { 
      loadData(); 
      setOpenVehicleDialog(false); 
      setNewSoldierId(''); 
    } 
    else if (res.status === 409) {
      if (window.confirm(`החייל כבר משובץ לכלי: ${currentVehicle}. האם להעביר אותו לכלי ${selectedVehicle.id}?`)) {
        await api.assignSoldier(newSoldierId, selectedVehicle.id, true);
        loadData(); 
        setOpenVehicleDialog(false);
        setNewSoldierId('');
      }
    } else { alert("חייל לא נמצא במערכת"); }
  };

  // --- 4. useEffect (טעינה ראשונית) ---
  useEffect(() => {
    loadData();
  }, [view]);

  // --- 5. התצוגה (JSX) ---
  return (
    <ThemeProvider theme={shabzakTheme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', direction: 'rtl' }}>
        <AppBar position="sticky">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>ShabzakNet v2.0</Typography>
            <Button 
              color="inherit" 
              onClick={loadData} 
              sx={{ ml: 2, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2 }}
            >
              🔄 רענן נתונים
            </Button>
            {view !== 'menu' && <Button color="inherit" onClick={() => setView('menu')}>תפריט ראשי</Button>}
          </Toolbar>
        </AppBar>

        {view === 'menu' && (
          <Container maxWidth="xl" sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ color: 'primary.main', mb: 8, fontSize: '4rem', fontWeight: 'bold' }}>חמ"ל שבצ"ק-נט</Typography>
            <Grid container spacing={4} justifyContent="center">
              {[
                { label: 'תמונת מצב', icon: <DashboardIcon fontSize="large"/>, v: 'dashboard', color: '#fbc02d' },
                { label: 'עמדת QR', icon: <QrCodeScannerIcon fontSize="large"/>, v: 'kiosk', color: '#1b5e20' },
                { label: 'ניהול כלים', icon: <DirectionsBusIcon fontSize="large"/>, v: 'fleet', color: '#1565c0' },
                { label: 'ניהול לוחמים', icon: <BadgeIcon fontSize="large"/>, v: 'soldiers', color: '#e65100' }
              ].map(item => (
                <Grid item xs={12} sm={6} md={3} key={item.v} onClick={() => setView(item.v)}>
                  <ListItemButton sx={{ flexDirection: 'column', p: 4, borderRadius: 6, bgcolor: 'white', borderBottom: `6px solid ${item.color}`, boxShadow: 3 }}>
                    <Box sx={{ color: item.color, transform: 'scale(2)', mb: 3 }}>{item.icon}</Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{item.label}</Typography>
                  </ListItemButton>
                </Grid>
              ))}
            </Grid>
          </Container>
        )}

        {/* מפתח (Key) דינמי מבטיח שכל לחיצה על רענן תבנה מחדש את הדף */}
        {view === 'dashboard' && <DashboardPage key={`dash-${vehicles.length}-${Date.now()}`} stats={stats} vehicles={vehicles} setView={setView} setSelectedCategory={setSelectedCategory} />}
        {view === 'kiosk' && <KioskPage setView={setView} />}
        {view === 'soldiers' && <SoldiersPage soldiersList={soldiersList} vehicles={vehicles} onRefresh={loadData} setView={setView} handleOpenSoldier={handleOpenSoldier} />}
        
        {/* חיבור הכפתור handleResetAll ל-FleetPage */}
        {view === 'fleet' && (
            <FleetPage 
                key={`fleet-${vehicles.length}-${Date.now()}`} 
                vehicles={vehicles} 
                selectedCategory={selectedCategory} 
                setSelectedCategory={setSelectedCategory} 
                setView={setView} 
                handleOpenVehicle={handleOpenVehicle} 
                handleResetAll={handleResetAll} 
            />
        )}

        {/* דיאלוג רכב */}
        <Dialog open={openVehicleDialog} onClose={() => setOpenVehicleDialog(false)} fullWidth maxWidth="sm">
          {selectedVehicle && (
            <>
              <DialogTitle sx={{ bgcolor: '#1b5e20', color: 'white', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>צוות כלי: {selectedVehicle.id}</Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                      ✅ אומתו: {selectedVehicle.crew?.filter(s => s.is_finalized).length || 0} מתוך {selectedVehicle.crew?.length || 0} לוחמים
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="איפוס יומי"><IconButton onClick={handleResetVehicle} sx={{ color: '#ffcc80', border: '1px solid rgba(255,204,128,0.5)' }}><RestartAltIcon /></IconButton></Tooltip>
                    <Tooltip title="רענן"><IconButton onClick={loadData} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}><RefreshIcon /></IconButton></Tooltip>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ mt: 2 }}>
                <List>
                  {selectedVehicle.crew?.map((s) => (
                    <ListItem key={s.military_id} divider disablePadding sx={{ bgcolor: s.is_finalized ? '#f1f8e9' : 'transparent', transition: 'all 0.3s ease' }}
                      secondaryAction={
                        <IconButton edge="end" color="error" onClick={async () => { if (window.confirm(`להסיר את ${s.full_name}?`)) { await api.unassignSoldier(s.military_id); loadData(); } }}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton onClick={() => handleOpenSoldier(s.military_id)} sx={{ pr: 9 }}>
                        <Avatar sx={{ ml: 2, bgcolor: s.is_finalized ? '#2e7d32' : 'primary.main' }}>{s.full_name[0]}</Avatar>
                        <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'right', flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                            <Typography variant="body1" sx={{ fontWeight: s.is_finalized ? 'bold' : 'normal' }}>{s.rank} {s.full_name}</Typography>
                            {s.is_finalized && <Tooltip title={`אומת ב-${s.finalized_at}`}><CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 22 }} /></Tooltip>}
                          </Box>
                          <Typography variant="caption" color="text.secondary">{s.mission_role}</Typography>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <TextField fullWidth size="small" label='מ"א להוספה' value={newSoldierId} onChange={e => setNewSoldierId(e.target.value)} />
                  <Button variant="contained" onClick={handleAssign} sx={{ bgcolor: '#1b5e20' }}>הוסף</Button>
                </Box>
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* דיאלוג חייל */}
        <Dialog open={openSoldierDialog} onClose={() => setOpenSoldierDialog(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 5, overflow: 'hidden' } }}>
          {selectedSoldier && (
            <Box sx={{ direction: 'rtl', bgcolor: 'white' }}>
              <Box sx={{ bgcolor: '#1b5e20', py: 2, px: 3, color: 'white', textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>כרטיס לוחם</Typography>
              </Box>
              <DialogContent sx={{ textAlign: 'center', px: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                      <input accept="image/*" style={{ display: 'none' }} id="upload-photo-input" type="file" onChange={handlePhotoUpload} />
                      <label htmlFor="upload-photo-input">
                        <IconButton component="span" sx={{ p: 0 }}>
                          <Avatar src={selectedSoldier.photo_url ? `${API_BASE_URL}${selectedSoldier.photo_url}` : ""} sx={{ width: 90, height: 90, border: '4px solid white', boxShadow: 3 }}>
                              {!selectedSoldier.photo_url && selectedSoldier.full_name?.[0]}
                          </Avatar>
                        </IconButton>
                      </label>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1b5e20', mt: 2 }}>{selectedSoldier.full_name}</Typography>
                      <Typography variant="h6" color="textSecondary">{selectedSoldier.rank} | מ"א: {selectedSoldier.military_id}</Typography>
                  </Box>
                  <Box sx={{ my: 3, p: 2, border: '1px solid #eee', borderRadius: 4, display: 'inline-block' }}>
                      <img src={`${API_BASE_URL}${selectedSoldier.qr_url}`} alt="QR" style={{ width: 180, height: 180 }} />
                  </Box>
                  <Box sx={{ p: 2, borderRadius: 3, border: '2px solid #1b5e20', bgcolor: '#f1f8e9' }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>שיבוץ: {selectedSoldier.assigned_vehicle || 'לא משובץ'}</Typography>
                  </Box>
              </DialogContent>
              <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3 }}>
                <Button fullWidth onClick={() => setOpenSoldierDialog(false)} variant="contained" sx={{ bgcolor: '#1b5e20' }}>סגור</Button>
                {/* כאן הוספתי כפתור מחיקת תמונה אם תרצה */}
                 <Button color="error" onClick={handlePhotoDelete}>מחק תמונה</Button>
              </DialogActions>
            </Box>
          )}
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;