import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  AutoAwesome as AIIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
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
}

interface BusinessPlanData {
  id: number;
  business_idea_id: number;
  executive_summary: string | null;
  market_analysis: string | null;
  financial_projections: string | null;
  marketing_strategy: string | null;
  operations_plan: string | null;
  risk_analysis: string | null;
}

const BusinessPlan: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [businessIdea, setBusinessIdea] = useState<BusinessIdea | null>(null);
  const [businessPlan, setBusinessPlan] = useState<BusinessPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const { api } = useApi();

  // Helper function to format content for better display
  const formatContentForDisplay = (content: string | null) => {
    if (!content) return '';
    
    // Convert line breaks to HTML
    let formatted = content.replace(/\n/g, '<br>');
    
    // Convert bullet points to HTML lists
    formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
    
    // Convert bold text patterns
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert section headers
    formatted = formatted.replace(/^([A-Z][^:]+):$/gm, '<h3>$1</h3>');
    
    return formatted;
  };

  // Special formatting for financial projections with enhanced table design
  const formatFinancialProjections = (content: string | null) => {
    if (!content) return '';
    
    let formatted = content;
    
    // First, handle tables before converting line breaks
    const tableRegex = /(\|.*\|[\r\n]+)+/g;
    formatted = formatted.replace(tableRegex, (match) => {
      const lines = match.trim().split(/\r?\n/).filter(line => line.trim() && line.includes('|'));
      if (lines.length < 2) return match;
      
      let tableHtml = '<div class="financial-table-container"><table class="financial-table">';
      
      lines.forEach((line, index) => {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length === 0) return;
        
        if (index === 0) {
          // Header row
          tableHtml += '<thead><tr>';
          cells.forEach(cell => {
            tableHtml += `<th>${cell}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
        } else {
          // Data row
          tableHtml += '<tr>';
          cells.forEach(cell => {
            const isNumeric = /^[\d,.-]+$/.test(cell.replace(/[()]/g, ''));
            const isNegative = cell.startsWith('(') && cell.endsWith(')');
            const cellClass = isNumeric ? (isNegative ? 'negative-value' : 'numeric-value') : '';
            tableHtml += `<td class="${cellClass}">${cell}</td>`;
          });
          tableHtml += '</tr>';
        }
      });
      
      tableHtml += '</tbody></table></div>';
      return tableHtml;
    });
    
    // Convert line breaks to HTML
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Convert bullet points to HTML lists
    formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
    
    // Convert bold text patterns
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert section headers with special styling
    formatted = formatted.replace(/^([A-Z][^:]+):$/gm, '<h3 class="section-header">$1</h3>');
    
    // Convert assumptions section
    formatted = formatted.replace(/^Assumptions:$/gm, '<div class="assumptions-section"><h3 class="section-header">Assumptions</h3>');
    
    // Convert break-even analysis
    formatted = formatted.replace(/^Break-Even Analysis:$/gm, '<div class="break-even-section"><h3 class="section-header">Break-Even Analysis</h3>');
    
    // Convert funding requirements
    formatted = formatted.replace(/^Funding Requirements:$/gm, '<div class="funding-section"><h3 class="section-header">Funding Requirements</h3>');
    
    return formatted;
  };

  const sections = [
    { key: 'executive_summary', label: 'Executive Summary', icon: '📋' },
    { key: 'market_analysis', label: 'Market Analysis', icon: '📊' },
    { key: 'financial_projections', label: 'Financial Projections', icon: '💰' },
    { key: 'marketing_strategy', label: 'Marketing Strategy', icon: '📢' },
    { key: 'operations_plan', label: 'Operations Plan', icon: '⚙️' },
    { key: 'risk_analysis', label: 'Risk Analysis', icon: '⚠️' },
  ];

  useEffect(() => {
    if (id) {
      fetchBusinessPlan();
    }
  }, [id]);

  const fetchBusinessPlan = async () => {
    try {
      const response = await api.get(`/ai/business-plan/${id}`);
      setBusinessIdea(response.data.businessIdea);
      setBusinessPlan(response.data.businessPlan);
    } catch (err: any) {
      setError('Failed to load business plan');
      console.error('Business plan fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSection = (section: string) => {
    const content = businessPlan?.[section as keyof BusinessPlanData] as string || '';
    setSectionContent(content);
    setEditingSection(section);
  };

  const handleSaveSection = async () => {
    if (!editingSection || !id) return;
    
    setSaving(true);
    try {
      await api.put(`/business/plans/${id}`, {
        section: editingSection,
        content: sectionContent,
      });
      
      setBusinessPlan(prev => prev ? {
        ...prev,
        [editingSection]: sectionContent,
      } : null);
      
      setEditingSection(null);
    } catch (err: any) {
      setError('Failed to save section');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWithAI = async (section: string) => {
    if (!id) return;
    
    setAiGenerating(true);
    try {
      const response = await api.post('/ai/generate-business-plan-section', {
        section,
        businessIdeaId: parseInt(id),
      });
      
      setBusinessPlan(prev => prev ? {
        ...prev,
        [section]: response.data.content,
      } : null);
    } catch (err: any) {
      setError('Failed to generate section with AI');
      console.error('AI generation error:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!businessIdea || !businessPlan) {
      alert('Business plan data not available for export');
      return;
    }

    setExportingPDF(true);
    try {
      await PDFService.generateBusinessPlanPDF(businessIdea, businessPlan);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !businessIdea) {
    return (
      <Box>
        <Alert severity="error">{error || 'Business idea not found'}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/ideas')}
          sx={{ mt: 2 }}
        >
          Back to Ideas
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton onClick={() => navigate('/ideas')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" gutterBottom>
            {businessIdea.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Business Plan & Strategy
          </Typography>
        </Box>
      </Box>

      {/* Business Idea Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Business Overview
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {businessIdea.description}
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <Chip label={businessIdea.industry} color="primary" size="small" />
                <Chip label={businessIdea.status} color="secondary" size="small" />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Key Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="h6" color="primary">
                      ${businessIdea.initial_investment.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Initial Investment
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="h6" color="success.main">
                      ${businessIdea.expected_revenue.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Expected Revenue
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={1}>
                    <Typography variant="h6" color="info.main">
                      {businessIdea.success_probability}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Success Probability
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Business Plan Sections */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable">
            {sections.map((section, index) => (
              <Tab
                key={section.key}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>{section.icon}</span>
                    {section.label}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        <CardContent sx={{ minHeight: 400 }}>
          {sections.map((section, index) => (
            <Box
              key={section.key}
              hidden={activeTab !== index}
              sx={{ display: activeTab === index ? 'block' : 'none' }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {section.icon} {section.label}
                </Typography>
                <Box>
                  <Button
                    startIcon={<AIIcon />}
                    onClick={() => handleGenerateWithAI(section.key)}
                    disabled={aiGenerating}
                    sx={{ mr: 1 }}
                  >
                    {aiGenerating ? 'Generating...' : 'Generate with AI'}
                  </Button>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => handleEditSection(section.key)}
                  >
                    Edit
                  </Button>
                </Box>
              </Box>

              {editingSection === section.key ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={10}
                    value={sectionContent}
                    onChange={(e) => setSectionContent(e.target.value)}
                    placeholder={`Enter your ${section.label.toLowerCase()}...`}
                  />
                  <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                    <Button onClick={() => setEditingSection(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveSection}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  {businessPlan?.[section.key as keyof BusinessPlanData] ? (
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'background.paper', 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography 
                        variant="body1" 
                        component="div"
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                          '& h1, & h2, & h3, & h4, & h5, & h6': {
                            fontWeight: 'bold',
                            marginTop: 2,
                            marginBottom: 1,
                            color: 'primary.main'
                          },
                          '& strong, & b': {
                            fontWeight: 'bold',
                            color: 'text.primary'
                          },
                          '& ul, & ol': {
                            paddingLeft: 3,
                            marginBottom: 2
                          },
                          '& li': {
                            marginBottom: 0.5
                          },
                          '& table': {
                            width: '100%',
                            borderCollapse: 'collapse',
                            marginBottom: 2,
                            marginTop: 2
                          },
                          '& th, & td': {
                            border: '1px solid',
                            borderColor: 'divider',
                            padding: 1,
                            textAlign: 'left'
                          },
                          '& th': {
                            backgroundColor: 'grey.100',
                            fontWeight: 'bold'
                          },
                           '& .table-section': {
                             marginBottom: 3,
                             '& h3': {
                               color: 'primary.main',
                               marginBottom: 1,
                               fontSize: '1.1rem'
                             }
                           },
                           // Financial projections specific styling
                           '& .financial-table-container': {
                             margin: '16px 0',
                             overflowX: 'auto',
                             borderRadius: '8px',
                             border: '1px solid #e0e0e0',
                             boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                           },
                           '& .financial-table': {
                             width: '100%',
                             borderCollapse: 'collapse',
                             backgroundColor: 'white',
                             '& thead': {
                               backgroundColor: '#f5f5f5',
                               '& th': {
                                 padding: '12px 16px',
                                 textAlign: 'left',
                                 fontWeight: 'bold',
                                 color: '#333',
                                 borderBottom: '2px solid #ddd',
                                 fontSize: '0.9rem',
                                 textTransform: 'uppercase',
                                 letterSpacing: '0.5px'
                               }
                             },
                             '& tbody': {
                               '& tr': {
                                 '&:nth-of-type(even)': {
                                   backgroundColor: '#fafafa'
                                 },
                                 '&:hover': {
                                   backgroundColor: '#f0f8ff'
                                 }
                               },
                               '& td': {
                                 padding: '10px 16px',
                                 borderBottom: '1px solid #eee',
                                 fontSize: '0.9rem',
                                 '&.numeric-value': {
                                   textAlign: 'right',
                                   fontFamily: 'monospace',
                                   fontWeight: '500',
                                   color: '#2e7d32'
                                 },
                                 '&.negative-value': {
                                   textAlign: 'right',
                                   fontFamily: 'monospace',
                                   fontWeight: '500',
                                   color: '#d32f2f'
                                 }
                               }
                             }
                           },
                           '& .section-header': {
                             color: '#1976d2',
                             fontSize: '1.2rem',
                             fontWeight: 'bold',
                             marginTop: '24px',
                             marginBottom: '12px',
                             paddingBottom: '8px',
                             borderBottom: '2px solid #e3f2fd'
                           },
                           '& .assumptions-section': {
                             backgroundColor: '#f8f9fa',
                             padding: '16px',
                             borderRadius: '8px',
                             marginBottom: '16px',
                             border: '1px solid #e9ecef',
                             '& ul': {
                               margin: '8px 0',
                               paddingLeft: '20px',
                               '& li': {
                                 marginBottom: '8px',
                                 lineHeight: '1.5'
                               }
                             }
                           },
                           '& .break-even-section': {
                             backgroundColor: '#fff3e0',
                             padding: '16px',
                             borderRadius: '8px',
                             marginBottom: '16px',
                             border: '1px solid #ffcc02',
                             '& ul': {
                               margin: '8px 0',
                               paddingLeft: '20px',
                               '& li': {
                                 marginBottom: '8px',
                                 lineHeight: '1.5'
                               }
                             }
                           },
                           '& .funding-section': {
                             backgroundColor: '#e8f5e8',
                             padding: '16px',
                             borderRadius: '8px',
                             marginBottom: '16px',
                             border: '1px solid #4caf50',
                             '& ul': {
                               margin: '8px 0',
                               paddingLeft: '20px',
                               '& li': {
                                 marginBottom: '8px',
                                 lineHeight: '1.5'
                               }
                             }
                           }
                        }}
                         dangerouslySetInnerHTML={{
                           __html: section.key === 'financial_projections' 
                             ? formatFinancialProjections(String(businessPlan[section.key as keyof BusinessPlanData] || ''))
                             : formatContentForDisplay(String(businessPlan[section.key as keyof BusinessPlanData] || ''))
                         }}
                      />
                    </Box>
                  ) : (
                    <Box
                      textAlign="center"
                      py={8}
                      bgcolor="grey.50"
                      borderRadius={2}
                      border="2px dashed"
                      borderColor="grey.300"
                      sx={{
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'primary.50'
                        }
                      }}
                    >
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        {section.icon} {section.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                        No content available for this section. Generate AI-powered content to get started.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AIIcon />}
                        onClick={() => handleGenerateWithAI(section.key)}
                        disabled={aiGenerating}
                        sx={{ 
                          borderRadius: 2,
                          textTransform: 'none',
                          px: 3,
                          py: 1
                        }}
                      >
                        {aiGenerating ? 'Generating...' : 'Generate with AI'}
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/ideas')}
        >
          Back to Ideas
        </Button>
        <Button
          variant="contained"
          startIcon={exportingPDF ? <CircularProgress size={20} /> : <DownloadIcon />}
          onClick={handleExportPDF}
          disabled={exportingPDF || !businessIdea || !businessPlan}
        >
          {exportingPDF ? 'Exporting...' : 'Export PDF'}
        </Button>
      </Box>
    </Box>
  );
};

export default BusinessPlan;

