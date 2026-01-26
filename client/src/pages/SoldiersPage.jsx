import React, { useState, useMemo } from 'react';
import { 
  Container, Paper, TextField, InputAdornment, Box, Typography, 
  Button, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Avatar, Chip, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; 
import CloudUploadIcon from '@mui/icons-material/CloudUpload'; // האייקון להעלאה

import { api, API_BASE_URL } from '../services/api';

const SoldiersPage = ({ soldiersList, vehicles, onRefresh, setView, handleOpenSoldier }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false); // פילטר לא משובצים
  
  // State לדיאלוג השיבוץ
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSoldierForAssign, setSelectedSoldierForAssign] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // סינון חכם של הרשימה
  const filteredSoldiers = useMemo(() => {
    return soldiersList.filter(s => {
      const matchesSearch = 
        s.full_name.includes(searchTerm) || 
        s.military_id.includes(searchTerm);
      
      const matchesFilter = onlyUnassigned 
        ? (!s.assigned_vehicle_id || s.assigned_vehicle_id === 'לא משובץ')
        : true;

      return matchesSearch && matchesFilter;
    });
  }, [soldiersList, searchTerm, onlyUnassigned]);

  // --- פונקציה להעלאת קובץ CSV (הוספנו חזרה) ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
        alert("נא להעלות קובץ מסוג CSV בלבד");
        return;
    }

    try {
        const res = await api.uploadSoldiersCsv(file);
        if (res.status === 'success') {
            alert(res.message || "הלוחמים נטענו בהצלחה!");
            if (onRefresh) onRefresh();
        }
    } catch (e) {
        console.error(e);
        alert("שגיאה בהעלאת הקובץ. וודא שהפורמט תקין.");
    }
    event.target.value = null;
  };

  // פתיחת דיאלוג שיבוץ
  const handleClickAssign = (soldier) => {
    setSelectedSoldierForAssign(soldier);
    setSelectedVehicleId('');
    setAssignDialogOpen(true);
  };

  // ביצוע השיבוץ מול השרת
  const handleExecuteAssign = async () => {
    if (!selectedVehicleId || !selectedSoldierForAssign) return;

    try {
      const res = await api.assignSoldier(selectedSoldierForAssign.military_id, selectedVehicleId);
      
      if (res.ok) {
        setAssignDialogOpen(false);
        if (onRefresh) onRefresh();
        alert(`החייל שובץ בהצלחה לכלי ${selectedVehicleId}`);
      } else {
        alert("שגיאה בשיבוץ");
      }
    } catch (e) {
      console.error(e);
      alert("תקלה בתקשורת לשרת");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, pb: 8, direction: 'rtl' }}>
      
      {/* כותרת, כפתורי פעולה וחיפוש */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setView('menu')} variant="outlined">
                חזרה
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
            ניהול כוח אדם ({filteredSoldiers.length})
            </Typography>

            {/* כפתור ייבוא CSV */}
            <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                sx={{ bgcolor: '#1976d2', fontWeight: 'bold', mr: 2 }}
            >
                ייבוא מקובץ CSV
                <input
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleFileUpload}
                />
            </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* מתג סינון מהיר */}
            <FormControlLabel 
                control={
                    <Switch 
                        checked={onlyUnassigned} 
                        onChange={(e) => setOnlyUnassigned(e.target.checked)} 
                        color="warning"
                    />
                } 
                label={<Box sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: onlyUnassigned ? 'warning.main' : 'text.secondary' }}><FilterAltIcon sx={{ mr: 0.5 }}/> רק לא משובצים</Box>} 
            />

            <TextField
                size="small"
                placeholder="חפש חייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                }}
                sx={{ bgcolor: 'white', borderRadius: 1, width: 250 }}
            />
        </Box>
      </Box>

      {/* טבלת לוחמים */}
      <TableContainer component={Paper} elevation={4} sx={{ borderRadius: 4 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: '#f5f5f5', fontWeight: 'bold' } }}>
              <TableCell align="right">פרטים אישיים</TableCell>
              <TableCell align="right">מספר אישי</TableCell>
              <TableCell align="right">תפקיד</TableCell>
              <TableCell align="center">שיבוץ נוכחי</TableCell>
              <TableCell align="center">פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSoldiers.map((s) => {
                const isUnassigned = !s.assigned_vehicle_id || s.assigned_vehicle_id === 'לא משובץ';
                
                return (
                <TableRow key={s.military_id} hover>
                    <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={s.photo_url ? `${API_BASE_URL}${s.photo_url}` : ''} sx={{ bgcolor: s.is_finalized ? '#2e7d32' : 'primary.main' }}>
                            {s.full_name[0]}
                        </Avatar>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="subtitle2" fontWeight="bold">{s.full_name}</Typography>
                                {/* ה-V הירוק */}
                                {s.is_finalized && (
                                    <Tooltip title={`אומת ע"י קצין ב-${s.finalized_at || 'שטח'}`} arrow>
                                        <CheckCircleIcon sx={{ color: '#2e7d32', ml: 1, fontSize: 18 }} />
                                    </Tooltip>
                                )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">{s.rank}</Typography>
                        </Box>
                    </Box>
                    </TableCell>
                    <TableCell align="right">{s.military_id}</TableCell>
                    <TableCell align="right">{s.mission_role}</TableCell>
                    
                    <TableCell align="center">
                        {isUnassigned ? (
                            <Chip label="לא משובץ" color="error" variant="outlined" sx={{ fontWeight: 'bold' }} />
                        ) : (
                            <Chip 
                                icon={<DirectionsBusIcon />} 
                                label={s.assigned_vehicle_id} 
                                color="primary" 
                                sx={{ fontWeight: 'bold' }} 
                                onClick={() => setSearchTerm(s.assigned_vehicle_id)}
                            />
                        )}
                    </TableCell>

                    <TableCell align="center">
                        {isUnassigned ? (
                             <Button 
                                variant="contained" 
                                size="small" 
                                color="warning" 
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={() => handleClickAssign(s)}
                                sx={{ borderRadius: 4 }}
                             >
                                שבץ
                             </Button>
                        ) : (
                            <Button 
                                variant="text" 
                                size="small" 
                                startIcon={<PersonIcon />}
                                onClick={() => handleOpenSoldier(s.military_id)}
                            >
                                כרטיס
                            </Button>
                        )}
                    </TableCell>
                </TableRow>
                );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* דיאלוג שיבוץ */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle sx={{ bgcolor: '#1b5e20', color: 'white' }}>
            שיבוץ לוחם: {selectedSoldierForAssign?.full_name}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                    <InputLabel>בחר כלי לשיבוץ</InputLabel>
                    <Select
                        value={selectedVehicleId}
                        label="בחר כלי לשיבוץ"
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                    >
                        {/* רשימת הכלים עם חיווי מקום פנוי */}
                        {vehicles && vehicles
                           .sort((a, b) => a.id.localeCompare(b.id))
                           .map(v => (
                            <MenuItem key={v.id} value={v.id} disabled={v.current_occupancy >= v.capacity}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <Typography fontWeight="bold">{v.id}</Typography>
                                    <Typography variant="caption" color={v.current_occupancy >= v.capacity ? 'error' : 'text.secondary'}>
                                        ({v.current_occupancy}/{v.capacity})
                                    </Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setAssignDialogOpen(false)} color="inherit">ביטול</Button>
            <Button onClick={handleExecuteAssign} variant="contained" color="primary" disabled={!selectedVehicleId}>
                שמור שיבוץ
            </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default SoldiersPage;