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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    <Container maxWidth="xl" sx={{ mt: isMobile ? 1 : 4, px: isMobile ? 1.5 : 3, pb: 4, direction: 'rtl' }}>
      
      {/* כותרת מוקטנת ומיושרת למובייל */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'center', 
        mb: isMobile ? 2 : 6, 
        justifyContent: 'space-between',
        gap: 1
      }}>
        <Box>
          <Typography variant={isMobile ? "h5" : "h3"} sx={{ fontWeight: '800', color: '#1a237e' }}>
            📊 תמונת מצב
          </Typography>
          {!isMobile && (
            <Typography variant="subtitle2" sx={{ color: '#666' }}>
              סיכום כשירות מבצעית בזמן אמת
            </Typography>
          )}
        </Box>
        <Button 
          size={isMobile ? "small" : "medium"}
          startIcon={<ArrowBackIcon />} 
          onClick={() => setView('menu')} 
          variant="outlined" 
          sx={{ borderRadius: 4, px: 2, borderColor: '#1a237e', color: '#1a237e', fontWeight: 'bold' }}
        >
          {isMobile ? "חזור" : "חזרה לתפריט"}
        </Button>
      </Box>

      <Grid container spacing={isMobile ? 1.5 : 4}>
        
        {/* כרטיס ראשי - מוקטן משמעותית למובייל */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={6} 
            sx={{ 
              p: isMobile ? 2 : 4, 
              background: 'linear-gradient(135deg, #1b5e20 0%, #43a047 100%)', 
              color: 'white', 
              borderRadius: 4, 
              minHeight: isMobile ? '100px' : '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ position: 'absolute', top: -5, right: -5, opacity: 0.1 }}>
              <AgricultureIcon sx={{ fontSize: isMobile ? 80 : 180 }} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', opacity: 0.9 }}>כשירות כללית</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                        <Typography variant={isMobile ? "h3" : "h1"} sx={{ fontWeight: '900', lineHeight: 1 }}>
                            {stats.readiness}%
                        </Typography>
                        <Typography variant="caption" sx={{ mb: 0.5, opacity: 0.8 }}>מוכנות</Typography>
                    </Box>
                </Box>
                <Box sx={{ width: isMobile ? '40%' : '60%' }}>
                    <LinearProgress 
                        variant="determinate" 
                        value={stats.readiness} 
                        sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                        '& .MuiLinearProgress-bar': { bgcolor: '#76ff03' } 
                        }} 
                    />
                </Box>
            </Box>
          </Paper>
        </Grid>

        {/* גריד הכרטיסים הקטנים - 2 בטור במובייל */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={isMobile ? 1.5 : 3}>
            {CATEGORIES.map(cat => {
              const typeVehicles = vehicles.filter(v => v.id.startsWith(cat.id));
              const totalType = typeVehicles.length;
              let minToFull = (cat.id === 'NAMER' ? 11 : (cat.id === 'ZEEV' ? 12 : 4));
              const fullType = typeVehicles.filter(v => (v.current_occupancy || 0) >= minToFull).length;
              const percent = safePercent(fullType, totalType);

              return (
                <Grid item xs={6} key={cat.id}>
                  <Paper 
                    elevation={2}
                    onClick={() => handleCategoryClick(cat.id)}
                    sx={{ 
                      p: isMobile ? 1.5 : 3, 
                      borderRadius: 4, 
                      transition: 'transform 0.2s',
                      cursor: 'pointer',
                      '&:hover': { transform: 'translateY(-3px)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ 
                          bgcolor: `${cat.color}22`,
                          color: cat.color,
                          p: 1,
                          borderRadius: '50%',
                          display: 'flex'
                        }}>
                          {React.cloneElement(cat.icon, { fontSize: isMobile ? 'small' : 'medium' })}
                        </Box>
                        
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress variant="determinate" value={100} size={30} thickness={5} sx={{ color: '#eee', position: 'absolute' }} />
                            <CircularProgress variant="determinate" value={percent} size={30} thickness={5} sx={{ color: percent === 100 ? '#4caf50' : (percent < 50 ? '#f44336' : cat.color) }} />
                            <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>{percent}%</Typography>
                            </Box>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333', fontSize: isMobile ? '0.8rem' : '1rem' }}>{cat.name}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: '900', fontSize: isMobile ? '1.1rem' : '1.25rem' }}>
                            {fullType}<Typography variant="caption" sx={{ mx: 0.5 }}>/</Typography>{totalType}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>כלים מלאים</Typography>
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