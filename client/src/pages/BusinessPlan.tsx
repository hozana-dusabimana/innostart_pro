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
    
    // Handle escaped newlines first
    formatted = formatted.replace(/\\n/g, '\n');
    
    // More robust table detection - find all table blocks
    // Tables are sequences of lines containing | that are separated by at most one blank line
    const lines = formatted.split(/\r?\n/);
    const tableBlocks: { start: number; end: number }[] = [];
    let tableStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const hasPipe = line.includes('|') && line.split('|').length >= 3;
      
      if (hasPipe) {
        if (tableStart === -1) {
          tableStart = i;
        }
      } else {
        // Empty line or non-table line
        if (tableStart !== -1) {
          // Check if this is just a blank line (continue table) or end of table
          if (line === '' && i + 1 < lines.length && lines[i + 1].trim().includes('|')) {
            // Continue table
            continue;
          } else {
            // End of table
            tableBlocks.push({ start: tableStart, end: i - 1 });
            tableStart = -1;
          }
        }
      }
    }
    
    // Close any open table at end
    if (tableStart !== -1) {
      tableBlocks.push({ start: tableStart, end: lines.length - 1 });
    }
    
    // Process tables in reverse order to maintain indices
    for (let blockIdx = tableBlocks.length - 1; blockIdx >= 0; blockIdx--) {
      const block = tableBlocks[blockIdx];
      const tableLines = lines.slice(block.start, block.end + 1).filter(line => line.trim().includes('|'));
      
      if (tableLines.length < 2) continue;
      
      // Find separator line
      let separatorIndex = -1;
      let alignments: ('left' | 'center' | 'right')[] = [];
      
      for (let i = 0; i < tableLines.length; i++) {
        const trimmed = tableLines[i].trim();
        if (trimmed.match(/^\|[\s:|-]+\|$/)) {
          separatorIndex = i;
          const parts = trimmed.split('|').filter(p => p.trim());
          alignments = parts.map(part => {
            const trimmedPart = part.trim();
            if (trimmedPart.startsWith(':') && trimmedPart.endsWith(':')) return 'center';
            if (trimmedPart.endsWith(':')) return 'right';
            return 'left';
          });
          break;
        }
      }
      
      // Build table HTML
      const dataLines = tableLines.filter((_, idx) => idx !== separatorIndex);
      if (dataLines.length < 1) continue;
      
      let tableHtml = '<div class="financial-table-container"><table class="financial-table"><thead><tr>';
      
      // Parse header
      const headerLine = dataLines[0];
      const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
      
      headers.forEach((header, idx) => {
        const cleanHeader = header.replace(/^:+|:+$/g, '').trim();
        const align = alignments[idx] || (idx === 0 ? 'left' : 'right');
        tableHtml += `<th style="text-align: ${align}; padding: 12px 16px; font-weight: bold; border-bottom: 2px solid #ddd;">${cleanHeader}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      
      // Parse data rows
      for (let i = 1; i < dataLines.length; i++) {
        const rowCells = dataLines[i].split('|').map(c => c.trim()).filter(c => c);
        if (rowCells.length > 0) {
          while (rowCells.length < headers.length) {
            rowCells.push('');
          }
          
          tableHtml += '<tr>';
          rowCells.slice(0, headers.length).forEach((cell, idx) => {
            const align = alignments[idx] || (idx === 0 ? 'left' : 'right');
            
            // Check if cell is numeric
            const cellTrimmed = cell.trim();
            const numericMatch = cellTrimmed.match(/^[\s\d,.-]+(?:\.\d+)?\s*(RWF)?$/i);
            const isNumeric = numericMatch !== null && idx > 0;
            const isNegative = cellTrimmed.startsWith('-') || (cellTrimmed.startsWith('(') && cellTrimmed.endsWith(')'));
            
            let cellClass = '';
            let cellStyle = `text-align: ${align}; padding: 10px 16px;`;
            
            if (isNumeric) {
              cellClass = isNegative ? 'negative-value' : 'numeric-value';
              cellStyle += ' font-family: "Courier New", monospace; font-weight: 500;';
              // Format numbers
              const numStr = cellTrimmed.replace(/[^\d.-]/g, '');
              if (numStr && !isNaN(parseFloat(numStr))) {
                const formattedNum = parseFloat(numStr).toLocaleString('en-US');
                cell = cellTrimmed.replace(/[\d,.-]+/, formattedNum);
              }
            } else {
              // Handle bold/italic text
              if (cell.includes('*')) {
                cell = cell.replace(/\*([^*]+?)\*/g, '<strong>$1</strong>');
                if (idx === 0 || cell.includes('<strong>')) {
                  cellStyle += ' font-weight: bold; background-color: rgba(46, 125, 50, 0.05);';
                }
              }
            }
            
            tableHtml += `<td class="${cellClass}" style="${cellStyle}">${cell}</td>`;
          });
          tableHtml += '</tr>';
        }
      }
      
      tableHtml += '</tbody></table></div>';
      
      // Replace the table lines in the lines array
      lines.splice(block.start, block.end - block.start + 1, tableHtml);
    }
    
    // Join lines back together after all table replacements
    formatted = lines.join('\n');
    
    // Convert markdown-style bullet lists (*   item)
    const contentLines = formatted.split('\n');
    let inList = false;
    let listItems: string[] = [];
    let result: string[] = [];
    
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      const listMatch = line.match(/^\*   (.+)$/);
      
      if (listMatch) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(listMatch[1]);
      } else {
        if (inList) {
          // Close list
          result.push('<ul style="margin: 16px 0; padding-left: 30px; list-style-type: disc; text-align: left;">');
          listItems.forEach(item => {
            result.push(`<li style="margin: 8px 0; line-height: 1.6; text-align: left;">${item}</li>`);
          });
          result.push('</ul>');
          listItems = [];
          inList = false;
        }
        result.push(line);
      }
    }
    
    // Close any remaining list
    if (inList) {
      result.push('<ul style="margin: 16px 0; padding-left: 30px; list-style-type: disc; text-align: left;">');
      listItems.forEach(item => {
        result.push(`<li style="margin: 8px 0; line-height: 1.6; text-align: left;">${item}</li>`);
      });
      result.push('</ul>');
    }
    
    formatted = result.join('\n');
    
    // Convert section headers (lines ending with colon, on their own line)
    formatted = formatted.replace(/^([A-Z][^:\n]+):\s*$/gm, '<h3 style="color: #2E7D32; font-weight: 600; margin-top: 28px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; font-size: 1.25rem;">$1</h3>');
    
    // Convert bold text (**text**)
    formatted = formatted.replace(/\*\*([^*\n]+?)\*\*/g, '<strong style="font-weight: 600; color: #333;">$1</strong>');
    
    // Convert italic text (*text* but not if it's a list item marker)
    // First, protect list markers
    formatted = formatted.replace(/^\*   /gm, 'LIST_MARKER_PLACEHOLDER ');
    formatted = formatted.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/LIST_MARKER_PLACEHOLDER /g, '*   ');
    
    // Convert paragraph breaks (double line breaks)
    formatted = formatted.split(/\n\n+/).map(para => {
      para = para.trim();
      if (!para || para.startsWith('<') || para.match(/^<[h|u|t]/)) {
        return para; // Don't wrap HTML tags or lists/tables
      }
      return `<p style="margin: 14px 0; line-height: 1.7; text-align: left;">${para}</p>`;
    }).join('\n\n');
    
    // Convert single line breaks to <br> (but not inside HTML tags)
    formatted = formatted.replace(/\n(?!<[^>]*>)/g, '<br>');
    
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
      // Ensure business plan object has all required fields
      const plan = response.data.businessPlan;
      if (plan) {
        setBusinessPlan({
          id: plan.id,
          business_idea_id: plan.business_idea_id,
          executive_summary: plan.executive_summary || null,
          market_analysis: plan.market_analysis || null,
          financial_projections: plan.financial_projections || null,
          marketing_strategy: plan.marketing_strategy || null,
          operations_plan: plan.operations_plan || null,
          risk_analysis: plan.risk_analysis || null,
        });
      } else {
        // If plan doesn't exist, create a basic structure
        setBusinessPlan({
          id: parseInt(id || '0'),
          business_idea_id: response.data.businessIdea?.id || 0,
          executive_summary: null,
          market_analysis: null,
          financial_projections: null,
          marketing_strategy: null,
          operations_plan: null,
          risk_analysis: null,
        });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Business plan not found. Please generate a business plan first.');
      } else {
        setError('Failed to load business plan');
        console.error('Business plan fetch error:', err);
      }
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
    if (!id || !businessIdea) return;
    
    setAiGenerating(true);
    setError('');
    try {
      const response = await api.post('/ai/generate-business-plan-section', {
        section,
        businessIdeaId: businessIdea.id,
      });
      
      const generatedContent = response.data.content;
      
      // Update local state
      setBusinessPlan(prev => ({
        ...prev || {} as BusinessPlanData,
        id: prev?.id || parseInt(id),
        business_idea_id: prev?.business_idea_id || businessIdea.id,
        [section]: generatedContent,
      } as BusinessPlanData));
      
      // Also save to database
      try {
        await api.put(`/business/plans/${id}/sections/${section}`, {
          content: generatedContent
        });
      } catch (saveErr: any) {
        console.warn('Failed to save generated section to database:', saveErr);
        // Don't throw - content is still in local state
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate section with AI';
      setError(errorMessage);
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
          onClick={() => navigate('/app/ideas')}
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
        <IconButton onClick={() => navigate('/app/ideas')} sx={{ mr: 2 }}>
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
                          lineHeight: 1.6,
                          textAlign: 'left',
                          '& h1, & h2, & h3, & h4, & h5, & h6': {
                            fontWeight: 'bold',
                            marginTop: 2,
                            marginBottom: 1,
                            color: 'primary.main',
                            textAlign: 'left'
                          },
                          '& strong, & b': {
                            fontWeight: 'bold',
                            color: 'text.primary'
                          },
                          '& ul, & ol': {
                            paddingLeft: 3,
                            marginBottom: 2,
                            textAlign: 'left'
                          },
                          '& li': {
                            marginBottom: 0.5,
                            textAlign: 'left'
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
          onClick={() => navigate('/app/ideas')}
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

