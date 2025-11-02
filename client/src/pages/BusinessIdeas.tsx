import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Lightbulb as LightbulbIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { PDFService } from '../services/pdfService';

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

const BusinessIdeas: React.FC = () => {
  const { user } = useAuth();
  const { api } = useApi();
  const navigate = useNavigate();

  // Format currency in RWF
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };
  
  const [ideas, setIdeas] = useState<BusinessIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [ideaInput, setIdeaInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(user?.location || 'Musanze');
  const [customLocation, setCustomLocation] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [customBudget, setCustomBudget] = useState('');
  const [showLocationBudget, setShowLocationBudget] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState<number | null>(null);
  const [generatingProjection, setGeneratingProjection] = useState<number | null>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [showFinancialDialog, setShowFinancialDialog] = useState(false);
  const [exportingFinancialPDF, setExportingFinancialPDF] = useState(false);

  useEffect(() => {
    fetchIdeas();
  }, [statusFilter, industryFilter]);

  const fetchIdeas = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (industryFilter) {
        params.industry = industryFilter === 'custom' ? customIndustry : industryFilter;
      }
      
      const response = await api.get('/business/ideas', { params });
      setIdeas(response.data.ideas);
    } catch (err: any) {
      setError('Failed to load business ideas');
      console.error('Ideas fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!ideaInput.trim() || (!budgetRange && !customBudget)) return;
    
    setGenerating(true);
    try {
      const finalLocation = selectedLocation === 'Other' ? customLocation : selectedLocation;
      const finalBudget = budgetRange || customBudget;
      
      const response = await api.post('/ai/generate-ideas', { 
        input: ideaInput,
        location: finalLocation,
        budget: finalBudget
      });
      setIdeas([...response.data.ideas, ...ideas]);
      setGenerateDialogOpen(false);
      setIdeaInput('');
      setShowLocationBudget(false);
    } catch (err: any) {
      setError('Failed to generate ideas');
      console.error('Generate ideas error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteIdea = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this business idea?')) return;
    
    try {
      await api.delete(`/business/ideas/${id}`);
      setIdeas(ideas.filter(idea => idea.id !== id));
    } catch (err: any) {
      setError('Failed to delete business idea');
      console.error('Delete error:', err);
    }
  };

  const handleGenerateBusinessPlan = async (ideaId: number) => {
    setGeneratingPlan(ideaId);
    try {
      const response = await api.post('/ai/generate-business-plan', {
        businessIdeaId: ideaId,
        location: selectedLocation === 'Other' ? customLocation : selectedLocation,
        budget: budgetRange || customBudget,
      });
      
      // Navigate to business plan page or show success message
      navigate(`/app/plans/${response.data.planId || ideaId}`);
    } catch (err: any) {
      setError('Failed to generate business plan');
      console.error('Generate business plan error:', err);
    } finally {
      setGeneratingPlan(null);
    }
  };

  const handleGenerateFinancialProjection = async (ideaId: number) => {
    setGeneratingProjection(ideaId);
    try {
      const response = await api.post('/ai/generate-financial-projection', {
        businessIdeaId: ideaId,
        location: selectedLocation === 'Other' ? customLocation : selectedLocation,
        budget: budgetRange || customBudget,
      });
      
      // Store the financial data and show dialog
      setFinancialData(response.data.financialProjection);
      setShowFinancialDialog(true);
    } catch (err: any) {
      setError('Failed to generate financial projection');
      console.error('Generate financial projection error:', err);
    } finally {
      setGeneratingProjection(null);
    }
  };

  const handleExportFinancialPDF = async () => {
    if (!financialData) return;
    
    setExportingFinancialPDF(true);
    try {
      // Find the business idea for the financial data
      const idea = ideas.find(i => i.id === financialData.businessIdeaId);
      if (idea) {
        await PDFService.generateFinancialProjectionPDF(idea, financialData);
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingFinancialPDF(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'paused': return 'error';
      default: return 'default';
    }
  };

  const filteredIdeas = ideas.filter(idea =>
    idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          Business Ideas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setGenerateDialogOpen(true)}
        >
          Generate Ideas
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Location and Budget Selection */}
      {showLocationBudget && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎯 Let's Start Your Business Journey
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              First, tell us about your location and budget to get personalized business ideas for Musanze.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Location in Musanze</InputLabel>
                  <Select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    label="Location in Musanze"
                  >
                    <MenuItem value="Musanze Town">Musanze Town</MenuItem>
                    <MenuItem value="Kinigi">Kinigi</MenuItem>
                    <MenuItem value="Ruhengeri">Ruhengeri</MenuItem>
                    <MenuItem value="Bisoke">Bisoke</MenuItem>
                    <MenuItem value="Sabyinyo">Sabyinyo</MenuItem>
                    <MenuItem value="Gahinga">Gahinga</MenuItem>
                    <MenuItem value="Muhabura">Muhabura</MenuItem>
                    <MenuItem value="Other">Other (Specify)</MenuItem>
                  </Select>
                </FormControl>
                {selectedLocation === 'Other' && (
                  <TextField
                    fullWidth
                    placeholder="Enter your specific location..."
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    sx={{ mt: 1 }}
                  />
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Budget Range</InputLabel>
                  <Select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    label="Budget Range"
                  >
                    <MenuItem value="0-50000">0 - 50,000 RWF</MenuItem>
                    <MenuItem value="50000-200000">50,000 - 200,000 RWF</MenuItem>
                    <MenuItem value="200000-500000">200,000 - 500,000 RWF</MenuItem>
                    <MenuItem value="500000-1000000">500,000 - 1,000,000 RWF</MenuItem>
                    <MenuItem value="1000000+">1,000,000+ RWF</MenuItem>
                    <MenuItem value="custom">Custom Amount</MenuItem>
                  </Select>
                </FormControl>
                {budgetRange === 'custom' && (
                  <TextField
                    fullWidth
                    placeholder="Enter your budget range (e.g., 75,000-150,000 RWF)"
                    value={customBudget}
                    onChange={(e) => setCustomBudget(e.target.value)}
                    sx={{ mt: 1 }}
                  />
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setShowLocationBudget(false)}
                  disabled={!budgetRange && !customBudget}
                  sx={{ height: '56px' }}
                >
                  Continue to Ideas
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search ideas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="paused">Paused</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Industry</InputLabel>
                <Select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  label="Industry"
                >
                  <MenuItem value="">All Industries</MenuItem>
                  <MenuItem value="Agriculture">Agriculture</MenuItem>
                  <MenuItem value="Tourism">Tourism</MenuItem>
                  <MenuItem value="Technology">Technology</MenuItem>
                  <MenuItem value="Services">Services</MenuItem>
                  <MenuItem value="Manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="Retail">Retail</MenuItem>
                  <MenuItem value="Education">Education</MenuItem>
                  <MenuItem value="Healthcare">Healthcare</MenuItem>
                  <MenuItem value="custom">Other (Specify)</MenuItem>
                </Select>
              </FormControl>
              {industryFilter === 'custom' && (
                <TextField
                  fullWidth
                  placeholder="Enter your industry..."
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  sx={{ mt: 1 }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={fetchIdeas}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Ideas Grid */}
      <Grid container spacing={3}>
        {filteredIdeas.map((idea) => (
          <Grid item xs={12} md={6} lg={4} key={idea.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {idea.title}
                  </Typography>
                  <Chip
                    label={idea.status}
                    color={getStatusColor(idea.status) as any}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {idea.description}
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Industry:</strong> {idea.industry}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Target Market:</strong> {idea.target_market}
                  </Typography>
                </Box>

                <Grid container spacing={1} mb={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={1} bgcolor="grey.100" borderRadius={1}>
                      <Typography variant="caption" color="text.secondary">
                        Investment
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(idea.initial_investment)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={1} bgcolor="grey.100" borderRadius={1}>
                      <Typography variant="caption" color="text.secondary">
                        Expected Revenue
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {formatCurrency(idea.expected_revenue)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box display="flex" alignItems="center" mb={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Success Probability:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {idea.success_probability}%
                  </Typography>
                </Box>
              </CardContent>
              
              <Box p={2} pt={0}>
                {/* Action Buttons */}
                <Box display="flex" flexDirection="column" gap={1} mb={2}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DescriptionIcon />}
                    onClick={() => handleGenerateBusinessPlan(idea.id)}
                    disabled={generatingPlan === idea.id}
                    fullWidth
                  >
                    {generatingPlan === idea.id ? 'Generating...' : 'Generate Business Plan'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AssessmentIcon />}
                    onClick={() => handleGenerateFinancialProjection(idea.id)}
                    disabled={generatingProjection === idea.id}
                    fullWidth
                  >
                    {generatingProjection === idea.id ? 'Generating...' : 'Generate Financial Projection'}
                  </Button>
                </Box>
                
                {/* Secondary Actions */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => navigate(`/app/ideas/${idea.id}`)}
                  >
                    View Details
                  </Button>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/app/ideas/${idea.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteIdea(idea.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredIdeas.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <LightbulbIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No business ideas found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Generate your first business idea to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setGenerateDialogOpen(true)}
          >
            Generate Ideas
          </Button>
        </Box>
      )}

      {/* Generate Ideas Dialog */}
      <Dialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Business Ideas</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Describe your interests, skills, or market opportunities, and our AI will generate personalized business ideas for you.
          </Typography>
          
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Parameters:
            </Typography>
            <Typography variant="body2">
              📍 Location: <strong>{selectedLocation}</strong>
            </Typography>
            <Typography variant="body2">
              💰 Budget: <strong>{budgetRange}</strong>
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="e.g., I'm interested in sustainable agriculture and have experience in marketing. I want to start a business in Musanze that helps local farmers..."
            value={ideaInput}
            onChange={(e) => setIdeaInput(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateIdeas}
            variant="contained"
            disabled={!ideaInput.trim() || generating}
          >
            {generating ? 'Generating...' : 'Generate Ideas'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Financial Projection Dialog */}
      <Dialog 
        open={showFinancialDialog} 
        onClose={() => setShowFinancialDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AssessmentIcon color="primary" />
            Financial Projection
          </Box>
        </DialogTitle>
        <DialogContent>
          {financialData ? (
            <Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                {typeof financialData === 'string' ? financialData : JSON.stringify(financialData, null, 2)}
              </Typography>
            </Box>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinancialDialog(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={exportingFinancialPDF ? <CircularProgress size={20} /> : <DownloadIcon />}
            onClick={handleExportFinancialPDF}
            disabled={exportingFinancialPDF || !financialData}
          >
            {exportingFinancialPDF ? 'Exporting...' : 'Export PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessIdeas;

