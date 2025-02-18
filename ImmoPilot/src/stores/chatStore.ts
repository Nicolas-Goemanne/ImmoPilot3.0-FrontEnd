import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

interface Message {
  id: number;
  text: string;
  type: "user" | "bot";
}

export const useChatStore = defineStore("chat", () => {
  const messages = ref<Message[]>([]);

  const sendMessage = async (text: string) => {
    messages.value.push({ id: Date.now(), text, type: "user" });

    try {
      const response = await axios.post("https://localhost:7023/api/OpenAI/ask", {
        question: text,
      });

      messages.value.push({ id: Date.now(), text: response.data.answer, type: "bot" });
    } catch (error) {
      messages.value.push({ id: Date.now(), text: "Fout bij ophalen van antwoord", type: "bot" });
    }
  };

  return { messages, sendMessage };
});
