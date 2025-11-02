import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  Chat as ChatIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  AutoAwesome as AutoAwesomeIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <LightbulbIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'AI-Powered Idea Generation',
      description: 'Generate personalized business ideas tailored to your location, budget, and interests using advanced AI technology.',
    },
    {
      icon: <ChatIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'Intelligent Chat Assistant',
      description: 'Get real-time business guidance and advice from our AI assistant, available 24/7 to help you succeed.',
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'Business Plan Builder',
      description: 'Create comprehensive business plans with AI assistance, including financial projections and market analysis.',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'Financial Projections',
      description: 'Generate realistic financial models and projections to help you plan and secure funding for your business.',
    },
    {
      icon: <BusinessIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'Local Knowledge Integration',
      description: 'Access Musanze-specific business information, regulations, and local market insights to make informed decisions.',
    },
    {
      icon: <AutoAwesomeIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'Smart Analytics',
      description: 'Track your business ideas and progress with insightful analytics and visualizations on your personalized dashboard.',
    },
  ];

  const benefits = [
    'Reduce business failure rates through data-driven guidance',
    'Get personalized advice based on local market conditions',
    'Create professional business plans in minutes',
    'Access 24/7 AI-powered business consultation',
    'Track and manage all your business ideas in one place',
    'Make informed decisions with financial projections',
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Navigation Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                InnoStart Pro
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                color="inherit"
                onClick={() => navigate('/login')}
                sx={{ color: 'text.primary' }}
              >
                Sign In
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                sx={{ px: 3 }}
              >
                Get Started
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            backgroundSize: 'cover',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography
                variant={isMobile ? 'h3' : 'h2'}
                component="h1"
                gutterBottom
                sx={{ fontWeight: 700, mb: 3 }}
              >
                Empower Your Entrepreneurial Journey with AI
              </Typography>
              <Typography
                variant="h6"
                component="p"
                sx={{ mb: 4, opacity: 0.95, lineHeight: 1.8 }}
              >
                InnoStart Pro is your AI-powered business guidance platform, specifically designed for 
                entrepreneurs in Musanze and beyond. Get personalized business ideas, comprehensive plans, 
                and expert guidance to turn your dreams into reality.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/register')}
                  sx={{
                    py: 1.5,
                    px: 4,
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  }}
                >
                  Start Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Sign In
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <BusinessIcon sx={{ fontSize: { xs: 200, md: 300 }, opacity: 0.3 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Everything You Need to Start Your Business
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', mt: 2 }}>
            Our comprehensive platform provides all the tools and guidance you need to launch and grow your business successfully.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box
        sx={{
          backgroundColor: 'grey.50',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                Why Choose InnoStart Pro?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                We combine cutting-edge AI technology with local expertise to provide you with 
                the most relevant and actionable business guidance for your region.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {benefits.map((benefit, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <CheckCircleIcon sx={{ color: 'primary.main', mt: 0.5 }} />
                    <Typography variant="body1">{benefit}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
                  color: 'white',
                  borderRadius: 3,
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Ready to Start Your Journey?
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, opacity: 0.95 }}>
                  Join thousands of entrepreneurs who are using InnoStart Pro to turn their 
                  business ideas into reality. Get started today for free!
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/register')}
                  sx={{
                    py: 1.5,
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  }}
                >
                  Create Your Account
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: 'grey.900',
          color: 'grey.300',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BusinessIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
                  InnoStart Pro
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Empowering entrepreneurs in Musanze, Rwanda and beyond with AI-powered business guidance.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                © 2024 InnoStart Pro. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', mb: 2 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  color="inherit"
                  onClick={() => navigate('/login')}
                  sx={{ justifyContent: 'flex-start', color: 'grey.300' }}
                >
                  Sign In
                </Button>
                <Button
                  color="inherit"
                  onClick={() => navigate('/register')}
                  sx={{ justifyContent: 'flex-start', color: 'grey.300' }}
                >
                  Create Account
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Homepage;

