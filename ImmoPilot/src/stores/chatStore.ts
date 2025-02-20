import { defineStore } from "pinia";
import { ref } from "vue";

interface Message {
  id: number;
  text: string;
  type: "user" | "bot";
}

export const useChatStore = defineStore("chat", () => {
  const messages = ref<Message[]>([]);

  const addMessage = (text: string, type: "user" | "bot") => {
    messages.value.push({ id: Date.now(), text, type });
  };

  return { messages, addMessage };
});
