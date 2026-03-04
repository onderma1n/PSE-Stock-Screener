import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const fetchScreenedStocks = async (endpoint, payload, period) => {
  try {
    const response = await axios.post(`${API_BASE}${endpoint}?period=${period}`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
    throw error;
  }
};