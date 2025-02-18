import axios from "axios";
import { useAuth0 } from "@auth0/auth0-vue";

const API_BASE_URL = "https://localhost:7023/api/ImmoPilot";

export const apiService = {
  async askQuestion(question, agent) {
    try {
      const { getAccessTokenSilently } = useAuth0(); // Auth0 token ophalen
      const token = await getAccessTokenSilently();

      const response = await axios.post(
        `${API_BASE_URL}/ask`,
        { question, agent },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Voeg token toe
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("API-fout:", error);
      throw new Error("Fout bij het ophalen van antwoord");
    }
  },
};
