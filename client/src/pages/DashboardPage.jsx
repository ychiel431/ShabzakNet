import React from 'react';
import { Container, Grid, Typography, Box, Paper, Button, LinearProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StatCard from '../components/StatCard';

// הגדרת הקטגוריות כפי שמופיעות בקוד המקורי שלך
const CATEGORIES = [
  { id: 'HUMMER', name: 'האמר', color: '#1b5e20' },
  { id: 'MERKAVA', name: 'מרכבה', color: '#33691e' },
  { id: 'NAMER', name: 'נמר', color: '#558b2f' },
  { id: 'ZEEV', name: 'זאב', color: '#2e7d32' }
];

const DashboardPage = ({ stats, vehicles, setView }) => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, px: 4, pb: 8, animation: 'fadeIn 0.8s ease-in-out' }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes ripple { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
          .cool-card { transition: all 0.3s ease; border-radius: 20px !important; }
        `}
      </style>

      {/* כותרת וכפתור חזרה */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 5, justifyContent: 'space-between' }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>
          📊 תמונת מצב גדודית
        </Typography>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => setView('menu')} 
          variant="contained" 
          sx={{ bgcolor: '#1b5e20', borderRadius: 3 }}
        >
          חזרה לתפריט
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* כרטיס כשירות מבצעית כללית */}
        <Grid item xs={12} md={4}>
          <Paper elevation={8} sx={{ p: 4, bgcolor: '#2e7d32', color: 'white', borderRadius: 5, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <AssessmentIcon sx={{ fontSize: 120, opacity: 0.1, position: 'absolute', right: -10, bottom: -10 }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>כשירות מבצעית</Typography>
            <Typography variant="h1" sx={{ fontWeight: '900', mb: 2 }}>
              {stats.readiness}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={stats.readiness} 
              sx={{ height: 12, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#76ff03' } }} 
            />
          </Paper>
        </Grid>

        {/* פירוט לפי סוגי כלים - שימוש ברכיב StatCard החדש */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 4, borderRadius: 5 }}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 'bold' }}>📋 פירוט לפי סוגי כלים</Typography>
            <Grid container spacing={3}>
              {CATEGORIES.map(cat => {
                const typeVehicles = vehicles.filter(v => v.id.startsWith(cat.id));
                const totalType = typeVehicles.length;

                // לוגיקת סף המילוי המבצעי שלך (נמ"ר 11, זאב 12, השאר 4)
                let minToFull = 4; 
                if (cat.id === 'NAMER') minToFull = 11;
                if (cat.id === 'ZEEV') minToFull = 12;

                const fullType = typeVehicles.filter(v => v.current_occupancy >= minToFull).length;
                const percent = totalType > 0 ? Math.round((fullType / totalType) * 100) : 0;
                
                return (
                  <Grid item xs={12} sm={6} md={3} key={cat.id}>
                    <StatCard 
                      cat={cat} 
                      percent={percent} 
                      fullType={fullType} 
                      totalType={totalType} 
                    />
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

export default DashboardPage;