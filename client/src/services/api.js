const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const AI_BASE_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

export async function checkAiServiceHealth() {
  try {
    const response = await fetch(`${AI_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
