<script setup>
import { ref, nextTick } from "vue";
import { useChatStore } from "@/stores/chatStore";
import { useAuth0 } from "@auth0/auth0-vue";
import { fetchProtectedData } from "@/services/apiService";
import { useTokenStore } from "@/stores/tokenStore";
import { fetchClaireResponse } from "@/services/claireApiService";

// Icons
import openaiIcon from "/openai.PNG?url";
import deepseekIcon from "/deepseek1.PNG?url";
import sqlIcon from "/sql.PNG?url";
import claireIcon from "/claire.PNG?url";
import logoIcon from "/logosoftedge.png?url";
import nameIcon from "/name.PNG?url";

// State en referenties
const chatStore = useChatStore();
const { getAccessTokenSilently, isAuthenticated } = useAuth0();

const message = ref("");
const isOpen = ref(false);
const showAgentSelection = ref(false);
const selectedAgent = ref("openai");
const isLoading = ref(false);
const chatContainer = ref(null);
const copiedState = ref({});

// Agents
const agents = {
  openai: { icon: openaiIcon, name: "OpenAI", description: "Een krachtige AI voor algemene vragen." },
  deepseek: { icon: deepseekIcon, name: "DeepSeek", description: "AI-model gespecialiseerd in logische analyses." },
  sql: { icon: sqlIcon, name: "SQL", description: "Haal nauwkeurige data uit onze SQL-database." },
  claire: { icon: claireIcon, name: "Claire", description: "Chatbot met een uitgebreide vastgoedkennis." }
};

// Scrollfunctie
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// Kopieerfunctie voor berichten of tabellen
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
      }, 120000);
    })
    .catch(err => console.error("❌ Fout bij kopiëren:", err));
};

// Chat openen/sluiten
const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) showAgentSelection.value = false;
};

// Agent selectie toggle
const toggleAgentSelection = () => {
  showAgentSelection.value = !showAgentSelection.value;
};

// Agent selecteren
const selectAgent = (agentKey) => {
  selectedAgent.value = agentKey;
  showAgentSelection.value = false;
};

// Bericht verzenden en verwerken
const sendMessage = async () => {
  if (!message.value.trim()) return;

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
    let response = null;
    const tokenStore = useTokenStore();

    if (selectedAgent.value === "claire") {
      // Claire API
      if (!tokenStore.claireToken) {
        await tokenStore.fetchClaireToken();
      }
      if (!tokenStore.claireToken) {
        chatStore.addMessage("Er is een probleem met de authenticatie voor Claire. Probeer het later opnieuw.", "error");
        return;
      }

      response = await fetchClaireResponse(userMessage);
      if (response && response.response) {
        chatStore.addMessage(response.response, "bot", selectedAgent.value, response.followup);
      } else {
        chatStore.addMessage("Ik heb geen antwoord ontvangen van Claire.", "error");
      }
    } else {
      // Andere AI agents (OpenAI, DeepSeek, SQL)
      const token = await getAccessTokenSilently();
      if (!token) {
        chatStore.addMessage("Er is een probleem met de authenticatie. Probeer het later opnieuw.", "error");
        return;
      }

      response = await fetchProtectedData(token, userMessage, selectedAgent.value);

      if (response && response.answer) {
        // OpenAI / DeepSeek antwoord + follow-up vragen
        chatStore.addMessage(response.answer, "bot", selectedAgent.value, response.followup);
      } else if (response && response.data) {
        // SQL-response met data-tabel + follow-up
        chatStore.addMessage("", "sql", selectedAgent.value, response.followup, response.data);
      } else {
        chatStore.addMessage("Ik kan momenteel geen verbinding maken met de service, probeer het later opnieuw.", "error");
      }
    }
  } catch (error) {
    console.error("⚠️ Fout bij API-aanroep:", error);
    chatStore.addMessage("ImmoPilot heeft het even druk, probeer het later opnieuw.", "error");
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};


