# InnoStart Pro - AI-Powered Business Guidance Platform

InnoStart Pro is an innovative platform that combines AI-powered business guidance with local Rwandan entrepreneurship support, specifically designed for entrepreneurs in Musanze and beyond.

## 🚀 Features

### Core Functionality
- **AI-Powered Business Idea Generation**: Generate personalized business ideas using Gemini AI
- **Intelligent Chat Assistant**: Get real-time business guidance and advice
- **Business Plan Builder**: Create comprehensive business plans with AI assistance
- **Financial Projections**: Generate realistic financial models and projections
- **Local Knowledge Integration**: Access Musanze-specific business information and regulations

### User Experience
- **Modern React Frontend**: Beautiful, responsive UI built with Material-UI
- **Secure Authentication**: JWT-based user authentication and authorization
- **Real-time Chat**: Interactive AI assistant for business guidance
- **Dashboard Analytics**: Track your business ideas and progress
- **Mobile Responsive**: Works seamlessly on all devices

## 🛠 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Material-UI (MUI)** for modern UI components
- **React Router** for navigation
- **Axios** for API communication
- **Recharts** for data visualization

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with pgvector for embeddings
- **JWT** authentication
- **Google Gemini AI** integration
- **AWS S3** for file storage

### Development
- **TypeScript** for type safety
- **Docker** for containerization
- **Concurrently** for development workflow

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd innostart_pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=innostart_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE innostart_db;
   ```

5. **Start the backend server**
   ```bash
   npm run server
   ```

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
   ```

4. **Start the frontend development server**
   ```bash
   npm start
   ```

### Full Development Setup

To run both frontend and backend simultaneously:

```bash
# From the root directory
npm run dev
```

## 🗄 Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: User accounts and profiles
- **business_ideas**: Generated business ideas
- **business_plans**: Detailed business plans
- **knowledge_documents**: Local business knowledge (RAG)
- **chat_conversations**: AI chat history

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Business Ideas
- `GET /api/business/ideas` - Get user's business ideas
- `GET /api/business/ideas/:id` - Get specific business idea
- `PUT /api/business/ideas/:id` - Update business idea
- `DELETE /api/business/ideas/:id` - Delete business idea
- `GET /api/business/dashboard` - Get dashboard statistics

### AI Services
- `POST /api/ai/generate-ideas` - Generate business ideas
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/generate-business-plan-section` - Generate business plan sections
- `GET /api/ai/knowledge-search` - Search local knowledge

## 🚀 Deployment

### Using Docker

1. **Build the application**
   ```bash
   docker-compose build
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Set up production environment**
   - Configure production database
   - Set up reverse proxy (nginx)
   - Configure SSL certificates
   - Set up monitoring and logging

## 🔐 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation and sanitization
- **CORS Configuration**: Proper CORS setup for security
- **Helmet.js**: Security headers and protection

## 📊 Monitoring and Analytics

- **Health Check Endpoint**: `/api/health`
- **Error Logging**: Comprehensive error logging
- **Performance Monitoring**: Request timing and performance metrics
- **User Analytics**: Dashboard with user statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Project Lead**: DUSABIMANA Hozana
- **AI Engineer**: Gemini AI Integration
- **Backend Developer**: Node.js/Express APIs
- **Frontend Developer**: React/TypeScript UI
- **Data Curator**: Local knowledge management

## 🌍 Impact

InnoStart Pro aims to:
- Empower young innovators in Musanze to confidently start new businesses
- Reduce business failure rates through data-driven guidance
- Support Rwanda's SME development vision
- Create a scalable model for other Rwandan districts

## 📞 Support

For support and questions:
- Email: support@innostart.rw
- Documentation: [Link to documentation]
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ for Rwandan entrepreneurs**



