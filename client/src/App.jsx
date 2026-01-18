import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Card, CardContent, Typography, Box, Chip, 
  CircularProgress, AppBar, Toolbar, Avatar, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, Divider 
} from '@mui/material';

// הגדרת כתובת השרת בצורה דינמית
// אם אתה ניגש מהמחשב עצמו זה יהיה localhost, אם ממכשיר אחר זה יהיה ה-IP של השרת
const SERVER_IP = window.location.hostname;
const API_BASE_URL = `http://${SERVER_IP}:8080`;

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [open, setOpen] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles/list`);
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      setVehicles(data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("חיבור לשרת נכשל");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenSoldier = async (soldier) => {
    setSelectedSoldier(soldier);
    setOpen(true);
    setQrUrl(null);

    try {
      // שימוש בכתובת הדינמית גם כאן
      const response = await fetch(`${API_BASE_URL}/kiosk/identify/${soldier.military_id}`);
      const data = await response.json();
      if (data.qr_url) {
        setQrUrl(`${API_BASE_URL}${data.qr_url}`);
      }
    } catch (err) {
      console.error("Error fetching QR:", err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedSoldier(null);
    setQrUrl(null);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f4f6f8', minHeight: '100vh', pb: 5 }}>
      <AppBar position="static" sx={{ bgcolor: '#1b5e20', mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold' }}>
            חמ"ל שבצ"ק-נט (ShabzakNet)
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl">
        {error && <Typography color="error" align="center">{error}</Typography>}
        
        <Grid container spacing={3}>
          {vehicles.map((vehicle) => (
            <Grid item xs={12} md={6} lg={4} key={vehicle.id}>
              <Card elevation={3} sx={{ borderRadius: 2, borderTop: '6px solid #1976d2' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {vehicle.name || vehicle.id}
                    </Typography>
                    <Chip 
                      label={`${vehicle.current_occupancy} / ${vehicle.capacity}`}
                      color={vehicle.current_occupancy >= vehicle.capacity ? "error" : "primary"}
                    />
                  </Box>

                  <Box sx={{ bgcolor: '#eee', p: 2, borderRadius: 2, minHeight: '100px' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                      צוות רשום (לחץ לפרטים):
                    </Typography>
                    
                    {vehicle.crew && vehicle.crew.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {vehicle.crew.map((soldier) => (
                          <Chip 
                            key={soldier.military_id}
                            avatar={<Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{soldier.rank?.[0]}</Avatar>}
                            label={`${soldier.rank} ${soldier.full_name}`}
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenSoldier(soldier)}
                            sx={{ cursor: 'pointer', bgcolor: 'white', '&:hover': { bgcolor: '#e0e0e0' } }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        אין שיבוצים בכלי זה
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        {selectedSoldier && (
          <>
            <DialogTitle sx={{ textAlign: 'center', bgcolor: '#1b5e20', color: 'white', fontWeight: 'bold' }}>
              כרטיס לוחם
            </DialogTitle>
            <DialogContent sx={{ mt: 3, textAlign: 'center' }}>
              <Avatar 
                src={selectedSoldier.photo_url ? `${API_BASE_URL}${selectedSoldier.photo_url}` : ""} 
                sx={{ width: 100, height: 100, mx: 'auto', mb: 2, border: '3px solid #1b5e20', fontSize: '2.5rem' }}
              >
                {selectedSoldier.full_name?.[0]}
              </Avatar>
              
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {selectedSoldier.rank} {selectedSoldier.full_name}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                מספר אישי: {selectedSoldier.military_id}
              </Typography>

              <Box sx={{ my: 2, p: 1, border: '1px dashed #ccc', borderRadius: 2, bgcolor: 'white', display: 'inline-block' }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  קוד QR אישי:
                </Typography>
                {qrUrl ? (
                  <img src={qrUrl} alt="Soldier QR" style={{ width: '140px', height: '140px' }} />
                ) : (
                  <Box sx={{ p: 4 }}><CircularProgress size={20} /></Box>
                )}
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ textAlign: 'right', px: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>📦 יחידה:</strong> {selectedSoldier.unit}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>🎖️ תפקיד:</strong> {selectedSoldier.mission_role}
                </Typography>
                <Typography variant="body2">
                  <strong>🚜 כלי משובץ:</strong> {selectedSoldier.assigned_vehicle_id}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button onClick={handleClose} variant="contained" sx={{ bgcolor: '#1b5e20', '&:hover': { bgcolor: '#144316' } }}>
                סגור
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default App;