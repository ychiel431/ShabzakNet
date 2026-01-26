import React from 'react';
import { 
  Container, Grid, Typography, Box, Paper, Button, LinearProgress, CircularProgress 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

// הגדרת הקטגוריות עם אייקונים מתאימים
const CATEGORIES = [
  { id: 'HUMMER', name: 'האמר', color: '#4caf50', icon: <DirectionsCarIcon /> }, // ירוק בהיר
  { id: 'MERKAVA', name: 'מרכבה', color: '#2e7d32', icon: <AgricultureIcon /> }, // ירוק כהה
  { id: 'NAMER', name: 'נמר', color: '#ff9800', icon: <LocalShippingIcon /> },   // כתום (בולט)
  { id: 'ZEEV', name: 'זאב', color: '#0288d1', icon: <DirectionsBusIcon /> }      // כחול
];

const DashboardPage = ({ stats, vehicles, setView , setSelectedCategory }) => {
  
  // פונקציית עזר לחישוב אחוז בטוח (מונעת NaN)
  const safePercent = (part, total) => {
    if (!total || total === 0) return 0;
    const p = Math.round((part / total) * 100);
    return p > 100 ? 100 : p;
  };

  // פונקציית עזר למעבר לניהול כלים
  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId); // בוחר את הקטגוריה (למשל NAMER)
    setView('fleet'); // מעביר למסך הצי
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, px: 3, pb: 8, direction: 'rtl' }}>
      
      {/* כותרת וכפתור חזרה */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 6, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: '800', color: '#1a237e', mb: 1 }}>
            📊 תמונת מצב גדודית
          </Typography>
          <Typography variant="subtitle1" sx={{ color: '#666' }}>
            סיכום כשירות מבצעית בזמן אמת
          </Typography>
        </Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => setView('menu')} 
          variant="outlined" 
          sx={{ borderRadius: 4, px: 3, borderColor: '#1a237e', color: '#1a237e', fontWeight: 'bold' }}
        >
          חזרה לתפריט
        </Button>
      </Box>

      <Grid container spacing={4}>
        
        {/* כרטיס ראשי - כשירות כללית */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={6} 
            sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)', 
              color: 'white', 
              borderRadius: 6, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* אלמנט קישוטי ברקע */}
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
              <AgricultureIcon sx={{ fontSize: 180 }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, opacity: 0.9 }}>כשירות מבצעית</Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 2 }}>
              <Typography variant="h1" sx={{ fontWeight: '900', lineHeight: 1 }}>
                {stats.readiness}%
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, opacity: 0.8 }}>מוכנות</Typography>
            </Box>
            
            <Box sx={{ mt: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, fontSize: '0.9rem' }}>
                <span>התקדמות</span>
                <span>{stats.readiness}/100</span>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.readiness} 
                sx={{ 
                  height: 10, 
                  borderRadius: 5, 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '& .MuiLinearProgress-bar': { bgcolor: '#76ff03' } 
                }} 
              />
            </Box>
          </Paper>
        </Grid>

        {/* גריד הכרטיסים הקטנים */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {CATEGORIES.map(cat => {
              // --- לוגיקה מתוקנת לכל כלי ---
              const typeVehicles = vehicles.filter(v => v.id.startsWith(cat.id));
              const totalType = typeVehicles.length;

              // סף מילוי לפי סוג רכב
              let minToFull = 4; 
              if (cat.id === 'NAMER') minToFull = 11;
              if (cat.id === 'ZEEV') minToFull = 12;

              // חישוב כמה מלאים
              const fullType = typeVehicles.filter(v => (v.current_occupancy || 0) >= minToFull).length;
              
              // חישוב אחוז
              const percent = safePercent(fullType, totalType);

              return (
                <Grid item xs={12} sm={6} key={cat.id}>
                  <Paper 
                    elevation={3}
                    onClick={() => handleCategoryClick(cat.id)}
                    sx={{ 
                      p: 3, 
                      borderRadius: 5, 
                      transition: 'transform 0.2s',
                      cursor: 'pointer',
                      '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 },
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* אייקון בתוך עיגול צבעוני */}
                        <Box sx={{ 
                          bgcolor: `${cat.color}22`, // צבע עם שקיפות
                          color: cat.color,
                          p: 1.5,
                          borderRadius: '50%',
                          display: 'flex'
                        }}>
                          {cat.icon}
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>{cat.name}</Typography>
                          <Typography variant="body2" color="text.secondary">תקן: {minToFull} לוחמים</Typography>
                        </Box>
                      </Box>
                      
                      {/* מעגל אחוזים */}
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress 
                          variant="determinate" 
                          value={100} 
                          size={50} 
                          thickness={4} 
                          sx={{ color: '#eee', position: 'absolute' }} 
                        />
                        <CircularProgress 
                          variant="determinate" 
                          value={percent} 
                          size={50} 
                          thickness={4} 
                          sx={{ color: percent === 100 ? '#4caf50' : (percent < 50 ? '#f44336' : cat.color) }} 
                        />
                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" component="div" color="text.secondary" fontWeight="bold">
                            {percent}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* נתונים מספריים - כאן התיקון של הסדר */}
                    <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="bold" color="text.secondary">מצב שיבוץ:</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        
                        <Typography variant="body1" color="text.secondary">
                          {totalType}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: percent === 100 ? '#2e7d32' : '#333' }}>
                          / {fullType}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ml: 0.5}}>
                          כלים
                        </Typography>
                      </Box>
                    </Box>

                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;