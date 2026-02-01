import React, { useState } from 'react';
import { 
  Container, Grid, Box, Typography, Button, Paper, Card, LinearProgress, TextField, InputAdornment, useTheme, useMediaQuery 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';

const CATEGORIES = [
  { id: 'HUMMER', name: 'האמר', color: '#1b5e20' },
  { id: 'MERKAVA', name: 'מרכבה', color: '#33691e' },
  { id: 'NAMER', name: 'נמר', color: '#558b2f' },
  { id: 'ZEEV', name: 'זאב', color: '#2e7d32' }
];

const FleetPage = ({ 
  vehicles, 
  selectedCategory, 
  setSelectedCategory, 
  setView, 
  handleOpenVehicle,
  handleResetAll 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // --- שלב א': מסך בחירת סוג כלי ---
  if (!selectedCategory) {
    return (
      <Container maxWidth={false} sx={{ mt: isMobile ? 4 : 10, px: isMobile ? 2 : 6 }}>
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', mb: 4, gap: 2 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => setView('menu')} 
            variant="outlined"
            fullWidth={isMobile}
          >
            חזרה לתפריט
          </Button>

          <Typography variant={isMobile ? "h4" : "h2"} sx={{ fontWeight: 'bold', color: '#1b5e20', my: isMobile ? 1 : 0 }}>
            בחר סוג כלי
          </Typography>

          {/* כפתור איפוס שנשמר מהמקור */}
          <Button 
            variant="contained" 
            color="error" 
            startIcon={<RestartAltIcon />}
            onClick={handleResetAll}
            fullWidth={isMobile}
            sx={{ fontWeight: 'bold', borderRadius: 3, px: 3, py: 1.5, boxShadow: 4, bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
          >
            {isMobile ? "איפוס כללי" : "איפוס אימותים"}
          </Button>
        </Box>

        {/* התיקון לחפיפה: spacing=3 וגובה מינימלי */}
        <Grid container spacing={3} justifyContent="center">
          {CATEGORIES.map(cat => (
            <Grid item xs={6} md={3} key={cat.id}>
              <Paper 
                elevation={4} 
                onClick={() => setSelectedCategory(cat.id)} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 5, 
                  cursor: 'pointer', 
                  borderBottom: `8px solid ${cat.color}`, 
                  minHeight: '180px', // מונע חפיפה
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  transition: '0.3s',
                  '&:hover': { transform: 'translateY(-5px)', bgcolor: '#f1f8e9' } 
                }}
              >
                <DirectionsBusIcon sx={{ fontSize: isMobile ? 60 : 100, color: cat.color }} />
                <Typography variant={isMobile ? "h5" : "h3"} sx={{ mt: 2, fontWeight: 'bold' }}>{cat.name}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // --- שלב ב': רשימת כלים ---
  const filteredVehicles = vehicles.filter(v => 
    v.id.startsWith(selectedCategory) && 
    v.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth={false} sx={{ mt: isMobile ? 2 : 5, px: isMobile ? 2 : 6, pb: 10 }}>
      {/* סרגל עליון מסודר */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedCategory(null)} variant="outlined" size="small">
             חזרה לקטגוריות
          </Button>
          <Button 
            startIcon={<DashboardIcon />} 
            onClick={() => setView('dashboard')} 
            variant="contained" 
            size="small"
            sx={{ bgcolor: '#1b5e20', '&:hover': { bgcolor: '#2e7d32' } }}
          >
            דשבורד
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ textAlign: isMobile ? 'center' : 'right', width: '100%' }}>
                <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
                צי {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                    {filteredVehicles.length} כלים זמינים
                </Typography>
            </Box>
            
            <Box sx={{ width: isMobile ? '100%' : 250 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="חפש כלי..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                    }}
                    sx={{ bgcolor: 'white', borderRadius: 1 }}
                />
            </Box>
        </Box>
      </Box>
      
      {/* גריד כלים - 2 בשורה במובייל */}
      <Grid container spacing={2}>
        {filteredVehicles.map(v => {
            const occupancyPercent = Math.min((v.current_occupancy / v.capacity) * 100, 100);
            const isFull = v.current_occupancy >= v.capacity;
            const isFullyVerified = v.crew && v.crew.length > 0 && v.crew.every(s => s.is_finalized);
            
            return (
              <Grid item xs={6} sm={6} md={3} lg={2} key={v.id}>
                <Card 
                  elevation={isFullyVerified ? 4 : 2} 
                  onClick={() => handleOpenVehicle(v)} 
                  sx={{ 
                    borderRadius: 3, 
                    cursor: 'pointer', 
                    transition: '0.2s', 
                    border: isFullyVerified ? '2px solid #4caf50' : '1px solid transparent',
                    bgcolor: isFullyVerified ? '#f1f8e9' : 'white',
                    '&:hover': { transform: 'scale(1.02)' } 
                  }}
                >
                  <Box sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>{v.id}</Typography>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={occupancyPercent} 
                        sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            mb: 1,
                            bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: isFull ? (v.current_occupancy > v.capacity ? '#d32f2f' : '#2e7d32') : '#ff9800'
                            }
                        }} 
                      />
                      
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                         {v.current_occupancy} / {v.capacity}
                      </Typography>

                      {v.finalized_count > 0 && !isFullyVerified && (
                        <Box sx={{ mt: 0.5 }}>
                             <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                ✅ {v.finalized_count} אומתו
                             </Typography>
                        </Box>
                      )}
                  </Box>
                </Card>
              </Grid>
            );
        })}
      </Grid>
    </Container>
  );
};

export default FleetPage;