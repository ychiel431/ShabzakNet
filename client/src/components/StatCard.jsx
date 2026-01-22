import React, { useState, useEffect } from 'react';
import { Card, Box, Typography, LinearProgress } from '@mui/material';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';

// רכיב עזר לאנימציה של המספרים
const AnimatedNumber = ({ value }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (start === end) return;
    let timer = setInterval(() => {
      start += Math.ceil(end / 50);
      if (start >= end) { start = end; clearInterval(timer); }
      setCount(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count}</span>;
};

const StatCard = ({ cat, percent, fullType, totalType }) => {
  return (
    <Card className="cool-card" sx={{ p: 2, border: '1px solid #eee', borderRadius: 4, position: 'relative', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 30px rgba(0,0,0,0.12)' } }}>
      {/* אפקט דופק ליד כלים מלאים */}
      {percent === 100 && totalType > 0 && (
        <Box sx={{ 
          position: 'absolute', top: 10, right: 10, width: 8, height: 8, 
          bgcolor: '#4caf50', borderRadius: '50%', 
          animation: 'ripple 1.5s infinite' 
        }} />
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <DirectionsBusIcon sx={{ color: cat.color, mr: 1 }} />
        <Typography fontWeight="bold">{cat.name}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="h6" color={cat.color} fontWeight="bold">
          <AnimatedNumber value={percent} />%
        </Typography>
        <Typography variant="caption" sx={{ mt: 1 }}>{fullType} / {totalType}</Typography>
      </Box>

      <LinearProgress 
        variant="determinate" 
        value={percent} 
        sx={{ 
          height: 8, borderRadius: 4, bgcolor: '#eee', 
          '& .MuiLinearProgress-bar': { bgcolor: cat.color } 
        }} 
      />
    </Card>
  );
};

export default StatCard;