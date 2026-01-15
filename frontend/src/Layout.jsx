import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🍪 Cookie ERP
          </Typography>

          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/ingredients">Ingredientes</Button>
          <Button color="inherit" component={Link} to="/products">Produtos</Button>
          <Button color="inherit" component={Link} to="/production">Produção</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ padding: 3 }}>
        {children}
      </Box>
    </>
  );
}
