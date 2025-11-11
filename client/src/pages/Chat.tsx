import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  Avatar,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Lightbulb as LightbulbIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface BusinessIdea {
  id: number;
  title: string;
  industry: string;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { api } = useApi();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<number | ''>('');
  const [businessIdeas, setBusinessIdeas] = useState<BusinessIdea[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(user?.location || 'Musanze');
  const [customLocation, setCustomLocation] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [customBudget, setCustomBudget] = useState('');
  const [businessSector, setBusinessSector] = useState('');
  const [customSector, setCustomSector] = useState('');
  const [showContextSetup, setShowContextSetup] = useState(true);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBusinessIdeas();
    fetchExistingConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBusinessIdeas = async () => {
    try {
      const response = await api.get('/business/ideas');
      setBusinessIdeas(response.data.ideas);
    } catch (err) {
      console.error('Failed to fetch business ideas:', err);
    }
  };

  const fetchExistingConversation = async () => {
    try {
      const response = await api.get('/ai/conversations', {
        params: { limit: 1, offset: 0 }
      });
      const fetchedConversations: Conversation[] = response.data?.conversations || [];

      if (fetchedConversations.length > 0) {
        const latestConversation = fetchedConversations[0];
        setConversationId(latestConversation.id);
        await loadConversationMessages(latestConversation.id);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const loadConversationMessages = async (convId: number) => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/ai/conversations/${convId}/messages`);
      const history = (response.data?.messages || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
        timestamp: msg.created_at || new Date().toISOString(),
      })) as Message[];
      setMessages(history);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError('');

    try {
      const finalLocation = selectedLocation === 'Other' ? customLocation : selectedLocation;
      const finalBudget = budgetRange || customBudget;
      const finalSector = businessSector === 'other' ? customSector : businessSector;
      
      const response = await api.post('/ai/chat', {
        message: inputMessage,
        businessIdeaId: selectedIdea || undefined,
        location: finalLocation,
        budget: finalBudget,
        businessSector: finalSector,
        conversationId: conversationId ?? undefined,
      });

      const aiMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
      const newConversationId = response.data?.conversationId;
      if (newConversationId) {
        setConversationId(newConversationId);
      }
    } catch (err: any) {
      setError('Failed to get AI response. Please try again.');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError('');
    setConversationId(null);
  };

  const handleIdeaChange = (ideaId: number | '') => {
    setSelectedIdea(ideaId);
    setMessages([]);
    setConversationId(null);
  };

  const suggestedQuestions = [
    "How do I validate my business idea in Musanze?",
    "What are the key steps to start a business in Rwanda?",
    "How can I find funding for my startup?",
    "What marketing strategies work best for small businesses?",
    "How do I create a financial projection?",
    "What legal requirements do I need to consider?",
  ];

  const getLocationSpecificQuestions = (): string[] => {
    const locationQuestions: Record<string, string[]> = {
      'Musanze Town': [
        "What business opportunities exist in Musanze Town?",
        "How can I start a retail business in Musanze Town?",
        "What are the local market conditions in Musanze Town?",
        "How do I find customers in Musanze Town?",
      ],
      'Kinigi': [
        "What tourism opportunities exist near Kinigi?",
        "How can I start a hospitality business in Kinigi?",
        "What are the gorilla tourism opportunities in Kinigi?",
        "How do I connect with tourists visiting Kinigi?",
      ],
      'Ruhengeri': [
        "What business opportunities exist in Ruhengeri?",
        "How can I start an agriculture business in Ruhengeri?",
        "What are the local market conditions in Ruhengeri?",
        "How do I connect with local farmers in Ruhengeri?",
      ],
      'Bisoke': [
        "What tourism opportunities exist near Bisoke?",
        "How can I start a hiking guide business in Bisoke?",
        "What are the adventure tourism opportunities in Bisoke?",
        "How do I connect with hikers visiting Bisoke?",
      ],
      'Sabyinyo': [
        "What tourism opportunities exist near Sabyinyo?",
        "How can I start a mountain guide business in Sabyinyo?",
        "What are the hiking tourism opportunities in Sabyinyo?",
        "How do I connect with mountain climbers in Sabyinyo?",
      ],
      'Gahinga': [
        "What tourism opportunities exist near Gahinga?",
        "How can I start a nature guide business in Gahinga?",
        "What are the wildlife tourism opportunities in Gahinga?",
        "How do I connect with nature enthusiasts in Gahinga?",
      ],
      'Muhabura': [
        "What business opportunities exist in Muhabura?",
        "How can I start a local service business in Muhabura?",
        "What are the community needs in Muhabura?",
        "How do I connect with local residents in Muhabura?",
      ]
    };
    return locationQuestions[selectedLocation] || [];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          AI Business Assistant
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Business Idea</InputLabel>
            <Select
              value={selectedIdea}
              onChange={(e) => handleIdeaChange(e.target.value as number | '')}
              label="Select Business Idea"
            >
              <MenuItem value="">
                <em>General Chat</em>
              </MenuItem>
              {businessIdeas.map((idea) => (
                <MenuItem key={idea.id} value={idea.id}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {idea.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {idea.industry}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleClearChat}
          >
            Clear Chat
          </Button>
        </Box>
      </Box>

      {selectedIdea && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You're chatting about: <strong>{businessIdeas.find(idea => idea.id === selectedIdea)?.title}</strong>
          </Typography>
        </Alert>
      )}

      {/* Context Setup */}
      {showContextSetup && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎯 Set Your Business Context
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Help me provide more personalized advice by telling me about your location, budget, and business sector.
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
                <FormControl fullWidth>
                  <InputLabel>Business Sector</InputLabel>
                  <Select
                    value={businessSector}
                    onChange={(e) => setBusinessSector(e.target.value)}
                    label="Business Sector"
                  >
                    <MenuItem value="agriculture">Agriculture</MenuItem>
                    <MenuItem value="tourism">Tourism</MenuItem>
                    <MenuItem value="technology">Technology</MenuItem>
                    <MenuItem value="retail">Retail & Commerce</MenuItem>
                    <MenuItem value="services">Professional Services</MenuItem>
                    <MenuItem value="manufacturing">Manufacturing</MenuItem>
                    <MenuItem value="education">Education</MenuItem>
                    <MenuItem value="healthcare">Healthcare</MenuItem>
                    <MenuItem value="other">Other (Specify)</MenuItem>
                  </Select>
                </FormControl>
                {businessSector === 'other' && (
                  <TextField
                    fullWidth
                    placeholder="Enter your business sector..."
                    value={customSector}
                    onChange={(e) => setCustomSector(e.target.value)}
                    sx={{ mt: 1 }}
                  />
                )}
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={() => setShowContextSetup(false)}
                  disabled={(!budgetRange && !customBudget) || (!businessSector && !customSector)}
                  sx={{ height: '56px' }}
                >
                  Start Personalized Chat
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Context Display */}
      {!showContextSetup && (
        <Card sx={{ mb: 3, bgcolor: 'grey.100' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Your Business Context:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip label={`📍 ${selectedLocation}`} color="primary" size="small" />
              <Chip label={`💰 ${budgetRange}`} color="secondary" size="small" />
              <Chip label={`🏢 ${businessSector}`} color="info" size="small" />
              <Button
                size="small"
                onClick={() => setShowContextSetup(true)}
                sx={{ ml: 1 }}
              >
                Change Context
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Chat Messages */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
              {loadingHistory ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  gap={2}
                  p={4}
                >
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary">
                    Loading your previous messages...
                  </Typography>
                </Box>
              ) : messages.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  p={4}
                  textAlign="center"
                >
                  <AIIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Welcome to InnoStart AI Assistant
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    I'm here to help you with your business journey. Ask me anything about:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center" mb={2}>
                    {suggestedQuestions.map((question, index) => (
                      <Chip
                        key={index}
                        label={question}
                        variant="outlined"
                        onClick={() => setInputMessage(question)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                  {!showContextSetup && getLocationSpecificQuestions().length > 0 && (
                    <>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Specific to {selectedLocation}:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center">
                        {getLocationSpecificQuestions().map((question: string, index: number) => (
                          <Chip
                            key={`location-${index}`}
                            label={question}
                            variant="outlined"
                            color="primary"
                            onClick={() => setInputMessage(question)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              ) : (
                <List sx={{ p: 2 }}>
                  {messages.map((message, index) => (
                    <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box
                        display="flex"
                        alignItems="flex-start"
                        width="100%"
                        mb={1}
                        sx={{
                          flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                            width: 32,
                            height: 32,
                            mx: 1,
                          }}
                        >
                          {message.role === 'user' ? (
                            <PersonIcon />
                          ) : (
                            <AIIcon />
                          )}
                        </Avatar>
                        <Paper
                          elevation={1}
                          sx={{
                            p: 2,
                            maxWidth: '70%',
                            bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                            color: message.role === 'user' ? 'white' : 'text.primary',
                          }}
                        >
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 1,
                              opacity: 0.7,
                            }}
                          >
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Paper>
                      </Box>
                    </ListItem>
                  ))}
                  {loading && (
                    <ListItem>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                          <AIIcon />
                        </Avatar>
                        <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100' }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <CircularProgress size={16} />
                            <Typography variant="body2">AI is thinking...</Typography>
                          </Box>
                        </Paper>
                      </Box>
                    </ListItem>
                  )}
                  <div ref={messagesEndRef} />
                </List>
              )}
            </CardContent>
            
            {error && (
              <Alert severity="error" sx={{ m: 2 }}>
                {error}
              </Alert>
            )}

            <Box p={2} borderTop={1} borderColor="divider">
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  placeholder="Ask me anything about your business..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  multiline
                  maxRows={3}
                />
                <Button
                  variant="contained"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || loading}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  <SendIcon />
                </Button>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<LightbulbIcon />}
                  onClick={() => navigate('/app/ideas')}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  View Business Ideas
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LightbulbIcon />}
                  onClick={() => {
                    setInputMessage("Generate some business ideas for me");
                    handleSendMessage();
                  }}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Generate Ideas
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setInputMessage("Help me create a business plan");
                    handleSendMessage();
                  }}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Create Business Plan
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tips
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • Be specific about your business goals and challenges
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • Ask about local market conditions in Musanze
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                • Request step-by-step guidance for complex processes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Use the business idea selector for contextual advice
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Chat;

