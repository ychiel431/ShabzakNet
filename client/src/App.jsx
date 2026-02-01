import React, { useState, useEffect, useRef } from 'react';
import { 
  ThemeProvider, Box, AppBar, Toolbar, Typography, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions, List, ListItem, 
  ListItemButton, Avatar, TextField, IconButton, 
  Container, Grid, Tooltip, useMediaQuery, useTheme 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DashboardIcon from '@mui/icons-material/Dashboard';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'; // חץ חזרה מותאם לעברית

import { shabzakTheme } from './theme/shabzakTheme';
import { api, API_BASE_URL } from './services/api';
import DashboardPage from './pages/DashboardPage';
import KioskPage from './pages/KioskPage';
import FleetPage from './pages/FleetPage';
import SoldiersPage from './pages/SoldiersPage';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  // --- 2. פונקציות לוגיקה ---

  const loadData = async () => {
    try {
      const [vData, sData] = await Promise.all([api.fetchVehicles(), api.fetchSoldiers()]);
      
      const enrichedVehicles = vData.map(v => ({ 
          ...v, 
          crew: [...(v.crew || [])].sort((a, b) => (b.is_finalized - a.is_finalized)),
          capacity: v.id.includes('NAMER') ? 11 : (v.id.includes('ZEEV') ? 12 : 4) 
        }));

      setVehicles([...enrichedVehicles]); 
      setSoldiersList([...sData]);
      calculateStats(enrichedVehicles, sData);

      // עדכון זמן אמת לדיאלוג פתוח
      if (openVehicleDialog && selectedVehicle) {
        const updated = enrichedVehicles.find(v => v.id === selectedVehicle.id);
        if (updated) setSelectedVehicle({ ...updated });
      }
    } catch (e) { console.error("Load error:", e); }
  };

  const calculateStats = (vData, sData) => {
    const assigned = sData.filter(s => s.assigned_vehicle_id && s.assigned_vehicle_id !== 'לא משובץ').length;
    const fullVehicles = vData.filter(v => v.current_occupancy >= v.capacity).length;
    const readiness = Math.round(((assigned / sData.length || 0) + (fullVehicles / vData.length || 0)) / 2 * 100);
    setStats({ readiness, totalSoldiers: sData.length, assignedSoldiers: assigned, totalVehicles: vData.length, fullVehicles });
  };

  // --- 3. פונקציות טיפול (Handlers) ---

  const handleResetAll = async () => {
    if (window.confirm("⚠️ איפוס כל ה-✅ במערכת?\nהשיבוצים לא יימחקו.")) {
      try {
        await api.resetAllVerifications();
        await loadData(); 
        alert("כל האימותים אופסו בהצלחה!");
      } catch (e) { alert("שגיאה באיפוס כללי."); }
    }
  };

  const handleOpenVehicle = (v) => { setSelectedVehicle(v); setOpenVehicleDialog(true); };
  
  // פונקציית איפוס רכב בודד (קריטי שנשמור אותה)
  const handleResetVehicle = async () => {
    if (window.confirm(`איפוס יומי לכלי ${selectedVehicle.id}?\nזה ינקה את ה-✅.`)) {
      try {
        await api.resetVehicle(selectedVehicle.id);
        await loadData(); 
      } catch (e) { alert("שגיאה באיפוס נתונים."); }
    }
  };

  const handleOpenSoldier = async (mId) => {
    try {
      const data = await api.getQrData('soldier', mId);
      setSelectedSoldier(data);
      setOpenSoldierDialog(true);
    } catch (e) { alert("שגיאה בטעינת לוחם"); }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.uploadSoldierPhoto(selectedSoldier.military_id, formData);
      if (response.status === "success") {
        const freshPhotoUrl = `${response.photo_url}?t=${new Date().getTime()}`;
        setSelectedSoldier((prev) => ({ ...prev, photo_url: freshPhotoUrl }));
        loadData(); 
      }
    } catch (e) { alert("שגיאה בהעלאת התמונה"); }
  };

  // פונקציית מחיקת תמונה (קריטי שנשמור אותה)
  const handlePhotoDelete = async () => {
    if (!window.confirm("האם למחוק את התמונה?")) return;
    try {
        if(api.deleteSoldierPhoto) {
            await api.deleteSoldierPhoto(selectedSoldier.military_id);
            alert("התמונה נמחקה");
            setOpenSoldierDialog(false);
            loadData();
        } else { alert("חסרה פונקציית מחיקה ב-API"); }
    } catch (e) { alert("שגיאה במחיקה"); }
  };

  const handleAssign = async () => {
    const res = await api.assignSoldier(newSoldierId, selectedVehicle.id);
    if (res.ok) { 
      loadData(); 
      setNewSoldierId(''); 
    } 
    else if (res.status === 409) {
      if (window.confirm(`החייל כבר משובץ. להעביר אותו ל-${selectedVehicle.id}?`)) {
        await api.assignSoldier(newSoldierId, selectedVehicle.id, true);
        loadData(); 
        setNewSoldierId('');
      }
    } else { alert("חייל לא נמצא במערכת"); }
  };

  useEffect(() => { loadData(); }, [view]);

  // --- 4. התצוגה (JSX) ---
  return (
    <ThemeProvider theme={shabzakTheme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', direction: 'rtl' }}>
        
        {/* סרגל עליון */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: '900' }}>ShabzakNet v2.0</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton color="inherit" onClick={loadData}><RefreshIcon /></IconButton>
              {view !== 'menu' && (
                <Button color="inherit" variant="outlined" size="small" onClick={() => setView('menu')} sx={{ borderRadius: 2 }}>
                   תפריט
                </Button>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* תפריט ראשי - גריד 2x2 למובייל */}
        {view === 'menu' && (
          <Container maxWidth="md" sx={{ mt: isMobile ? 3 : 8, textAlign: 'center' }}>
            <Typography variant={isMobile ? "h3" : "h1"} sx={{ color: 'primary.main', mb: isMobile ? 4 : 8, fontWeight: '900' }}>
              חמ"ל שבצ"ק-נט
            </Typography>
            <Grid container spacing={isMobile ? 2 : 4} justifyContent="center">
              {[
                { label: 'תמונת מצב', icon: <DashboardIcon />, v: 'dashboard', color: '#fbc02d' },
                { label: 'עמדת QR', icon: <QrCodeScannerIcon />, v: 'kiosk', color: '#1b5e20' },
                { label: 'ניהול כלים', icon: <DirectionsBusIcon />, v: 'fleet', color: '#1565c0' },
                { label: 'ניהול לוחמים', icon: <BadgeIcon />, v: 'soldiers', color: '#e65100' }
              ].map(item => (
                // xs=6 אומר 2 בשורה במובייל
                <Grid item xs={6} md={3} key={item.v} onClick={() => setView(item.v)}>
                  <ListItemButton sx={{ 
                    flexDirection: 'column', 
                    p: isMobile ? 2 : 4, 
                    borderRadius: 4, 
                    bgcolor: 'white', 
                    borderBottom: `6px solid ${item.color}`, 
                    boxShadow: 2,
                    height: isMobile ? '140px' : '220px',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{ color: item.color, transform: isMobile ? 'scale(1.5)' : 'scale(2.2)', mb: isMobile ? 2 : 4 }}>
                      {item.icon}
                    </Box>
                    <Typography variant={isMobile ? "subtitle1" : "h5"} sx={{ fontWeight: 'bold' }}>
                      {item.label}
                    </Typography>
                  </ListItemButton>
                </Grid>
              ))}
            </Grid>
          </Container>
        )}

        {/* ניתוב בין הדפים */}
        {view === 'dashboard' && <DashboardPage key={`d-${vehicles.length}`} stats={stats} vehicles={vehicles} setView={setView} setSelectedCategory={setSelectedCategory} />}
        {view === 'kiosk' && <KioskPage setView={setView} />}
        {view === 'soldiers' && <SoldiersPage soldiersList={soldiersList} vehicles={vehicles} onRefresh={loadData} setView={setView} handleOpenSoldier={handleOpenSoldier} />}
        
        {view === 'fleet' && (
            <FleetPage 
                key={`f-${vehicles.length}`} 
                vehicles={vehicles} 
                selectedCategory={selectedCategory} 
                setSelectedCategory={setSelectedCategory} 
                setView={setView} 
                handleOpenVehicle={handleOpenVehicle} 
                handleResetAll={handleResetAll} 
            />
        )}

        {/* דיאלוג רכב - עם כפתור חזרה למובייל */}
        <Dialog open={openVehicleDialog} onClose={() => setOpenVehicleDialog(false)} fullScreen={isMobile} fullWidth maxWidth="sm">
          {selectedVehicle && (
            <>
              <DialogTitle sx={{ bgcolor: '#1b5e20', color: 'white', p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* כפתור חזרה חדש - קריטי למובייל */}
                  <IconButton onClick={() => setOpenVehicleDialog(false)} sx={{ color: 'white' }}>
                    <ArrowForwardIcon />
                  </IconButton>
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>צוות: {selectedVehicle.id}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      ✅ {selectedVehicle.crew?.filter(s => s.is_finalized).length || 0} / {selectedVehicle.crew?.length || 0} אומתו
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="איפוס יומי"><IconButton onClick={handleResetVehicle} sx={{ color: '#ffcc80' }}><RestartAltIcon /></IconButton></Tooltip>
                    <Tooltip title="רענן"><IconButton onClick={loadData} sx={{ color: 'white' }}><RefreshIcon /></IconButton></Tooltip>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ p: 0, mt: 0 }}>
                <List sx={{ pt: 0 }}>
                  {selectedVehicle.crew?.map((s) => (
                    <ListItem key={s.military_id} divider disablePadding
                      secondaryAction={
                        <IconButton edge="end" color="error" onClick={async () => { if (window.confirm(`להסיר את ${s.full_name}?`)) { await api.unassignSoldier(s.military_id); loadData(); } }}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton onClick={() => handleOpenSoldier(s.military_id)} sx={{ pr: 6, py: 2 }}>
                        <Avatar sx={{ ml: 1.5, width: 40, height: 40, bgcolor: s.is_finalized ? '#2e7d32' : 'primary.main' }}>{s.full_name[0]}</Avatar>
                        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: s.is_finalized ? 'bold' : 'normal' }}>{s.full_name}</Typography>
                            {s.is_finalized && <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 18 }} />}
                          </Box>
                          <Typography variant="caption" color="text.secondary">{s.rank} | {s.mission_role}</Typography>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </DialogContent>
              <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <TextField fullWidth size="small" placeholder='מ"א להוספה' value={newSoldierId} onChange={e => setNewSoldierId(e.target.value)} sx={{ bgcolor: 'white' }} />
                <Button variant="contained" onClick={handleAssign} sx={{ bgcolor: '#1b5e20', px: 3, fontWeight: 'bold' }}>הוסף</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* דיאלוג חייל - מותאם למובייל */}
        <Dialog open={openSoldierDialog} onClose={() => setOpenSoldierDialog(false)} fullScreen={isMobile} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: isMobile ? 0 : 5, overflow: 'hidden' } }}>
          {selectedSoldier && (
            <Box sx={{ direction: 'rtl', bgcolor: 'white', height: '100%' }}>
              {/* כותרת עליונה לכרטיס לוחם */}
              <AppBar position="static" sx={{ bgcolor: '#1b5e20', boxShadow: 0 }}>
                <Toolbar>
                   <IconButton edge="start" color="inherit" onClick={() => setOpenSoldierDialog(false)}><ArrowForwardIcon /></IconButton>
                   <Typography sx={{ ml: 2, flex: 1, fontWeight: 'bold' }}>כרטיס לוחם</Typography>
                   <IconButton color="error" onClick={handlePhotoDelete}><DeleteIcon /></IconButton>
                </Toolbar>
              </AppBar>

              <DialogContent sx={{ textAlign: 'center', px: 3, pt: 4 }}>
                  <input accept="image/*" style={{ display: 'none' }} id="upload-photo-input" type="file" onChange={handlePhotoUpload} />
                  <label htmlFor="upload-photo-input">
                    <IconButton component="span" sx={{ p: 0 }}>
                      <Avatar src={selectedSoldier.photo_url ? `${API_BASE_URL}${selectedSoldier.photo_url}` : ""} sx={{ width: 100, height: 100, border: '4px solid #1b5e20', boxShadow: 3 }}>
                          {!selectedSoldier.photo_url && selectedSoldier.full_name?.[0]}
                      </Avatar>
                    </IconButton>
                  </label>
                  
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1b5e20', mt: 2 }}>{selectedSoldier.full_name}</Typography>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>{selectedSoldier.rank} | {selectedSoldier.military_id}</Typography>
                  
                  <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 4, display: 'inline-block', bgcolor: 'white' }}>
                      <img src={`${API_BASE_URL}${selectedSoldier.qr_url}`} alt="QR" style={{ width: 160, height: 160 }} />
                  </Box>
                  
                  <Box sx={{ mt: 4, p: 2, borderRadius: 3, bgcolor: '#f1f8e9', border: '2px solid #1b5e20' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
                        שיבוץ נוכחי: {selectedSoldier.assigned_vehicle || 'לא משובץ'}
                      </Typography>
                  </Box>
              </DialogContent>
              
              <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
                <Button fullWidth onClick={() => setOpenSoldierDialog(false)} variant="outlined" color="inherit" size="large">
                  סגור כרטיס
                </Button>
              </DialogActions>
            </Box>
          )}
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;