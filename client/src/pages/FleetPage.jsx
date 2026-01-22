import React from 'react';
import { 
  Container, Grid, Box, Typography, Button, Paper, Card, Chip 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';

// קטגוריות הכלים מה-App.jsx המקורי
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
  handleOpenVehicle 
}) => {

  // שלב א': מסך בחירת סוג כלי
  if (!selectedCategory) {
    return (
      <Container maxWidth={false} sx={{ mt: 10, px: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => setView('menu')} variant="outlined" sx={{ mb: 2 }}>
            חזרה לתפריט
          </Button>
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

  // שלב ב': רשימת הכלים תחת הקטגוריה שנבחרה
  const filteredVehicles = vehicles.filter(v => v.id.startsWith(selectedCategory));

  return (
    <Container maxWidth={false} sx={{ mt: 5, px: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedCategory(null)} variant="outlined">
          חזרה לסוגי כלים
        </Button>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
          צי {CATEGORIES.find(c => c.id === selectedCategory)?.name}
        </Typography>
        <Box sx={{ width: 100 }} />
      </Box>
      
      <Grid container spacing={3}>
        {filteredVehicles.map(v => (
          <Grid item xs={12} sm={6} md={3} lg={2} key={v.id}>
            <Card 
              elevation={3} 
              onClick={() => handleOpenVehicle(v)} 
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

export default FleetPage;