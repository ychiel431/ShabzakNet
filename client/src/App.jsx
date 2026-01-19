import React, { useState, useEffect } from 'react';

// --- ייבוא רכיבי עיצוב (Material UI) ---
import { 
  Container, Grid, Card, Typography, Box, Chip, 
  CircularProgress, AppBar, Toolbar, Button, TextField, Paper, 
  Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, IconButton, Avatar, ListItemButton
} from '@mui/material';

// --- ייבוא אייקונים ---
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import BadgeIcon from '@mui/icons-material/Badge';
import SearchIcon from '@mui/icons-material/Search';
import { LinearProgress } from '@mui/material'; // להוסיף בתוך ה-import הקיים של material
import PieChartIcon from '@mui/icons-material/PieChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import DashboardIcon from '@mui/icons-material/Dashboard'; 
// --- הגדרות שרת ---
const SERVER_IP = window.location.hostname;
const API_BASE_URL = `http://${SERVER_IP}:8080`;

// --- קטגוריות כלים ---
const CATEGORIES = [
  { id: 'HUMMER', name: 'האמר', color: '#1b5e20' },
  { id: 'MERKAVA', name: 'מרכבה', color: '#33691e' },
  { id: 'NAMER', name: 'נמר', color: '#558b2f' },
  { id: 'ZEEV', name: 'זאב', color: '#2e7d32' }
];

