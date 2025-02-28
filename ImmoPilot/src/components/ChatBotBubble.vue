<script setup>
import { ref, nextTick } from "vue";
import { useAuth0 } from "@auth0/auth0-vue";
import { useChatStore } from "@/stores/chatStore";
import { fetchProtectedData } from "@/services/apiService";
import { fetchClaireResponse } from "@/services/claireApiService";

// icon imports
import openaiIcon from "/openai.PNG?url";
import deepseekIcon from "/deepseek1.PNG?url";
import sqlIcon from "/sql.PNG?url";
import claireIcon from "/claire.PNG?url";
import logoIcon from "/logosoftedge.png?url";
import nameIcon from "/name.PNG?url";

// ==============================
// STATE & REFERENCES
// ==============================
const chatStore = useChatStore();
const { getAccessTokenSilently, isAuthenticated } = useAuth0();

const message = ref("");
const isOpen = ref(false);
const showAgentSelection = ref(false);
const selectedAgent = ref("openai");
const isLoading = ref(false);
const chatContainer = ref(null);
const copiedState = ref({});

const agents = {
  openai: { icon: openaiIcon, name: "OpenAI", description: "Een krachtige AI voor algemene vragen en diepgaande antwoorden." },
  deepseek: { icon: deepseekIcon, name: "DeepSeek", description: "AI-model gespecialiseerd in redeneren en logische analyses." },
  sql: { icon: sqlIcon, name: "SQL", description: "Haal nauwkeurige data uit onze SQL-database met AI-gestuurde queries." },
  claire: { icon: claireIcon, name: "Claire", description: "Onze eigen chatbot met specifieke kennis over vastgoed en administratie." }
};

// ==============================
// UTILITY FUNCTIONS
// ==============================
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const copyToClipboard = (data, messageId) => {
  let textToCopy = "";
  if (typeof data === "string") {
    textToCopy = data;
  } else if (Array.isArray(data)) {
    const headers = Object.keys(data[0] || {}).join("\t");
    const rows = data.map(row => Object.values(row).join("\t")).join("\n");
    textToCopy = `${headers}\n${rows}`;
  }

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      copiedState.value[messageId] = true;
      setTimeout(() => {
        copiedState.value[messageId] = false;
      }, 60000);
    })
    .catch(err => console.error("❌ Fout bij kopiëren:", err));
};

const isList = (text) => /\d+\.\s/.test(text);

const getFirstLine = (text) => isList(text) ? text.split(/\d+\.\s/)[0].trim() : text;

const parseList = (text) => {
  if (!isList(text)) return [];
  let lines = text
    .replaceAll("**", "")
    .replaceAll("*", " ")
    .split(/\d+\.\s/)
    .filter(item => item.trim() !== "");
  lines.shift();
  return lines;
};

const getToken = async () => {
  try {
    return await getAccessTokenSilently();
  } catch (error) {
    console.error("⚠️ Fout bij ophalen access token:", error);
    return null;
  }
};

// ==============================
// CHAT FUNCTIONS
// ==============================
const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) showAgentSelection.value = false;
};

const toggleAgentSelection = () => {
  showAgentSelection.value = !showAgentSelection.value;
};

const selectAgent = (agentKey) => {
  selectedAgent.value = agentKey;
  showAgentSelection.value = false;
};

