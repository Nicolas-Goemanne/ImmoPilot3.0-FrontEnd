import { defineStore } from "pinia";
import { ref } from "vue";

// ChatMessage interface uitbreiden voor alle typen antwoorden
export interface ChatMessage {
  id: number;
  text: string;
  type: "user" | "bot" | "error" | "sql";
  agent?: string; // ➜ Opslaan met welke agent het bericht werd gegenereerd
  suggestions?: string[];
  data?: any[];
}

export const useChatStore = defineStore("chat", () => {
  const messages = ref<ChatMessage[]>([]);
  let messageId = 1;

  const addMessage = (
    text: string,
    type: "user" | "bot" | "error" | "sql",
    agent?: string,
    suggestions?: string[],
    data?: any[]
  ) => {
    // ✅ Log de ontvangen data om te debuggen
    console.log("➤ Toegevoegd bericht:", { text, type, agent, suggestions, data });

    // ✅ Zorg ervoor dat data een array is voor SQL
    if (type === "sql") {
      if (!Array.isArray(data)) {
        console.warn("⚠️ SQL-data is geen array!", data);
        data = []; // Voorkomt fouten in Vue als het geen array is
      }
    }

    messages.value.push({ id: messageId++, text, type, agent, suggestions, data });
  };

  return { messages, addMessage };
});

