import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const fetchAllUsers = async () => {
    try {
        const response = await api.get('/users', { params: { limit: 1000 } });
        return response.data; 
    } catch (error) {
        throw error;
    }
};
