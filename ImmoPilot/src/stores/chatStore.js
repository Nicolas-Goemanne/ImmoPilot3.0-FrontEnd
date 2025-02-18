import { defineStore } from "pinia";
import { apiService } from "@/services/apiService";

export const useChatStore = defineStore("chatStore", {
  state: () => ({
    messages: [], // Hier slaan we berichten op
  }),
  actions: {
    async sendMessage(userMessage, agent) {
      // Voeg het bericht van de gebruiker toe
      this.messages.push({ text: userMessage, type: "user" });

      try {
        // Stuur vraag naar API en krijg antwoord
        const response = await apiService.askQuestion(userMessage, agent);

        // Voeg het antwoord van de bot toe
        this.messages.push({ text: response.answer, type: "bot" });
      } catch (error) {
        console.error("Fout bij het versturen van bericht:", error);
        this.messages.push({
          text: "Er is een fout opgetreden bij het ophalen van het antwoord.",
          type: "bot",
        });
      }
    },
  },
});