// רכיב עזר להרצת מספרים (Count Up Animation)
const AnimatedNumber = ({ value }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (start === end) return;

    let timer = setInterval(() => {
      start += Math.ceil(end / 50); // מהירות הריצה
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, 20); // כל 20 מילישניות

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
};


function App() {
  // --- ניהול מצבי תצוגה ---
  const [view, setView] = useState('menu'); // 'menu', 'kiosk', 'fleet', 'soldiers'
  const [loading, setLoading] = useState(false);

  // --- נתונים מהשרת ---
  const [vehicles, setVehicles] = useState([]);
  const [soldiersList, setSoldiersList] = useState([]);

  // --- States לניהול כלים ---
  const [selectedCategory, setSelectedCategory] = useState(null); 
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [openVehicleDialog, setOpenVehicleDialog] = useState(false);
  const [newSoldierId, setNewSoldierId] = useState(''); // להוספת חייל לכלי

  // --- States לניהול לוחמים ---
  const [soldierSearch, setSoldierSearch] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState(null);
  const [openSoldierDialog, setOpenSoldierDialog] = useState(false);

  // --- States לעמדת QR (קיוסק) ---
  const [kioskMode, setKioskMode] = useState('soldier'); // 'soldier' או 'vehicle'
  const [militaryIdInput, setMilitaryIdInput] = useState('');
  const [generatedQr, setGeneratedQr] = useState(null);

  // State לדשבורד מפקד
  const [stats, setStats] = useState({ 
    totalSoldiers: 0, assignedSoldiers: 0, 
    totalVehicles: 0, fullVehicles: 0, readiness: 0 
  });

  // --- טעינת נתונים ראשונית ---
  useEffect(() => {
    if (view === 'fleet') fetchVehicles();
    if (view === 'menu') fetchStats();
    if (view === 'soldiers') fetchAllSoldiers();
  }, [view]);

  // --- פונקציות תקשורת עם השרת (API) ---

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/list`);
      const data = await res.json();
      setVehicles(data);
    } catch (e) { console.error("Error fetching vehicles:", e); }
    setLoading(false);
  };
  // --- פונקציה לחישוב נתוני דשבורד ---
  const fetchStats = async () => {
    try {
      const [resVehicles, resSoldiers] = await Promise.all([
        fetch(`${API_BASE_URL}/vehicles/list`),
        fetch(`${API_BASE_URL}/admin/soldiers/list`)
      ]);
      
      let vData = await resVehicles.json();
      const sData = await resSoldiers.json();

      // --- התיקון: הזרקת קיבולת ברירת מחדל אם חסרה ---
      vData = vData.map(v => {
        let defaultCap = 4; // ברירת מחדל כללית
        
        // הגדרת קיבולת לפי השם של הרכב
        if (v.id.includes('HUMMER')) defaultCap = 5;   // האמר: נהג + 4
        if (v.id.includes('ZEEV')) defaultCap = 8;     // זאב
        if (v.id.includes('NAMER')) defaultCap = 11;   // נמר (כיתה + מפקדים)
        if (v.id.includes('MERKAVA')) defaultCap = 4;  // טנק: צוות של 4

        // אם יש קיבולת אמיתית בדאטה-בייס נשתמש בה, אחרת נשתמש בברירת המחדל
        const finalCapacity = (v.capacity && v.capacity > 0) ? v.capacity : defaultCap;
        
        return { ...v, capacity: finalCapacity };
      });
      // ------------------------------------------------

      const totalSol = sData.length || 0;
      const assignedSol = sData.filter(s => s.assigned_vehicle_id && s.assigned_vehicle_id.trim() !== '' && s.assigned_vehicle_id !== 'לא משובץ').length;
      
      const totalVeh = vData.length || 0;
      
      // עכשיו החישוב יעבוד כי לכולם יש capacity

      // בתוך fetchStats - החלף את שורת החישוב של fullVeh
      const fullVeh = vData.filter(v => {
        // הגדרת סף מינימום למילוי לפי סוג
        let minToFull = 4; 
        if (v.id.includes('NAMER')) minToFull = 11;
        if (v.id.includes('ZEEV')) minToFull = 12;
        
        // הכלי נחשב מלא אם הגענו לסף המינימום, בלי קשר למה שכתוב בקיבולת המשתנה
        return v.current_occupancy >= minToFull;
      }).length;
      

      const solPercent = totalSol > 0 ? (assignedSol / totalSol) : 0;
      const vehPercent = totalVeh > 0 ? (fullVeh / totalVeh) : 0;
      const readiness = Math.round(((solPercent + vehPercent) / 2) * 100);

      setStats({
        totalSoldiers: totalSol,
        assignedSoldiers: assignedSol,
        totalVehicles: totalVeh,
        fullVehicles: fullVeh,
        readiness: readiness
      });
    } catch (e) { console.error("Error fetching stats:", e); }
  };

  // --- מסך דשבורד מפקד חדש ומעוצב ---
  // --- מסך דשבורד מפקד חדש ומעוצב עם אפקטים ותיקון נתונים ---
  const renderDashboardPage = () => {
    // חישוב אחוזים למסך (סנכרון מלא עם fetchStats)
    const solPercent = stats.totalSoldiers > 0 ? Math.round((stats.assignedSoldiers / stats.totalSoldiers) * 100) : 0;
    const vehPercent = stats.totalVehicles > 0 ? Math.round((stats.fullVehicles / stats.totalVehicles) * 100) : 0;

    return (
      <Container maxWidth="xl" sx={{ mt: 4, px: 4, pb: 8, animation: 'fadeIn 0.8s ease-in-out' }}>
        <style>
          {`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes ripple { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
            .cool-card { transition: all 0.3s ease; border-radius: 20px !important; }
            .cool-card:hover { transform: translateY(-5px); box-shadow: 0 12px 30px rgba(0,0,0,0.12) !important; }
          `}
        </style>

        {/* כותרת וכפתור חזרה */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 5, justifyContent: 'space-between' }}>
           <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
            📊 תמונת מצב גדודית
          </Typography>
          <Button startIcon={<ArrowBackIcon />} onClick={() => setView('menu')} variant="contained" sx={{ bgcolor: '#1b5e20', borderRadius: 3 }}>
            חזרה לתפריט
          </Button>
        </Box>

        <Grid container spacing={4}>
          {/* כרטיס 1: כשירות מבצעית */}
          <Grid item xs={12} md={4}>
            <Paper elevation={8} sx={{ p: 4, bgcolor: '#2e7d32', color: 'white', borderRadius: 5, height: '100%', position: 'relative', overflow: 'hidden' }}>
              <AssessmentIcon sx={{ fontSize: 120, opacity: 0.1, position: 'absolute', right: -10, bottom: -10 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>כשירות מבצעית</Typography>
              <Typography variant="h1" sx={{ fontWeight: '900', mb: 2 }}>
                <AnimatedNumber value={stats.readiness} />%
              </Typography>
              <LinearProgress variant="determinate" value={stats.readiness} sx={{ height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#76ff03' } }} />
            </Paper>
          </Grid>

          {/* כרטיס 2: כוח אדם */}
          <Grid item xs={12} md={4}>
            <Paper elevation={4} className="cool-card" sx={{ p: 4, textAlign: 'center', height: '100%' }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#1565c0' }}>כוח אדם</Typography>
              <Box sx={{ position: 'relative', width: 150, height: 150, mx: 'auto', borderRadius: '50%', background: `conic-gradient(#1565c0 ${solPercent}%, #e3f2fd 0)` }}>
                <Box sx={{ position: 'absolute', inset: 10, bgcolor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1565c0' }}>{solPercent}%</Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ mt: 3 }}>{stats.assignedSoldiers} / {stats.totalSoldiers} משובצים</Typography>
            </Paper>
          </Grid>

          {/* כרטיס 3: צי רכב */}
          <Grid item xs={12} md={4}>
            <Paper elevation={4} className="cool-card" sx={{ p: 4, textAlign: 'center', height: '100%' }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#2e7d32' }}>צי רכב</Typography>
              <Box sx={{ position: 'relative', width: 150, height: 150, mx: 'auto', borderRadius: '50%', background: `conic-gradient(#2e7d32 ${vehPercent}%, #e8f5e9 0)` }}>
                <Box sx={{ position: 'absolute', inset: 10, bgcolor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{vehPercent}%</Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ mt: 3 }}>{stats.fullVehicles} / {stats.totalVehicles} כלים מלאים</Typography>
            </Paper>
          </Grid>

          {/* פירוט לפי סוגי כלים - תיקון החישוב שביקשת */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 4, borderRadius: 5 }}>
              <Typography variant="h5" sx={{ mb: 4, fontWeight: 'bold' }}>📋 פירוט לפי סוגי כלים</Typography>
              <Grid container spacing={3}>
                {CATEGORIES.map(cat => {
                  const typeVehicles = vehicles.filter(v => v.id.startsWith(cat.id));
                  const totalType = typeVehicles.length;

                  // הגדרת סף המילוי בדיוק לפי הנתונים המבצעיים שלך
                  let minToFull = 4; 
                  if (cat.id === 'NAMER') minToFull = 11;
                  if (cat.id === 'ZEEV') minToFull = 12;

                  const fullType = typeVehicles.filter(v => v.current_occupancy >= minToFull).length;
                  const percent = totalType > 0 ? Math.round((fullType / totalType) * 100) : 0;
                  
                  return (
                    <Grid item xs={12} sm={6} md={3} key={cat.id}>
                      <Box className="cool-card" sx={{ p: 2, border: '1px solid #eee', borderRadius: 4, position: 'relative' }}>
                        {/* אפקט דופק ליד כלים מלאים */}
                        {percent === 100 && totalType > 0 && (
                          <Box sx={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%', animation: 'ripple 1.5s infinite' }} />
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <DirectionsBusIcon sx={{ color: cat.color, mr: 1 }} />
                          <Typography fontWeight="bold">{cat.name}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="h6" color={cat.color} fontWeight="bold">{percent}%</Typography>
                          <Typography variant="caption" sx={{ mt: 1 }}>{fullType} / {totalType}</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 4, bgcolor: '#eee', '& .MuiLinearProgress-bar': { bgcolor: cat.color } }} />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    );
  };


  const fetchAllSoldiers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/soldiers/list`);
      const data = await res.json();
      setSoldiersList(data);
    } catch (e) { console.error("Error fetching soldiers:", e); }
    setLoading(false);
  };

  // פונקציה להוספת חייל לכלי (שיבוץ)
const handleAssign = async () => {
    if (!newSoldierId) return;
    const formData = new FormData();
    formData.append('military_id', newSoldierId);
    formData.append('vehicle_id', selectedVehicle.id);
    formData.append('override', 'false'); // ברירת מחדל: לא דורסים

    try {
      const res = await fetch(`${API_BASE_URL}/admin/assign-soldier`, { method: 'POST', body: formData });
      
      if (res.ok) {
        setNewSoldierId('');
        await fetchVehicles(); // רענון הנתונים
        setOpenVehicleDialog(false);
      } else if (res.status === 409) {
        // קונפליקט! החייל שובץ כבר במקום אחר
        const data = await res.json();
        if (window.confirm(`${data.detail}.\nהאם אתה בטוח שברצונך להעביר אותו לכלי זה?`)) {
            // המשתמש אישר דריסה
            formData.set('override', 'true');
            const retryRes = await fetch(`${API_BASE_URL}/admin/assign-soldier`, { method: 'POST', body: formData });
            if (retryRes.ok) {
                setNewSoldierId('');
                await fetchVehicles();
                setOpenVehicleDialog(false);
            }
        }
      } else { alert("חייל לא נמצא במערכת"); }
    } catch (e) { console.error(e); }
  };
  // פונקציה להסרת חייל מכלי (ביטול שיבוץ)
  const handleUnassign = async (mId, fName) => {
    // בדיקת בטיחות לפני מחיקה
    if(!window.confirm(`הסרת לוחם מהכלי: ${fName || mId}\nהאם אתה בטוח?`)) return;
    
    const formData = new FormData();
    formData.append('military_id', mId);
    await fetch(`${API_BASE_URL}/admin/unassign-soldier`, { method: 'POST', body: formData });
    fetchVehicles(); // רענון המסך בלי לסגור את הדיאלוג
  };

  // פונקציה להפקת QR בעמדה (תומכת גם בלוחם וגם בכלי)
  const handleGenerateQr = async () => {
    if (!militaryIdInput) return;
    setLoading(true);
    try {
      // בחירת הכתובת לפי המצב (לוחם או כלי)
      let endpoint = kioskMode === 'soldier' 
        ? `${API_BASE_URL}/kiosk/identify/${militaryIdInput}`
        : `${API_BASE_URL}/admin/vehicle-qr/${militaryIdInput}`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (res.ok) {
        // נרמול הנתונים לתצוגה אחידה
        setGeneratedQr({
          ...data,
          title: kioskMode === 'soldier' ? data.full_name : `כלי: ${militaryIdInput}`,
          subtitle: kioskMode === 'soldier' ? `${data.rank} | מ"א: ${data.military_id}` : `שבצ"ק כלי פעיל`,
          mainDetail: kioskMode === 'soldier' ? `שיבוץ: ${data.assigned_vehicle}` : `סרוק לרשימת לוחמים`,
          isVehicle: kioskMode === 'vehicle'
        });
      } else { 
        alert("לא נמצא במערכת (בדוק מספר אישי/ID)"); 
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // פונקציה לפתיחת כרטיס לוחם מלא
  const handleOpenSoldier = async (mId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/kiosk/identify/${mId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedSoldier(data);
        setOpenSoldierDialog(true);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // --- רכיבי תצוגה (Components) ---

  // 1. עמדת קיוסק (QR)
  const renderKiosk = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', width: '100%' }}>
    <Button 
      onClick={() => {setView('menu'); setGeneratedQr(null); setMilitaryIdInput('');}} 
      variant="outlined" 
      sx={{ mb: 3 }}
    >
      חזרה לתפריט
    </Button>
    
    {/* Paper עם הגדרות לחיתוך הפינות עבור ה-Header הירוק */}
    <Paper 
      elevation={10} 
      sx={{ 
        p: 0, 
        width: '95%', 
        maxWidth: 550, 
        borderRadius: '20px', 
        overflow: 'hidden', 
        textAlign: 'center', 
        borderTop: '8px solid #1b5e20' 
      }}
    >
      {!generatedQr ? (
        <Box sx={{ p: 5 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20', mb: 3 }}>מרכז הנפקת QR</Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
            <Button 
              variant={kioskMode === 'soldier' ? "contained" : "outlined"} 
              onClick={() => setKioskMode('soldier')} 
              sx={{ bgcolor: kioskMode === 'soldier' ? '#1b5e20' : '', borderRadius: 2, px: 4, fontSize: '1.1rem' }}
            >
              לוחם (מ"א)
            </Button>
            <Button 
              variant={kioskMode === 'vehicle' ? "contained" : "outlined"} 
              onClick={() => setKioskMode('vehicle')} 
              sx={{ bgcolor: kioskMode === 'vehicle' ? '#1b5e20' : '', borderRadius: 2, px: 4, fontSize: '1.1rem' }}
            >
              כלי (ID)
            </Button>
          </Box>

          <TextField 
            fullWidth 
            autoFocus 
            label={kioskMode === 'soldier' ? "הקש מספר אישי" : "הקש ID כלי (לדוגמה: HUMMER-1)"} 
            value={militaryIdInput} 
            onChange={(e) => setMilitaryIdInput(e.target.value)} 
            sx={{ mb: 4 }} 
            inputProps={{ style: { fontSize: '2.5rem', textAlign: 'center', fontWeight: 'bold' } }} 
          />
          
          <Button 
            fullWidth 
            variant="contained" 
            size="large" 
            sx={{ height: 80, fontSize: 24, bgcolor: '#1b5e20', borderRadius: 4 }} 
            onClick={handleGenerateQr}
            disabled={loading}
          >
              {loading ? <CircularProgress color="inherit" /> : "הפק מדבקה"}
          </Button>
        </Box>
      ) : (
        <Box sx={{ direction: 'rtl' }}>
          {/* ה-Header הירוק שסונכרן מהמובייל */}
          <Box sx={{ bgcolor: '#1b5e20', py: 2, color: 'white' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              שבצ"ק-נט: {generatedQr.isVehicle ? "מדבקת רכב" : "כרטיס לוחם"}
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* הצגת התאריך שביקשת */}
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#666', fontWeight: 'bold' }}>
              תאריך: {new Date().toLocaleDateString('he-IL')}
            </Typography>

            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20', mb: 0.5 }}>
              {generatedQr.title}
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
              {generatedQr.subtitle}
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 4, border: '1px solid #ddd', my: 2 }}>
              <img src={`${API_BASE_URL}${generatedQr.qr_url}`} alt="QR" style={{ width: 280, height: 280 }} />
            </Box>
            
            {/* פס השיבוץ המבצעי והרחב */}
            <Box sx={{ mt: 2, p: 2, bgcolor: generatedQr.isVehicle ? '#e3f2fd' : '#f1f8e9', borderRadius: 3, border: `3px solid ${generatedQr.isVehicle ? '#1565c0' : '#2e7d32'}` }}>
               <Typography variant="h2" sx={{ fontWeight: 'bold', color: generatedQr.isVehicle ? '#1565c0' : '#1b5e20' }}>
                 {generatedQr.mainDetail}
               </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                <Button fullWidth variant="outlined" size="large" onClick={() => window.print()} sx={{ borderRadius: '10px' }}>הדפס מדבקה</Button>
                <Button fullWidth variant="contained" size="large" onClick={() => {setGeneratedQr(null); setMilitaryIdInput('');}} sx={{ bgcolor: '#1b5e20', borderRadius: '10px' }}>הבא בתור</Button>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  </Box>
);

  const renderStatsDashboard = () => (
    <Grid container spacing={3} sx={{ mb: 6, px: 4 }}>
        {/* קוביה 1: מצבת כ"א */}
        <Grid item xs={12} md={4}>
            <Paper elevation={4} sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', bgcolor: 'white' }}>
                <GroupIcon sx={{ fontSize: 60, color: '#1565c0', ml: 2 }} />
                <Box>
                    <Typography variant="h6" color="text.secondary">מצבת כוח אדם</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {stats.assignedSoldiers} <span style={{ fontSize: '1.2rem', color: '#888' }}>/ {stats.totalSoldiers}</span>
                    </Typography>
                    <Typography variant="body2" color={stats.assignedSoldiers === stats.totalSoldiers ? 'success.main' : 'warning.main'}>
                        {stats.totalSoldiers > 0 ? Math.round((stats.assignedSoldiers / stats.totalSoldiers) * 100) : 0}% משובצים
                    </Typography>
                </Box>
            </Paper>
        </Grid>
        
        {/* קוביה 2: כשירות צי */}
        <Grid item xs={12} md={4}>
            <Paper elevation={4} sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', bgcolor: 'white' }}>
                <AssessmentIcon sx={{ fontSize: 60, color: '#2e7d32', ml: 2 }} />
                <Box>
                    <Typography variant="h6" color="text.secondary">כשירות כלים מלאה</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {stats.fullVehicles} <span style={{ fontSize: '1.2rem', color: '#888' }}>/ {stats.totalVehicles}</span>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">כלים בתפוסה מלאה</Typography>
                </Box>
            </Paper>
        </Grid>

        {/* קוביה 3: מד מוכנות גדודי */}
        <Grid item xs={12} md={4}>
            <Paper elevation={4} sx={{ p: 3, borderRadius: 4, bgcolor: '#f1f8e9', border: '1px solid #c5e1a5' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#33691e' }}>מוכנות מבצעית</Typography>
                    <PieChartIcon sx={{ color: '#33691e' }} />
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#33691e', mb: 1 }}>{stats.readiness}%</Typography>
                <LinearProgress 
                    variant="determinate" 
                    value={stats.readiness} 
                    sx={{ height: 10, borderRadius: 5, bgcolor: '#dcedc8', '& .MuiLinearProgress-bar': { bgcolor: stats.readiness > 80 ? '#2e7d32' : stats.readiness > 50 ? '#ef6c00' : '#d32f2f' } }} 
                />
            </Paper>
        </Grid>
    </Grid>
  );

  // 2. תצוגת ניהול כלים (היררכית)
  const renderFleet = () => {
    // שלב א': בחירת קטגוריה
    if (!selectedCategory) {
      return (
        <Container maxWidth={false} sx={{ mt: 10, px: 6 }}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setView('menu')} variant="outlined" sx={{ mb: 2 }}>חזרה לתפריט</Button>
            <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>בחר סוג כלי</Typography>
          </Box>
          <Grid container spacing={4} justifyContent="center">
            {CATEGORIES.map(cat => (
              <Grid item xs={12} sm={6} md={3} key={cat.id}>
                <Paper 
                  elevation={8} 
                  onClick={() => setSelectedCategory(cat.id)} 
                  sx={{ 
                    p: 8, textAlign: 'center', borderRadius: 5, cursor: 'pointer', 
                    borderBottom: `12px solid ${cat.color}`, 
                    transition: '0.3s', 
                    '&:hover': { transform: 'translateY(-10px)', bgcolor: '#f1f8e9' } 
                  }}
                >
                  <DirectionsBusIcon sx={{ fontSize: 100, color: cat.color }} />
                  <Typography variant="h3" sx={{ mt: 2, fontWeight: 'bold' }}>{cat.name}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      );
    }

    // שלב ב': רשימת הכלים בקטגוריה
    const filteredVehicles = vehicles.filter(v => v.id.startsWith(selectedCategory));

    return (
      <Container maxWidth={false} sx={{ mt: 5, px: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedCategory(null)} variant="outlined">חזרה לסוגי כלים</Button>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
            צי {CATEGORIES.find(c => c.id === selectedCategory).name}
          </Typography>
          <Box sx={{ width: 100 }} />
        </Box>
        
        <Grid container spacing={3}>
          {filteredVehicles.map(v => (
            <Grid item xs={12} sm={6} md={3} lg={2} key={v.id}>
              <Card 
                elevation={3} 
                onClick={() => { setSelectedVehicle(v); setOpenVehicleDialog(true); }} 
                sx={{ 
                  height: 200, borderRadius: 4, display: 'flex', flexDirection: 'column', 
                  justifyContent: 'center', alignItems: 'center', borderTop: '10px solid #1b5e20', 
                  cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'scale(1.05)', boxShadow: 6 } 
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{v.id}</Typography>
                <Chip 
                  label={`${v.current_occupancy} / ${v.capacity}`} 
                  color={v.current_occupancy >= v.capacity ? "error" : "primary"} 
                  sx={{ mt: 2, fontWeight: 'bold', fontSize: '1.2rem' }} 
                />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  };

  // 3. תצוגת ניהול לוחמים (הקוביה השלישית)
  const renderSoldiersManager = () => {
    // לוגיקת סינון
    const filtered = soldiersList.filter(s => {
      const matchesSearch = s.full_name.includes(soldierSearch) || s.military_id.includes(soldierSearch);
      const isUnassigned = s.assigned_vehicle_id === "לא משובץ" || !s.assigned_vehicle_id;
      
      return matchesSearch && (filterUnassigned ? isUnassigned : true);
    });

    return (
      <Container maxWidth={false} sx={{ mt: 5, px: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => setView('menu')} variant="outlined">חזרה</Button>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>ניהול כוח אדם</Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              placeholder="חיפוש חייל (שם/מ״א)..." 
              value={soldierSearch} 
              onChange={(e) => setSoldierSearch(e.target.value)} 
              size="small" 
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'gray' }} /> }}
            />
            <Button 
              variant={filterUnassigned ? "contained" : "outlined"} 
              color="warning" 
              onClick={() => setFilterUnassigned(!filterUnassigned)}
            >
              רק לא משובצים
            </Button>
          </Box>
        </Box>

        <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <List>
            {filtered.map(s => (
              <ListItem key={s.military_id} divider>
                <ListItemButton onClick={() => handleOpenSoldier(s.military_id)}>
                  <Avatar sx={{ mr: 2, bgcolor: '#1b5e20' }}>{s.full_name[0]}</Avatar>
                  <ListItemText 
                    primary={<Typography variant="h6">{s.rank} {s.full_name}</Typography>} 
                    secondary={`מ"א: ${s.military_id} | שיבוץ: ${s.assigned_vehicle_id || 'לא משובץ'}`} 
                  />
                  <Chip 
                    label={(!s.assigned_vehicle_id || s.assigned_vehicle_id === 'לא משובץ') ? 'ממתין' : 'משובץ'} 
                    color={(!s.assigned_vehicle_id || s.assigned_vehicle_id === 'לא משובץ') ? 'error' : 'success'} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    );
  };

  // --- הרינדור הראשי של האפליקציה ---
  return (
    <Box sx={{ bgcolor: '#f4f6f8', minHeight: '100vh', direction: 'rtl' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#1b5e20' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>ShabzakNet v2.0</Typography>
          {view !== 'menu' && <Button color="inherit" onClick={() => setView('menu')}>חזרה לתפריט ראשי</Button>}
        </Toolbar>
      </AppBar>
{/* תפריט ראשי מעודכן - 4 קוביות */}
      {view === 'menu' && (
        <Container maxWidth={false} sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ fontWeight: 'bold', color: '#1b5e20', mb: 8, fontSize: '5rem' }}>חמ"ל שבצ"ק-נט</Typography>
            
            <Grid container spacing={4} justifyContent="center" sx={{ px: 4, maxWidth: '1600px', mx: 'auto' }}>
                
                {/* 1. דשבורד מפקד (החדש!) */}
                <Grid item xs={12} sm={6} md={3} onClick={() => setView('dashboard')}>
                    <Paper elevation={10} sx={{ p: 4, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6, transition: '0.3s', borderBottom: '6px solid #f9a825', '&:hover': { transform: 'translateY(-10px)', bgcolor: '#fffde7' } }}>
                        <DashboardIcon sx={{ fontSize: 100, color: '#fbc02d' }} />
                        <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#333' }}>תמונת מצב</Typography>
                    </Paper>
                </Grid>

                {/* 2. עמדת QR */}
                <Grid item xs={12} sm={6} md={3} onClick={() => setView('kiosk')}>
                    <Paper elevation={10} sx={{ p: 4, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6, transition: '0.3s', borderBottom: '6px solid #1b5e20', '&:hover': { transform: 'translateY(-10px)', bgcolor: '#f1f8e9' } }}>
                        <QrCodeScannerIcon sx={{ fontSize: 100, color: '#2e7d32' }} />
                        <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#333' }}>עמדת QR</Typography>
                    </Paper>
                </Grid>
                
                {/* 3. ניהול כלים */}
                <Grid item xs={12} sm={6} md={3} onClick={() => setView('fleet')}>
                    <Paper elevation={10} sx={{ p: 4, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6, transition: '0.3s', borderBottom: '6px solid #1565c0', '&:hover': { transform: 'translateY(-10px)', bgcolor: '#e3f2fd' } }}>
                        <DirectionsBusIcon sx={{ fontSize: 100, color: '#1565c0' }} />
                        <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#333' }}>ניהול כלים</Typography>
                    </Paper>
                </Grid>
                
                {/* 4. ניהול לוחמים */}
                <Grid item xs={12} sm={6} md={3} onClick={() => setView('soldiers')}>
                    <Paper elevation={10} sx={{ p: 4, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6, transition: '0.3s', borderBottom: '6px solid #e65100', '&:hover': { transform: 'translateY(-10px)', bgcolor: '#fff3e0' } }}>
                        <BadgeIcon sx={{ fontSize: 100, color: '#e65100' }} />
                        <Typography variant="h4" sx={{ mt: 2, fontWeight: 'bold', color: '#333' }}>ניהול לוחמים</Typography>
                    </Paper>
                </Grid>

            </Grid>
        </Container>
      )}

      {/* תצוגת המסכים השונים */}
      {view === 'kiosk' && renderKiosk()}
      {view === 'fleet' && renderFleet()}
      {view === 'soldiers' && renderSoldiersManager()}
      {view === 'dashboard' && renderDashboardPage()}


      {/* --- דיאלוגים (חלונות קופצים) --- */}

      {/* דיאלוג ניהול צוות רכב */}
      <Dialog open={openVehicleDialog} onClose={() => setOpenVehicleDialog(false)} fullWidth maxWidth="sm">
        {selectedVehicle && (
          <>
            <DialogTitle sx={{ bgcolor: '#1b5e20', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              צוות: {selectedVehicle.id}
            </DialogTitle>
            
            <DialogContent sx={{ mt: 2 }}>
              {/* רשימת הלוחמים בכלי */}
              <List>
                {selectedVehicle.crew && selectedVehicle.crew.length > 0 ? (
                  selectedVehicle.crew.map((s) => (
                    <ListItem 
                      key={s.military_id} 
                      divider 
                      secondaryAction={
                        <IconButton color="error" onClick={() => handleUnassign(s.military_id, s.full_name)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton onClick={() => handleOpenSoldier(s.military_id)}>
                        <Avatar sx={{ mr: 2, bgcolor: '#eee', color: '#1b5e20' }}>{s.rank?.[0]}</Avatar>
                        <ListItemText 
                          primary={`${s.rank} ${s.full_name}`} 
                          secondary={`תפקיד: ${s.mission_role || 'לוחם'}`} 
                        />
                      </ListItemButton>
                    </ListItem>
                  ))
                ) : (
                  <Typography sx={{ textAlign: 'center', color: '#666', my: 2 }}>אין לוחמים משובצים בכלי זה</Typography>
                )}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              {/* הוספת לוחם חדש */}
              <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
                <TextField 
                  fullWidth size="small" label="הוסף חייל לפי מ״א" 
                  value={newSoldierId} 
                  onChange={(e) => setNewSoldierId(e.target.value)} 
                />
                <Button variant="contained" sx={{ bgcolor: '#1b5e20' }} onClick={handleAssign}>הוסף</Button>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
               <Button 
                 variant="outlined" color="secondary" 
                 onClick={async () => {
                   const res = await fetch(`${API_BASE_URL}/admin/vehicle-qr/${selectedVehicle.id}`);
                   const data = await res.json();
                   window.open(`${API_BASE_URL}${data.qr_url}`, '_blank');
                 }}
               >
                 הדפס QR רכב
               </Button>
               <Button onClick={() => setOpenVehicleDialog(false)}>סגור</Button>
            </DialogActions>
          </>
        )}
      </Dialog>


      {/* כרטיס לוחם אלגנטי (מדבקה) */}
      <Dialog 
        open={openSoldierDialog} 
        onClose={() => setOpenSoldierDialog(false)} 
        maxWidth="xs" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
          {selectedSoldier && (
            <Box sx={{ direction: 'rtl' }}>
              <Box sx={{ bgcolor: '#1b5e20', py: 2, textAlign: 'center', color: 'white' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>כרטיס לוחם / מדבקת שיבוץ</Typography>
              </Box>
              
              <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#666', fontWeight: 'bold' }}>
                  תאריך שיבוץ: {new Date().toLocaleDateString('he-IL')}
                </Typography>
                
                <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2, border: '4px solid #1b5e20', bgcolor: '#eee', color: '#1b5e20', fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {selectedSoldier.full_name?.[0]}
                </Avatar>
                
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {selectedSoldier.rank} {selectedSoldier.full_name}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>מספר אישי: {selectedSoldier.military_id}</Typography>

                <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 3, border: '1px solid #ddd', my: 2 }}>
                  <img src={`${API_BASE_URL}${selectedSoldier.qr_url}`} alt="QR" style={{ width: '220px', height: '220px', display: 'block' }} />
                </Box>
                
                <Box sx={{ mt: 1, p: 2, bgcolor: '#f1f8e9', borderRadius: 2, border: '2px solid #2e7d32' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
                    שיבוץ: {selectedSoldier.assigned_vehicle}
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'right', mt: 3, px: 2 }}>
                    <Typography variant="body1"><strong>📦 יחידה:</strong> {selectedSoldier.unit || 'גולני'}</Typography>
                    <Typography variant="body1"><strong>🎖️ תפקיד:</strong> {selectedSoldier.mission_role || 'לוחם'}</Typography>
                </Box>
              </DialogContent>
              
              <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
                <Button onClick={() => window.print()} variant="outlined" color="primary">הדפס מדבקה</Button>
                <Button onClick={() => setOpenSoldierDialog(false)} variant="contained" sx={{ bgcolor: '#1b5e20' }}>סגור</Button>
              </DialogActions>
            </Box>
          )}
      </Dialog>

    </Box>
  );
}

export default App;