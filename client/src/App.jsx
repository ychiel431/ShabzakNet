import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { shabzakTheme } from './theme/shabzakTheme';
import { api, API_BASE_URL } from './services/api';
import DashboardPage from './pages/DashboardPage';
import KioskPage from './pages/KioskPage';
import FleetPage from './pages/FleetPage';
import SoldiersPage from './pages/SoldiersPage';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // --- States ---
  const [view, setView] = useState('menu');
  const [scannedId, setScannedId] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [soldiersList, setSoldiersList] = useState([]);
  const [stats, setStats] = useState({ readiness: 0, totalSoldiers: 0, assignedSoldiers: 0, totalVehicles: 0, fullVehicles: 0 });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [openVehicleDialog, setOpenVehicleDialog] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState(null);
  const [openSoldierDialog, setOpenSoldierDialog] = useState(false);
  const [newSoldierId, setNewSoldierId] = useState('');

  // --- Logic ---
  const calculateStats = (vData, sData) => {
    const assigned = sData.filter(s => s.assigned_vehicle_id && s.assigned_vehicle_id !== 'לא משובץ').length;
    const fullVehicles = vData.filter(v => v.current_occupancy >= v.capacity).length;
    const readiness = Math.round(((assigned / (sData.length || 1)) + (fullVehicles / (vData.length || 1))) / 2 * 100);
    setStats({ readiness, totalSoldiers: sData.length, assignedSoldiers: assigned, totalVehicles: vData.length, fullVehicles });
  };

  const loadData = useCallback(async () => {
    try {
      const [vData, sData] = await Promise.all([api.fetchVehicles(), api.fetchSoldiers()]);
      const enrichedVehicles = vData.map(v => ({ 
          ...v, 
          crew: [...(v.crew || [])].sort((a, b) => (b.is_finalized - a.is_finalized)),
          capacity: v.id.includes('NAMER') ? 11 : (v.id.includes('ZEEV') ? 12 : 4) 
        }));
      setVehicles(enrichedVehicles); 
      setSoldiersList(sData);
      calculateStats(enrichedVehicles, sData);
      
      if (selectedVehicle) {
        const updated = enrichedVehicles.find(v => v.id === selectedVehicle.id);
        if (updated) setSelectedVehicle(updated);
      }
    } catch (e) { console.error("Load error:", e); }
  }, [selectedVehicle]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromScan = urlParams.get('scan');
    if (idFromScan) {
      setScannedId(idFromScan);
      setView('kiosk');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    loadData();
  }, [loadData]);

  const handleOpenVehicle = (v) => { setSelectedVehicle(v); setOpenVehicleDialog(true); };

  const handleOpenSoldier = async (mId) => {
    try {
      const data = await api.getQrData('soldier', mId);
      setSelectedSoldier(data);
      setOpenSoldierDialog(true);
    } catch (e) { alert("שגיאה בטעינת נתוני לוחם"); }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.uploadSoldierPhoto(selectedSoldier.military_id, formData);
      if (response.status === "success") {
        await loadData();
        const updatedSoldier = await api.getQrData('soldier', selectedSoldier.military_id);
        setSelectedSoldier(updatedSoldier);
        alert("התמונה עודכנה!");
      }
    } catch (error) { alert("שגיאה בהעלאת התמונה"); }
  };

  const handlePhotoDelete = async () => {
    if (!window.confirm("למחוק תמונה?")) return;
    try {
      await api.deleteSoldierPhoto(selectedSoldier.military_id);
      await loadData();
      setOpenSoldierDialog(false);
    } catch (error) { alert("שגיאה במחיקה"); }
  };

  const handleAssign = async () => {
    if (!newSoldierId) return;
    const res = await api.assignSoldier(newSoldierId, selectedVehicle.id);
    if (res.ok) { 
      loadData(); 
      setNewSoldierId(''); 
    } else if (res.status === 409) {
      if (window.confirm(`החייל כבר משובץ. להעביר אותו לכלי ${selectedVehicle.id}?`)) {
        await api.assignSoldier(newSoldierId, selectedVehicle.id, true);
        loadData();
        setNewSoldierId('');
      }
    } else { alert("חייל לא נמצא"); }
  };

  const handleResetAll = async () => {
    if (window.confirm("לאפס את כל אימותי ה-V במערכת?")) {
        await api.resetAllVerifications();
        loadData();
    }
  };

  return (
    <ThemeProvider theme={shabzakTheme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', direction: 'rtl' }}>
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: '900' }}>ShabzakNet v2.0</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton color="inherit" onClick={loadData}><RefreshIcon /></IconButton>
              {view !== 'menu' && <Button color="inherit" variant="outlined" size="small" onClick={() => setView('menu')}>תפריט</Button>}
            </Box>
          </Toolbar>
        </AppBar>

        {view === 'menu' && (
          <Container maxWidth="md" sx={{ mt: 5, textAlign: 'center' }}>
            <Typography variant={isMobile ? "h3" : "h1"} sx={{ color: 'primary.main', mb: 5, fontWeight: '900' }}>חמ"ל שבצ"ק-נט</Typography>
            <Grid container spacing={2} justifyContent="center">
              {[
                { label: 'תמונת מצב', icon: <DashboardIcon fontSize="large"/>, v: 'dashboard', color: '#fbc02d' },
                { label: 'עמדת QR', icon: <QrCodeScannerIcon fontSize="large"/>, v: 'kiosk', color: '#1b5e20' },
                { label: 'ניהול כלים', icon: <DirectionsBusIcon fontSize="large"/>, v: 'fleet', color: '#1565c0' },
                { label: 'ניהול לוחמים', icon: <BadgeIcon fontSize="large"/>, v: 'soldiers', color: '#e65100' }
              ].map(item => (
                <Grid item xs={6} md={3} key={item.v} onClick={() => setView(item.v)}>
                  <ListItemButton sx={{ flexDirection: 'column', p: 2, borderRadius: 4, bgcolor: 'white', borderBottom: `8px solid ${item.color}`, boxShadow: 3, height: '180px', justifyContent: 'center', gap: 2 }}>
                    <Box sx={{ color: item.color }}>{item.icon}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{item.label}</Typography>
                  </ListItemButton>
                </Grid>
              ))}
            </Grid>
          </Container>
        )}

        {view === 'dashboard' && <DashboardPage stats={stats} vehicles={vehicles} setView={setView} setSelectedCategory={setSelectedCategory} />}
        {view === 'kiosk' && <KioskPage setView={setView} scannedId={scannedId} />}
        {view === 'soldiers' && <SoldiersPage soldiersList={soldiersList} vehicles={vehicles} onRefresh={loadData} setView={setView} handleOpenSoldier={handleOpenSoldier} />}
        {view === 'fleet' && <FleetPage vehicles={vehicles} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} setView={setView} handleOpenVehicle={handleOpenVehicle} handleResetAll={handleResetAll} />}

        <Dialog open={openVehicleDialog} onClose={() => setOpenVehicleDialog(false)} fullWidth maxWidth="sm">
          {selectedVehicle && (
            <>
              <DialogTitle sx={{ bgcolor: '#1b5e20', color: 'white' }}>צוות: {selectedVehicle.id}</DialogTitle>
              <DialogContent sx={{ p: 0 }}>
                <List>
                  {selectedVehicle.crew?.map((s) => (
                    <ListItem key={s.military_id} divider secondaryAction={<IconButton edge="end" color="error" onClick={async () => { if (window.confirm(`להסיר את ${s.full_name}?`)) { await api.unassignSoldier(s.military_id); loadData(); } }}><DeleteIcon /></IconButton>}>
                      <ListItemButton onClick={() => handleOpenSoldier(s.military_id)}>
                        <Avatar sx={{ ml: 1.5, bgcolor: s.is_finalized ? '#2e7d32' : 'primary.main' }}>{s.full_name[0]}</Avatar>
                        <Box>
                          <Typography variant="body1">{s.full_name} {s.is_finalized && '✅'}</Typography>
                          <Typography variant="caption">{s.rank} | {s.mission_role}</Typography>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </DialogContent>
              <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <TextField fullWidth size="small" placeholder='מ"א להוספה' value={newSoldierId} onChange={e => setNewSoldierId(e.target.value)} />
                <Button variant="contained" onClick={handleAssign} sx={{ bgcolor: '#1b5e20' }}>הוסף</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        <Dialog open={openSoldierDialog} onClose={() => setOpenSoldierDialog(false)} fullWidth maxWidth="xs">
          {selectedSoldier && (
            <Box sx={{ p: 3, textAlign: 'center', direction: 'rtl' }}>
               <AppBar position="static" sx={{ bgcolor: '#1b5e20', boxShadow: 0, mb: 2 }}>
                <Toolbar>
                   <IconButton edge="start" color="inherit" onClick={() => setOpenSoldierDialog(false)}><ArrowForwardIcon /></IconButton>
                   <Typography sx={{ ml: 2, flex: 1, fontWeight: 'bold' }}>כרטיס לוחם</Typography>
                   <IconButton color="error" onClick={handlePhotoDelete}><DeleteIcon /></IconButton>
                </Toolbar>
              </AppBar>
              
              <input accept="image/*" style={{ display: 'none' }} id="upload-photo-input" type="file" onChange={handlePhotoUpload} />
              <label htmlFor="upload-photo-input">
                <IconButton component="span" sx={{ p: 0 }}>
                  <Avatar src={selectedSoldier.photo_url ? `${API_BASE_URL}${selectedSoldier.photo_url}` : ""} sx={{ width: 100, height: 100, mx: 'auto', border: '3px solid #1b5e20' }}>
                      {!selectedSoldier.photo_url && selectedSoldier.full_name?.[0]}
                  </Avatar>
                </IconButton>
              </label>

              <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold' }}>{selectedSoldier.full_name}</Typography>
              <Typography color="textSecondary">{selectedSoldier.rank} | {selectedSoldier.military_id}</Typography>
              
              <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 4, display: 'inline-block', bgcolor: 'white', mt: 2 }}>
                 <img src={`${API_BASE_URL}${selectedSoldier.qr_url}`} alt="QR" style={{ width: 140, height: 140 }} />
              </Box>

              <Box sx={{ mt: 2, p: 2, bgcolor: '#f1f8e9', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>שיבוץ: {selectedSoldier.assigned_vehicle || 'לא משובץ'}</Typography>
              </Box>
              <Button fullWidth onClick={() => setOpenSoldierDialog(false)} sx={{ mt: 3 }} variant="outlined">סגור</Button>
            </Box>
          )}
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;