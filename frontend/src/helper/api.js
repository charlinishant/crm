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

/**
 * Centrally filtered telecallers helper.
 * Returns only SALES/PRE_SALES users, strictly excluding CHANNEL_PARTNER and ADMIN.
 */
export const fetchTelecallers = async () => {
    try {
        const response = await api.get('/users/telecallers');
        const list = Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
        return list.filter((u) => u?.role !== "CHANNEL_PARTNER" && u?.role !== "ADMIN");
    } catch (error) {
        const fallback = await api.get('/users', { params: { role: 'SALES', limit: 1000 } });
        const list = Array.isArray(fallback.data?.data) ? fallback.data.data : Array.isArray(fallback.data) ? fallback.data : [];
        return list.filter((u) => u?.role !== "CHANNEL_PARTNER" && u?.role !== "ADMIN");
    }
};

export const fetchChannelPartners = async () => {
    try {
        const response = await api.get('/users', { params: { role: 'CHANNEL_PARTNER', limit: 1000 } });
        return Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        throw error;
    }
};
