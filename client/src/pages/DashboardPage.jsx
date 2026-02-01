import React from 'react';
import { 
  Container, Grid, Typography, Box, Paper, Button, LinearProgress, CircularProgress, useMediaQuery, useTheme 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const CATEGORIES = [
  { id: 'HUMMER', name: 'האמר', color: '#4caf50', icon: <DirectionsCarIcon /> },
  { id: 'MERKAVA', name: 'מרכבה', color: '#2e7d32', icon: <AgricultureIcon /> },
  { id: 'NAMER', name: 'נמר', color: '#ff9800', icon: <LocalShippingIcon /> },
  { id: 'ZEEV', name: 'זאב', color: '#0288d1', icon: <DirectionsBusIcon /> }
];

const DashboardPage = ({ stats, vehicles, setView , setSelectedCategory }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // זיהוי אם אנחנו במובייל (כמו הפוקו)

  const safePercent = (part, total) => {
    if (!total || total === 0) return 0;
    const p = Math.round((part / total) * 100);
    return p > 100 ? 100 : p;
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    setView('fleet');
  };

  return (
    <Container maxWidth="xl" sx={{ mt: isMobile ? 2 : 4, px: isMobile ? 1 : 3, pb: 8, direction: 'rtl' }}>
      
      {/* כותרת מותאמת למובייל */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        mb: isMobile ? 3 : 6, 
        justifyContent: 'space-between',
        gap: 2
      }}>
        <Box>
          <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: '800', color: '#1a237e', mb: 0.5 }}>
            📊 תמונת מצב גדודית
          </Typography>
          <Typography variant="subtitle2" sx={{ color: '#666' }}>
            סיכום כשירות מבצעית בזמן אמת
          </Typography>
        </Box>
        <Button 
          fullWidth={isMobile}
          startIcon={<ArrowBackIcon />} 
          onClick={() => setView('menu')} 
          variant="outlined" 
          sx={{ borderRadius: 4, px: 3, borderColor: '#1a237e', color: '#1a237e', fontWeight: 'bold' }}
        >
          חזרה לתפריט
        </Button>
      </Box>

      <Grid container spacing={isMobile ? 2 : 4}>
        
        {/* כרטיס ראשי - כשירות כללית (תופס שורה שלמה במובייל) */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={6} 
            sx={{ 
              p: isMobile ? 3 : 4, 
              background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)', 
              color: 'white', 
              borderRadius: 6, 
              minHeight: isMobile ? '180px' : '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
              <AgricultureIcon sx={{ fontSize: isMobile ? 120 : 180 }} />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, opacity: 0.9 }}>כשירות מבצעית</Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1 }}>
              <Typography variant={isMobile ? "h2" : "h1"} sx={{ fontWeight: '900', lineHeight: 1 }}>
                {stats.readiness}%
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, opacity: 0.8 }}>מוכנות</Typography>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={stats.readiness} 
                sx={{ 
                  height: 12, 
                  borderRadius: 6, 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '& .MuiLinearProgress-bar': { bgcolor: '#76ff03' } 
                }} 
              />
            </Box>
          </Paper>
        </Grid>

        {/* גריד הכרטיסים הקטנים */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={isMobile ? 2 : 3}>
            {CATEGORIES.map(cat => {
              const typeVehicles = vehicles.filter(v => v.id.startsWith(cat.id));
              const totalType = typeVehicles.length;
              let minToFull = (cat.id === 'NAMER' ? 11 : (cat.id === 'ZEEV' ? 12 : 4));
              const fullType = typeVehicles.filter(v => (v.current_occupancy || 0) >= minToFull).length;
              const percent = safePercent(fullType, totalType);

              return (
                <Grid item xs={12} sm={6} key={cat.id}>
                  <Paper 
                    elevation={3}
                    onClick={() => handleCategoryClick(cat.id)}
                    sx={{ 
                      p: isMobile ? 2 : 3, 
                      borderRadius: 5, 
                      transition: 'transform 0.2s',
                      cursor: 'pointer',
                      '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          bgcolor: `${cat.color}22`,
                          color: cat.color,
                          p: 1.5,
                          borderRadius: '50%',
                          display: 'flex'
                        }}>
                          {cat.icon}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#333' }}>{cat.name}</Typography>
                          <Typography variant="caption" color="text.secondary">תקן: {minToFull} לוחמים</Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress variant="determinate" value={100} size={45} thickness={4} sx={{ color: '#eee', position: 'absolute' }} />
                        <CircularProgress variant="determinate" value={percent} size={45} thickness={4} sx={{ color: percent === 100 ? '#4caf50' : (percent < 50 ? '#f44336' : cat.color) }} />
                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" fontWeight="bold">{percent}%</Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" fontWeight="bold">מצב שיבוץ:</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {fullType} / {totalType} <Typography variant="caption" component="span" color="text.secondary">כלים</Typography>
                      </Typography>
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