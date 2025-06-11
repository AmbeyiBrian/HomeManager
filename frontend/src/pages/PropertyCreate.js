import React from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PropertyForm from '../components/PropertyForm';

function PropertyCreate() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Property
        </Typography>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/properties" underline="hover" color="inherit">
            Properties
          </Link>
          <Typography color="text.primary">Create</Typography>
        </Breadcrumbs>
      </Box>
      
      <PropertyForm />
    </Container>
  );
}

export default PropertyCreate;
