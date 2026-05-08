import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/', 
});


export const fetchAllUsers = async () => {
    try {
        const response = await api.get('users/');
        return response.data; 
    } catch (error) {
        throw error;
    }
};