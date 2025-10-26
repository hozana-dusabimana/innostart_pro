import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API endpoints
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (userData: any) =>
        api.post('/auth/register', userData),
    getProfile: () =>
        api.get('/auth/profile'),
    updateProfile: (userData: any) =>
        api.put('/auth/profile', userData),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.put('/auth/change-password', { currentPassword, newPassword }),
};

export const businessApi = {
    getIdeas: (params?: any) =>
        api.get('/business/ideas', { params }),
    getIdea: (id: number) =>
        api.get(`/business/ideas/${id}`),
    updateIdea: (id: number, data: any) =>
        api.put(`/business/ideas/${id}`, data),
    deleteIdea: (id: number) =>
        api.delete(`/business/ideas/${id}`),
    getBusinessPlan: (businessIdeaId: number) =>
        api.get(`/business/plans/${businessIdeaId}`),
    updateBusinessPlan: (businessIdeaId: number, section: string, content: string) =>
        api.put(`/business/plans/${businessIdeaId}`, { section, content }),
    getDashboard: () =>
        api.get('/business/dashboard'),
};

export const aiApi = {
    generateIdeas: (input: string, location?: string) =>
        api.post('/ai/generate-ideas', { input, location }),
    chat: (message: string, businessIdeaId?: number) =>
        api.post('/ai/chat', { message, businessIdeaId }),
    generateBusinessPlanSection: (section: string, businessIdeaId: number) =>
        api.post('/ai/generate-business-plan-section', { section, businessIdeaId }),
    getBusinessPlan: (businessIdeaId: number) =>
        api.get(`/ai/business-plan/${businessIdeaId}`),
    searchKnowledge: (query: string, limit?: number) =>
        api.get('/ai/knowledge-search', { params: { q: query, limit } }),
};

export default api;