const sendMessage = async () => {
  if (!message.value.trim()) return;

  // Check if user is logged in
  if (!isAuthenticated.value) {
    chatStore.addMessage("Gelieve eerst in te loggen voordat je ImmoPilot gebruikt.", "error");
    return;
  }

  isLoading.value = true;
  const userMessage = message.value;
  chatStore.addMessage(userMessage, "user");
  scrollToBottom();
  message.value = "";

  try {
    const token = await getToken();
    if (!token) {
      chatStore.addMessage("Er is een probleem met de authenticatie. Probeer het later opnieuw.", "error");
      return;
    }

    let response = null;
    if (selectedAgent.value === "claire") {
      response = await fetchClaireResponse(userMessage);
    } else {
      response = await fetchProtectedData(token, userMessage, selectedAgent.value);
    }

    if (!response) {
      chatStore.addMessage("Ik kan momenteel geen verbinding maken met de service, probeer het later opnieuw.", "error");
    } else if (response.answer) {
      chatStore.addMessage(response.answer, "bot");
    } else if (response.data) {
      chatStore.addMessage(response.data, "sql");
    }
  } catch (error) {
    console.error("⚠️ Fout bij API-aanroep:", error);
    chatStore.addMessage("ImmoPilot heeft het even druk, probeer het later opnieuw.", "error");
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};
</script>

<template>
  <div class="chat-wrapper">
    <!-- Clickable chatbot Logo -->
    <div v-if="!isOpen" class="chat-logo" @click="toggleChat">
      <img :src="logoIcon" alt="ChatBot Logo" class="chat-logo-icon" />
    </div>

    <!-- Chatbox -->
    <div v-if="isOpen" class="chat-container">
      <div class="chat-header">
        <img :src="nameIcon" alt="ImmoPilot" class="chat-title" />
        <button class="close-button" @click="toggleChat">✖</button>
      </div>

      <div ref="chatContainer" class="chat-messages">
        <!-- Welcomemessage -->
        <div class="message bot-message">
          <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
          <span class="message-text">Hallo! Ik ben ImmoPilot! Selecteer je agent en stel me gerust je vraag.</span>
        </div>

        <!-- Dynamic messages -->
        <div v-for="msg in chatStore.messages" :key="msg.id" :class="['message', msg.type === 'user' ? 'user-message' : (msg.type === 'error' ? 'error-message' : 'bot-message')]">
          <template v-if="msg.type === 'bot'">
            <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
            <template v-if="isList(msg.text)">
              <div>
                <span class="message-text">{{ getFirstLine(msg.text) }}</span>
                <ul class="styled-list">
                  <li v-for="(item, index) in parseList(msg.text)" :key="index">
                    <span class="bullet-point">•</span> <span class="list-text">{{ item }}</span>
                  </li>
                </ul>
              </div>
            </template>
            <template v-else>
              <span class="message-text">{{ msg.text }}</span>
            </template>
            <button class="copy-button" @click="copyToClipboard(msg.text, msg.id)">
              <span v-if="copiedState[msg.id]" class="icon-checkmark"></span>
              <span v-else class="icon-copy"></span>
            </button>
          </template>

          <!-- SQL response -->
          <template v-else-if="msg.type === 'sql'">
            <div class="bot-message">
              <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
              <div class="sql-response">
                <table class="sql-table">
                  <thead>
                    <tr>
                      <th v-for="(value, key) in msg.text[0]" :key="key">{{ key }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in msg.text" :key="index">
                      <td v-for="(value, key) in row" :key="key">{{ value }}</td>
                    </tr>
                  </tbody>
                </table>
                <button class="copy-button table-copy-button" @click="copyToClipboard(msg.text, msg.id)">
                  <span v-if="copiedState[msg.id]" class="icon-checkmark"></span>
                  <span v-else class="icon-copy"></span>
                </button>
              </div>
            </div>
          </template>

          <!-- Error message -->
          <template v-else-if="msg.type === 'error'">
            <div class="error-message">
              <span class="message-text">{{ msg.text }}</span>
            </div>
          </template>

          <!-- General messages -->
          <template v-else>
            <span class="message-text">{{ msg.text }}</span>
          </template>
        </div>

        <div v-if="isLoading" class="thinking-animation">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- Chat Input & Agent selection -->
      <div class="chat-input">
        <input v-model="message" placeholder="Typ hier je bericht..." class="input-text" />
        <button class="agent-selector" @click="toggleAgentSelection">
          <img :src="agents[selectedAgent].icon" alt="Agent Logo" class="agent-icon" />
        </button>
        <button class="send-button" @click="sendMessage" :disabled="isLoading">
          {{ isLoading ? "..." : "Send" }}
        </button>
      </div>

      <!-- AI Agent selection -->
      <div v-if="showAgentSelection" class="agent-dropdown">
        <h3 class="agent-header">Kies je AI-assistent:</h3>
        <ul>
          <li v-for="(agent, key) in agents" :key="key" @click="selectAgent(key)">
            <img :src="agent.icon" class="agent-icon" />
            <div class="agent-info">
              <strong class="agent-name">{{ agent.name }}</strong>
              <p>{{ agent.description }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-wrapper {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}
.chat-logo {
  background-color: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.3s ease-in-out;
}
.chat-logo:hover {
  transform: scale(1.1);
}
.chat-logo-icon {
  width: 80px;
  height: 80px;
}
.chat-container {
  position: fixed;
  bottom: 10px;
  right: 10px;
  width: 600px;
  height: 80vh;
  max-height: 85vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  border: 2px solid #5ff38e;
  overflow: hidden;
}
.chat-header {
  color: white;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.chat-title {
  height: 35px;
}
.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #5ff38e;
  position: absolute;
  right: 10px;
}
.chat-messages {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.message {
  max-width: 100%;
  padding: 8px;
  font-size: 14px;
  word-break: break-word;
  display: flex;
  align-items: center;
  color: rgb(100, 100, 100);
}
/* Bot- and user messages */
.bot-message {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  border: 1px solid #d1d1d1;
  width: 100%;
  padding: 8px;
  background: white;
}
.user-message {
  align-self: flex-end;
  text-align: right;
  padding: 8px;
}
/* Error messages */
.error-message {
  background-color: #5ff38e;
  border: 1px solid #5ff38e;
  color: white;
  font-weight: bold;
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  display: flex;
  align-items: center;
}
.bot-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}
.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ddd;
  align-items: center;
}
.input-text {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #5ff38e;
  color: rgb(100, 100, 100);
  outline: none;
  font-size: 14px;
  transition: border-color 0.3s ease-in-out;
}
.agent-selector {
  background: none;
  border: none;
  cursor: pointer;
  margin: 0 10px;
}
.agent-icon {
  width: 30px;
  height: 30px;
}
.send-button {
  background-color: #5ff38e;
  border: none;
  color: white;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.send-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.agent-dropdown {
  position: absolute;
  bottom: 70px;
  left: 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  width: 95%;
  padding: 10px;
}
.agent-header {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #5ff38e;
}
.agent-dropdown ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.agent-dropdown li {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
}
.agent-dropdown li:hover {
  background: #f0f0f0;
}
.agent-info {
  margin-left: 10px;
  font-size: 14px;
}
.agent-info p {
  margin: 0;
  color: #555;
  font-size: 12px;
}
.agent-name {
  color: #5ff38e;
  font-weight: bold;
}
.sql-response {
  background: white;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d1d1d1;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  max-height: 350px;
}
.sql-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-size: 12px;
}
.sql-table th, .sql-table td {
  border: 1px solid #ddd;
  padding: 6px;
  text-align: left;
  white-space: normal;
  overflow: hidden;
  word-break: break-word;
}
.copy-button {
  background: none;
  border: none;
  color: #5ff38e;
  font-size: 16px;
  cursor: pointer;
  margin-left: auto;
  display: flex;
  align-items: center;
  transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  border-radius: 5px;
  border: 1px solid #d1d1d1;
  padding: 3px 6px;
  margin-top: 3px;
}
.copy-button:hover {
  transform: scale(1.1);
  background: #f5f5f5;
  border-color: #bcbcbc;
}
.icon-copy::before {
  content: "📄";
  font-size: 14px;
}
.icon-checkmark::before {
  content: "✔";
  font-size: 14px;
  border-color: #5ff38e;
  color: #4dd678;
}
.thinking-animation {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}
.thinking-dots span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 3px;
  background-color: #5ff38e;
  border-radius: 50%;
  animation: blink 1.5s infinite;
}
.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}
.styled-list {
  list-style: none;
  padding: 10px;
  margin-top: 5px;
  background: #ffffff;
}
.styled-list li {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 14px;
  color: #555;
  border-bottom: 1px solid #e1e1e1;
}
.styled-list li:last-child {
  border-bottom: none;
}
.bullet-point {
  font-weight: bold;
  color: #5ff38e;
  margin-right: 8px;
}
.list-text {
  flex: 1;
}
@keyframes blink {
  0% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}

@media (max-width: 768px) {
  .chat-container {
    width: 90%;
    height: 85vh;
  }
}
</style>
