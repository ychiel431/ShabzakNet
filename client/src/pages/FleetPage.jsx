import React, { useState } from 'react';
import { 
  Container, Grid, Box, Typography, Button, Paper, Card, Chip, Tooltip, LinearProgress, TextField, InputAdornment 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';

// קטגוריות הכלים
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

  // --- שלב א': מסך בחירת סוג כלי (תפריט ראשי של הצי) ---
  if (!selectedCategory) {
    return (
      <Container maxWidth={false} sx={{ mt: 10, px: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6 }}>
          
          {/* כפתור חזרה לתפריט */}
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => setView('menu')} 
            variant="outlined"
          >
            חזרה לתפריט
          </Button>

          {/* כותרת */}
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
            בחר סוג כלי
          </Typography>

          {/* כפתור איפוס כללי (שמרתי עליו מהקוד המקורי שלך) */}
          <Tooltip title="איפוס ✅ לכל הלוחמים בכל הכלים">
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<RestartAltIcon />}
              onClick={handleResetAll}
              sx={{ fontWeight: 'bold', borderRadius: 3, px: 3, py: 1.5, boxShadow: 4, bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
            >
              איפוס אימותים כללי
            </Button>
          </Tooltip>
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

  // --- שלב ב': רשימת הכלים תחת הקטגוריה שנבחרה ---
  
  // סינון הכלים לפי הקטגוריה + חיפוש (השדרוג החדש)
  const filteredVehicles = vehicles.filter(v => 
    v.id.startsWith(selectedCategory) && 
    v.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth={false} sx={{ mt: 5, px: 6 }}>
      
      {/* סרגל עליון עם כל הכפתורים */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        
        {/* קבוצת כפתורי חזרה (שמרתי על שניהם) */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedCategory(null)} variant="outlined">
          חזרה לסוגי כלים
          </Button>
          <Button 
            startIcon={<DashboardIcon />} 
            onClick={() => setView('dashboard')} 
            variant="contained" 
            sx={{ bgcolor: '#1b5e20', '&:hover': { bgcolor: '#2e7d32' } }}
          >
            דשבורד
          </Button>
        </Box>

        {/* כותרת הצי */}
        <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
            צי {CATEGORIES.find(c => c.id === selectedCategory)?.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
                סה"כ כלים: {filteredVehicles.length}
            </Typography>
        </Box>
        
        {/* חיפוש מהיר (השדרוג) */}
        <Box sx={{ width: 250 }}>
             <TextField
                fullWidth
                size="small"
                placeholder="חפש כלי (למשל 14)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                }}
                sx={{ bgcolor: 'white', borderRadius: 1 }}
             />
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {filteredVehicles.map(v => {
            // חישובים לכרטיס החכם
            const occupancyPercent = Math.min((v.current_occupancy / v.capacity) * 100, 100);
            const isFull = v.current_occupancy >= v.capacity;
            const isFullyVerified = v.crew && v.crew.length > 0 && v.crew.every(s => s.is_finalized);
            
            return (
              <Grid item xs={12} sm={6} md={3} lg={2} key={v.id}>
                <Card 
                  elevation={isFullyVerified ? 8 : 3} 
                  onClick={() => handleOpenVehicle(v)} 
                  sx={{ 
                    borderRadius: 4, 
                    cursor: 'pointer', 
                    transition: '0.2s', 
                    // מסגרת ירוקה אם הכלי מוכן
                    border: isFullyVerified ? '2px solid #4caf50' : '1px solid transparent',
                    boxShadow: isFullyVerified ? '0 0 15px rgba(76, 175, 80, 0.4)' : 3,
                    '&:hover': { transform: 'scale(1.03)', boxShadow: 6 } 
                  }}
                >
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{v.id}</Typography>
                      
                      {/* פס התקדמות ויזואלי (במקום הצ'יפ הפשוט) */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={occupancyPercent} 
                            sx={{ 
                                height: 10, 
                                borderRadius: 5,
                                bgcolor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                    // ירוק אם תקין, אדום אם חריגה, כתום אם חסר
                                    bgcolor: isFull ? (v.current_occupancy > v.capacity ? '#d32f2f' : '#2e7d32') : '#ff9800'
                                }
                            }} 
                          />
                        </Box>
                      </Box>
                      
                      
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                         {v.capacity} / {v.current_occupancy} לוחמים
                      </Typography>

                      {/* סטטוס אימות מתקדם */}
                      <Box sx={{ mt: 2, bgcolor: '#f5f5f5', borderRadius: 2, p: 0.5 }}>
                        {v.finalized_count > 0 ? (
                             <Typography variant="caption" sx={{ color: isFullyVerified ? 'success.main' : 'warning.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                {isFullyVerified ? '✅ מוכן לתנועה' : `⚠️ ${v.finalized_count} אומתו`}
                             </Typography>
                        ) : (
                            <Typography variant="caption" color="text.secondary">טרם בוצע אימות</Typography>
                        )}
                      </Box>
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