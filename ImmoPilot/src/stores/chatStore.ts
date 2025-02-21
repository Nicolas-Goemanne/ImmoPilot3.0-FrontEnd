import { defineStore } from "pinia";
import { ref } from "vue";

export const useChatStore = defineStore("chat", () => {
  const messages = ref<{ id: number; text: string; type: "user" | "bot" }[]>([]);
  let messageId = 1;

  const addMessage = (text: string, type: "user" | "bot") => {
    messages.value.push({ id: messageId++, text, type });
  };

  return { messages, addMessage };
});
