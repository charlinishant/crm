import { useState, useEffect } from 'react';
import { fetchAllUsers } from '../helper/api';

export const useUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const result = await fetchAllUsers();
            setUsers(result.data); 
        } catch (err) {
            console.error("Data is Fetching", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return { users, loading, refresh: loadData };
};