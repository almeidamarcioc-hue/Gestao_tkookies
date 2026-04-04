import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Card, CardContent, Rating } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import api from '../services/api';

const TestimonialsCarousel = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await api.get('/depoimentos/public');
        setTestimonials(Array.isArray(response.data) ? response.data : []);
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
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 900, color: '#4E342E', mb: 4, letterSpacing: 0.5 }}
      >
        O que dizem nossos parceiros e clientes ❤️
      </Typography>

      <Box sx={{ maxWidth: 680, mx: 'auto', px: 2 }}>
        <Card
          elevation={0}
          sx={{
            background: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 2px 20px rgba(78,52,46,0.09)',
            border: '1px solid rgba(78,52,46,0.06)',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          {/* Decorative quote icon */}
          <FormatQuoteIcon
            sx={{
              fontSize: 64,
              color: '#E65100',
              opacity: 0.12,
              position: 'absolute',
              top: 16,
              left: 16,
            }}
          />

          <CardContent sx={{ pt: 5, pb: 4, px: { xs: 3, md: 6 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>

              {/* Avatar */}
              <Avatar
                src={activeTestimonial.imagem || undefined}
                alt={activeTestimonial.nome}
                sx={{
                  width: 72,
                  height: 72,
                  border: '3px solid #FFCC80',
                  boxShadow: '0 4px 12px rgba(78,52,46,0.15)',
                  bgcolor: '#4E342E',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                }}
              >
                {activeTestimonial.nome?.charAt(0)}
              </Avatar>

              {/* Stars */}
              <Rating value={5} readOnly size="small" sx={{ color: '#E65100' }} />

              {/* Quote text */}
              <Typography
                variant="body1"
                sx={{
                  fontStyle: 'italic',
                  fontSize: '1.1rem',
                  color: '#795548',
                  lineHeight: 1.7,
                  minHeight: 60,
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}
              >
                "{activeTestimonial.texto}"
              </Typography>

              {/* Name and role */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#4E342E' }}>
                  {activeTestimonial.nome}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: '#795548', textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  {activeTestimonial.cargo || 'Cliente'}
                </Typography>
              </Box>

              {/* Navigation dots */}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                {testimonials.map((_, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    sx={{
                      width: idx === activeIndex ? 24 : 10,
                      height: 10,
                      borderRadius: '5px',
                      cursor: 'pointer',
                      bgcolor: idx === activeIndex ? '#E65100' : 'rgba(78,52,46,0.15)',
                      transition: 'all 0.3s ease',
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
