import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Lightbulb as LightbulbIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';

interface BusinessIdea {
  id: number;
  title: string;
  description: string;
  industry: string;
  target_market: string;
  initial_investment: number;
  expected_revenue: number;
  success_probability: number;
  status: string;
  created_at: string;
  updated_at: string;
  location?: string;
  budget_range?: string;
}

const BusinessIdeaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { api } = useApi();

  // Format currency in RWF
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };
  const [idea, setIdea] = useState<BusinessIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    industry: '',
    target_market: '',
    initial_investment: 0,
    expected_revenue: 0,
    success_probability: 50,
    status: 'draft'
  });
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingProjection, setGeneratingProjection] = useState(false);

  useEffect(() => {
    if (id) {
      fetchIdea();
    }
  }, [id]);

  const fetchIdea = async () => {
    try {
      const response = await api.get(`/business/ideas/${id}`);
      setIdea(response.data);
      setEditData({
        title: response.data.title,
        description: response.data.description,
        industry: response.data.industry,
        target_market: response.data.target_market,
        initial_investment: response.data.initial_investment,
        expected_revenue: response.data.expected_revenue,
        success_probability: response.data.success_probability,
        status: response.data.status
      });
    } catch (err: any) {
      setError('Failed to load business idea details');
      console.error('Idea fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/business/ideas/${id}`, editData);
      await fetchIdea();
      setEditDialogOpen(false);
    } catch (err: any) {
      setError('Failed to update business idea');
      console.error('Update error:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this business idea?')) return;
    
    try {
      await api.delete(`/business/ideas/${id}`);
      navigate('/ideas');
    } catch (err: any) {
      setError('Failed to delete business idea');
      console.error('Delete error:', err);
    }
  };

  const handleGenerateBusinessPlan = async () => {
    if (!idea) return;
    setGeneratingPlan(true);
    try {
      const response = await api.post('/ai/generate-business-plan', {
        businessIdeaId: idea.id,
        location: idea.location || 'Musanze',
        budget: idea.budget_range || '50000-200000',
      });
      
      // Navigate to business plan page or show success message
      navigate(`/plans/${response.data.planId || idea.id}`);
    } catch (err: any) {
      setError('Failed to generate business plan');
      console.error('Generate business plan error:', err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleGenerateFinancialProjection = async () => {
    if (!idea) return;
    setGeneratingProjection(true);
    try {
      const response = await api.post('/ai/generate-financial-projection', {
        businessIdeaId: idea.id,
        location: idea.location || 'Musanze',
        budget: idea.budget_range || '50000-200000',
      });
      
      // Navigate to financial projection page or show success message
      navigate(`/projections/${response.data.projectionId || idea.id}`);
    } catch (err: any) {
      setError('Failed to generate financial projection');
      console.error('Generate financial projection error:', err);
    } finally {
      setGeneratingProjection(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 80) return 'success';
    if (probability >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !idea) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Business idea not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/ideas')}
        >
          Back to Ideas
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/ideas')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="h4" gutterBottom>
            {idea.title}
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            <Chip 
              label={idea.status.toUpperCase()} 
              color={getStatusColor(idea.status) as any}
              size="small"
            />
            <Chip 
              label={idea.industry} 
              color="primary" 
              variant="outlined"
              size="small"
            />
            {idea.location && (
              <Chip 
                icon={<LocationIcon />}
                label={idea.location} 
                color="secondary" 
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>
        <Box>
          <IconButton onClick={() => setEditDialogOpen(true)}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={handleDelete} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Description */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Business Description
              </Typography>
              <Typography variant="body1" paragraph>
                {idea.description}
              </Typography>
            </CardContent>
          </Card>

          {/* Target Market */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Target Market
              </Typography>
              <Typography variant="body1">
                {idea.target_market}
              </Typography>
            </CardContent>
          </Card>

          {/* Key Success Factors */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Key Success Factors
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUpIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Market Research" 
                    secondary="Conduct thorough market analysis in your target area"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PeopleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Customer Validation" 
                    secondary="Test your concept with potential customers before full launch"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <MoneyIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Financial Planning" 
                    secondary="Create detailed financial projections and monitor cash flow"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Legal Compliance" 
                    secondary="Ensure proper business registration and regulatory compliance"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Financial Overview */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Financial Overview
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Initial Investment Required
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(idea.initial_investment)}
                </Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Expected Monthly Revenue
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(idea.expected_revenue)}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Success Probability
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <Typography 
                    variant="h6" 
                    color={`${getSuccessColor(idea.success_probability)}.main`}
                    sx={{ mr: 1 }}
                  >
                    {idea.success_probability}%
                  </Typography>
                  {idea.success_probability >= 70 ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <WarningIcon color="warning" />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Generate Documents
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  onClick={handleGenerateBusinessPlan}
                  disabled={generatingPlan}
                  fullWidth
                >
                  {generatingPlan ? 'Generating...' : 'Generate Business Plan'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={handleGenerateFinancialProjection}
                  disabled={generatingProjection}
                  fullWidth
                >
                  {generatingProjection ? 'Generating...' : 'Generate Financial Projection'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Next Steps
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="1. Market Research" 
                    secondary="Study your target market in detail"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="2. Business Plan" 
                    secondary="Create a detailed business plan"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="3. Financial Planning" 
                    secondary="Set up accounting and financial tracking"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="4. Legal Setup" 
                    secondary="Register your business with RDB"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="5. Launch Strategy" 
                    secondary="Plan your market entry strategy"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Created: {new Date(idea.created_at).toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Updated: {new Date(idea.updated_at).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Business Idea</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={editData.title}
                onChange={(e) => setEditData({...editData, title: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editData.description}
                onChange={(e) => setEditData({...editData, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Industry"
                value={editData.industry}
                onChange={(e) => setEditData({...editData, industry: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Target Market"
                value={editData.target_market}
                onChange={(e) => setEditData({...editData, target_market: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Initial Investment (RWF)"
                value={editData.initial_investment}
                onChange={(e) => setEditData({...editData, initial_investment: Number(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Expected Revenue (RWF)"
                value={editData.expected_revenue}
                onChange={(e) => setEditData({...editData, expected_revenue: Number(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Success Probability (%)"
                value={editData.success_probability}
                onChange={(e) => setEditData({...editData, success_probability: Number(e.target.value)})}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessIdeaDetail;
