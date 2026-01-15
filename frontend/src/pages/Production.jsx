import { Box, Typography, Paper } from "@mui/material";

export default function Production() {
  return (
    <Box p={3}>
      <Typography variant="h4" mb={3} fontWeight="bold">Produção</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Módulo de controle de produção (Em desenvolvimento)</Typography>
      </Paper>
    </Box>
  );
}