const formatMessage = (text, agent) => {
  // SQL mag NIET geformatteerd worden!
  if (agent === "sql") return text;

  let formattedText = text;

  // **Bold maken** → **tekst** wordt <strong>tekst</strong>
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // **Opsommingen**: "1. tekst" → "• tekst"
  formattedText = formattedText.replace(/\n\d+\.\s/g, "<br><br>• ");

  // **Verwijder dubbele bullets als ze per ongeluk ontstaan**
  formattedText = formattedText.replace(/•\s•/g, "• ");

  // **DeepSeek: `###` verwijderen en vervangen door een echte newline**
  if (agent === "deepseek") {
    formattedText = formattedText.replace(/###/g, "<br><br>");
  }

  return formattedText;
};

const sendFollowUp = (question) => {
  message.value = question;
  sendMessage();
};

</script>


<template>
  <div class="chat-wrapper">
    <!-- Chatbot-logo -->
    <div v-if="!isOpen" class="chat-logo" @click="toggleChat">
      <img :src="logoIcon" alt="ChatBot Logo" class="chat-logo-icon" />
    </div>

    <!-- Chatbox -->
    <div v-if="isOpen" class="chat-container">
      <!-- Header -->
      <div class="chat-header">
        <img :src="nameIcon" alt="ImmoPilot" class="chat-title" />
        <button class="close-button" @click="toggleChat">✖</button>
      </div>

      <!-- Chatberichten -->
      <div ref="chatContainer" class="chat-messages">
        <!-- Welkomstbericht -->
        <div class="message bot-message welcome-message">
          <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
          <span class="message-text">Hallo! Ik ben ImmoPilot! Selecteer je agent en stel me gerust je vraag.</span>
        </div>

        <!-- Dynamische berichten -->
        <div
          v-for="msg in chatStore.messages"
          :key="msg.id"
          class="message-container"
        >
          <div :class="['message', msg.type === 'user' ? 'user-message' : (msg.type === 'error' ? 'error-message' : 'bot-message')]">

            <!-- Bot- en gebruikersberichten -->
            <template v-if="msg.type === 'bot' || msg.type === 'user'">
              <img v-if="msg.type === 'bot'" src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
              <span class="message-text" v-html="formatMessage(msg.text, msg.agent)"></span>
            </template>

            <!-- Errorberichten -->
            <template v-else-if="msg.type === 'error'">
              <div class="error-message">
                <span class="message-text">{{ msg.text }}</span>
              </div>
            </template>

            <!-- SQL Response als tabel -->
            <template v-else-if="msg.type === 'sql'">
              <div class="sql-response">
                <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
                <div v-if="Array.isArray(msg.data) && msg.data.length > 0">
                  <table class="sql-table">
                    <thead>
                      <tr>
                        <th v-for="key in Object.keys(msg.data[0])" :key="key">{{ key }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in msg.data" :key="rowIndex">
                        <td v-for="(value, key) in row" :key="key">{{ value }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else>
                  Geen data beschikbaar.
                </div>
              </div>
            </template>

            <!-- Copy-knop (niet voor user messages) -->
            <button
              v-if="msg.type === 'bot' || msg.type === 'sql'"
              class="copy-button"
              @click="copyToClipboard(msg.type === 'sql' ? JSON.stringify(msg.data, null, 2) : msg.text, msg.id)"
            >
              <span v-if="copiedState[msg.id]" class="icon-checkmark"></span>
              <span v-else class="icon-copy"></span>
            </button>
          </div>

                    <!-- ✅ Follow-ups komen nu ALTIJD onder de berichten en zijn klikbaar -->
              <div v-if="msg.suggestions && msg.suggestions.length" class="followup-text">
                <br>
                <strong>Wil je meer weten?</strong>
                <p>
                  <span
                    v-for="(q, index) in msg.suggestions"
                    :key="index"
                    class="followup-question"
                    @click="sendFollowUp(q)"
                  >
                    <span class="followup-bullet">•</span> {{ q }}
                  </span>
                </p>
              </div>
        </div>

        <!-- Laadindicator -->
        <div v-if="isLoading" class="thinking-animation">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- Chatinvoer & agentselectie -->
      <div class="chat-input">
        <input v-model="message" placeholder="Typ hier je bericht..." class="input-text" />
        <button class="agent-selector" @click="toggleAgentSelection">
          <img :src="agents[selectedAgent].icon" alt="Agent Logo" class="agent-icon" />
        </button>
        <button class="send-button" @click="sendMessage" :disabled="isLoading">
          {{ isLoading ? "..." : "Send" }}
        </button>
      </div>

      <!-- AI Agent selectie -->
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
  border: 2px solid #124522;
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
  color: #3fbc68;
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
  flex-direction: column;
  align-items: flex-start;
  color: rgb(100, 100, 100);
  gap: 10px;
}

.bot-message {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  border: 1px solid #124522;
  width: 100%;
  padding: 8px 8px 8px 8px;
  background: white;
}
.welcome-message {
  padding-bottom: 15px;
}
.user-message {
  align-self: flex-end !important;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
  padding: 8px;
  word-break: break-word;
}

.error-message {
  background-color: #3fbc68;
  border: 1px solid white;
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
  display: block;
  margin: 0 auto 5px auto;
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
  border: 1px solid #124522;
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
  background-color: #3fbc68;
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
  border: 1px solid #124522;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  width: 95%;
  padding: 10px;
}

.agent-header {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #3fbc68;
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
  color: #3fbc68;
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

.followup-text {
  display: block;
  margin-top: 12px;
  padding: 2px 8px 14px 6px;
  border: 1px solid #5ff38e;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  font-style: italic;
  background: #f9f9f9;
  text-align: left;
  width: 100%;
}

.followup-question {
  cursor: pointer;
  color: #555;
  transition: color 0.2s;
  display:block;
}

.followup-question:hover {
  color: #5ff38e;
}

.followup-bullet {
  color: #5ff38e;
  font-weight: bold;
  margin-right: 5px;
}

.thinking-animation {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}

.thinking-dots {
  display: flex;
  gap: 5px;
}

.thinking-dots span {
  display: inline-block;
  width: 8px;
  height: 8px;
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
