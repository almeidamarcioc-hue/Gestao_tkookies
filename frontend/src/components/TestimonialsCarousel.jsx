import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Card, CardContent, Rating, useTheme } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import api from '../services/api';

const TestimonialsCarousel = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await api.get('/depoimentos/public');
        setTestimonials(response.data);
      } catch (error) {
        console.error("Erro ao carregar depoimentos:", error);
      }
    };
    fetchTestimonials();
  }, []);

  // Rotação automática a cada 5 segundos
  useEffect(() => {
    if (testimonials.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials]);

  if (testimonials.length === 0) return null;

  const activeTestimonial = testimonials[activeIndex];

  return (
    <Box sx={{ 
      py: 4, 
      backgroundColor: theme.palette.grey[50], 
      borderRadius: 4, 
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      my: 4
    }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 3 }}>
        O que dizem nossos parceiros ❤️
      </Typography>

      <Box sx={{ maxWidth: 800, mx: 'auto', px: 2 }}>
        <Card 
          elevation={3} 
          sx={{ 
            borderRadius: 4, 
            position: 'relative',
            overflow: 'visible',
            mt: 4 
          }}
        >
          {/* Ícone de Citação Decorativo */}
          <FormatQuoteIcon sx={{ 
            fontSize: 60, 
            color: theme.palette.primary.light, 
            opacity: 0.2, 
            position: 'absolute', 
            top: 10, 
            left: 10 
          }} />

          <CardContent sx={{ pt: 6, pb: 4, px: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              
              {/* Imagem do Cliente */}
              <Avatar 
                src={activeTestimonial.imagem || undefined} 
                alt={activeTestimonial.nome}
                sx={{ 
                  width: 80, 
                  height: 80, 
                  border: `4px solid ${theme.palette.background.paper}`,
                  boxShadow: theme.shadows[3],
                  mt: -8, // Sobe o avatar para ficar na borda do card
                  bgcolor: theme.palette.primary.main
                }}
              >
                {activeTestimonial.nome.charAt(0)}
              </Avatar>

              <Typography variant="body1" sx={{ fontStyle: 'italic', fontSize: '1.1rem', color: 'text.secondary', minHeight: 60 }}>
                "{activeTestimonial.texto}"
              </Typography>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {activeTestimonial.nome}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {activeTestimonial.cargo || 'Cliente'}
                </Typography>
              </Box>
              
              {/* Indicadores de Slide */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {testimonials.map((_, idx) => (
                  <Box 
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    sx={{ 
                      width: 10, height: 10, borderRadius: '50%', cursor: 'pointer',
                      bgcolor: idx === activeIndex ? theme.palette.primary.main : theme.palette.grey[300],
                      transition: 'all 0.3s'
                    }} 
                  />
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default TestimonialsCarousel;