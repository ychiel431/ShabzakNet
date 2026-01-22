import React, { useState } from 'react';
import { 
  Container, Box, Typography, Button, TextField, 
  Paper, List, ListItem, ListItemText, ListItemButton, 
  Avatar, Chip, Tooltip 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
// --- הוספת הייבוא של ה-V הירוק ---
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; 

const SoldiersPage = ({ soldiersList, setView, handleOpenSoldier }) => {
  const [soldierSearch, setSoldierSearch] = useState('');
  const [filterUnassigned, setFilterUnassigned] = useState(false);

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

      <Paper sx={{ borderRadius: 4, overflow: 'hidden', elevation: 3 }}>
        <List>
          {filtered.map(s => (
            <ListItem key={s.military_id} divider disablePadding>
              <ListItemButton onClick={() => handleOpenSoldier(s.military_id)}>
                <Avatar sx={{ ml: 2, mr: 2, bgcolor: s.is_finalized ? '#2e7d32' : '#1b5e20' }}>
                  {s.full_name[0]}
                </Avatar>
                
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h6">{s.rank} {s.full_name}</Typography>
                      
                      {/* --- כאן הוספנו את ה-V הירוק --- */}
                      {s.is_finalized && (
                        <Tooltip title={`אומת ע"י קצין ב-${s.finalized_at || 'שטח'}`} arrow>
                          <CheckCircleIcon 
                            sx={{ color: '#2e7d32', ml: 1, fontSize: 22 }} 
                          />
                        </Tooltip>
                      )}
                      {/* ------------------------------- */}
                    </Box>
                  } 
                  secondary={`מ"א: ${s.military_id} | שיבוץ: ${s.assigned_vehicle_id || 'לא משובץ'}`} 
                  sx={{ textAlign: 'right' }}
                />
                
                <Chip 
                  label={(!s.assigned_vehicle_id || s.assigned_vehicle_id === 'לא משובץ') ? 'ממתין' : 'משובץ'} 
                  color={(!s.assigned_vehicle_id || s.assigned_vehicle_id === 'לא משובץ') ? 'error' : 'success'} 
                  sx={{ fontWeight: 'bold' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {filtered.length === 0 && (
            <Typography sx={{ p: 4, textAlign: 'center', color: 'gray' }}>לא נמצאו לוחמים העונים לחיפוש</Typography>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default SoldiersPage;