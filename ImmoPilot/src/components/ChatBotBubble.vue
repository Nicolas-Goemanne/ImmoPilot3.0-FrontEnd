<script setup>
import { ref, onMounted } from "vue";
import { useAuth0 } from "@auth0/auth0-vue";
import { useChatStore } from "@/stores/chatStore";
import { fetchProtectedData } from "@/services/apiService";

// Import PNG files met ?url
import openaiIcon from "/openai.PNG?url";
import deepseekIcon from "/deepseek1.PNG?url";
import sqlIcon from "/sql.PNG?url";
import claireIcon from "/claire.PNG?url";
import logoIcon from "/logosoftedge.png?url";
import nameIcon from "/name.PNG?url";

const { getAccessTokenSilently, isAuthenticated } = useAuth0();
const chatStore = useChatStore();
const message = ref("");
const isOpen = ref(false);
const showAgentSelection = ref(false);
const selectedAgent = ref("openai");
const isLoading = ref(false);

// ✅ Agent-instellingen
const agents = {
  openai: { icon: openaiIcon, name: "OpenAI", description: "Een krachtige AI voor algemene vragen en diepgaande antwoorden." },
  deepseek: { icon: deepseekIcon, name: "DeepSeek", description: "AI-model gespecialiseerd in redeneren en logische analyses." },
  sql: { icon: sqlIcon, name: "SQL", description: "Haal nauwkeurige data uit onze SQL-database met AI-gestuurde queries." },
  claire: { icon: claireIcon, name: "Claire", description: "Onze eigen chatbot met specifieke kennis over vastgoed en administratie." }
};

// ✅ Token ophalen
const getToken = async () => {
  try {
    return await getAccessTokenSilently();
  } catch (error) {
    console.error("Fout bij ophalen access token:", error);
    return null;
  }
};

// ✅ API-aanroep met token
const sendMessage = async () => {
  if (!message.value.trim()) return;

  isLoading.value = true;
  chatStore.addMessage(message.value, "user");

  try {
    const token = await getToken();
    if (!token) {
      console.error("Geen geldig access token");
      return;
    }

    const response = await fetchProtectedData(token, message.value, selectedAgent.value);

    if (response) {
      if (response.answer) {
        chatStore.addMessage(response.answer, "bot");
      } else if (response.data) {
        const filteredData = filterColumns(response.data);

        // ✅ **Check hoeveel tabellen er zijn**
        const tabelNamen = new Set(filteredData.map(row => row.TabelNaam || "Onbekende tabel"));
        const aantalTabellen = tabelNamen.size;

        if (aantalTabellen > 5) {
          // 🛑 Vraag om te verfijnen als er meer dan 5 tabellen zijn
          const tabelLijst = Array.from(tabelNamen).join(", ");
          chatStore.addMessage(
            `⚠️ Er zijn ${aantalTabellen} tabellen in de resultaten. Wil je een specifieke tabel bekijken? Beschikbare opties: ${tabelLijst}.`,
            "bot"
          );
          return;
        }

        // 🚀 **Toon de data als het aantal tabellen OK is**
        chatStore.addMessage(filteredData, "sql");
      }
    }

    message.value = "";
  } catch (error) {
    console.error("Fout bij API-aanroep:", error);
    chatStore.addMessage("Fout bij ophalen van antwoord", "bot");
  } finally {
    isLoading.value = false;
  }
};



// ✅ Chat openen/sluiten
const toggleChat = () => {
  isOpen.value = !isOpen.value;
  showAgentSelection.value = false;
};

const toggleAgentSelection = () => {
  showAgentSelection.value = !showAgentSelection.value;
};

const selectAgent = (agent) => {
  selectedAgent.value = agent;
  showAgentSelection.value = false;
};

// ✅ Functie om onnodige kolommen te filteren
const filterColumns = (data) => {
  if (!data || !Array.isArray(data)) return [];

  return data.map(row => {
    const filteredRow = {};
    Object.keys(row).forEach(key => {
      if (typeof row[key] !== "object" && row[key] !== null) {
        filteredRow[key] = row[key]; // ✅ Alleen platte waarden behouden (geen nested objecten)
      }
    });
    return filteredRow;
  });
};
</script>

<template>
  <div class="chat-wrapper">
    <!-- 🔘 Clickable logo als popup-button -->
    <div v-if="!isOpen" class="chat-logo" @click="toggleChat">
      <img :src="logoIcon" alt="ChatBot Logo" class="chat-logo-icon" />
    </div>

    <!-- 💬 De chatbox -->
    <div v-if="isOpen" class="chat-container">
      <div class="chat-header">
        <img :src="nameIcon" alt="ImmoPilot" class="chat-title" />
        <button class="close-button" @click="toggleChat">✖</button>
      </div>

      <!-- 🔹 Chat Messages -->
      <div ref="chatContainer" class="chat-messages">
        <!-- Welcome Message als bot-bericht -->
        <div class="message bot-message">
          <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
          <span class="message-text">Hallo! Ik ben ImmoPilot! Selecteer eerst jouw agent en stel gerust je vraag.</span>
        </div>

        <!-- Dynamische berichten -->
        <div v-for="msg in chatStore.messages" :key="msg.id" 
             :class="['message', msg.type === 'user' ? 'user-message' : 'bot-message']">
          
          <!-- Botbericht met logo -->
          <template v-if="msg.type === 'bot'">
            <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
            <span class="message-text">{{ msg.text }}</span>
          </template>

         <!-- SQL Response als tabel -->
<template v-else-if="msg.type === 'sql'">
  <div class="bot-message">
    <img src="/logosoftedge.png" alt="Bot Logo" class="bot-avatar" />
    <div class="sql-response">
      <table class="sql-table">
        <thead>
          <tr>
            <th v-for="(value, key) in filterColumns(msg.text)[0]" :key="key">{{ key }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in filterColumns(msg.text).slice(0, 10)" :key="index">
            <td v-for="(value, key) in row" :key="key" :title="value">{{ value }}</td> 
          </tr>
        </tbody>
      </table>

      <!-- ✅ "Toon meer resultaten"-knop alleen als er meer dan 10 resultaten zijn -->
      <button v-if="filterColumns(msg.text).length > 10" 
              class="show-more-btn" 
              @click="toonMeerResultaten(msg.text)">
        Toon meer resultaten
      </button>
    </div>
  </div>
</template>

          <!-- Userbericht zonder avatar -->
          <template v-else>
            <span class="message-text">{{ msg.text }}</span>
          </template>
        </div>

        <!-- 🔄 Loading Indicator aangepast -->
        <div v-if="isLoading" class="thinking">ImmoPilot is thinking...</div>
      </div>

      <!-- 🔹 Chat Input & Agent selectie -->
      <div class="chat-input">
        <input v-model="message" placeholder="Typ hier je bericht..." class="input-text" />
        <button class="agent-selector" @click="toggleAgentSelection">
          <img :src="agents[selectedAgent].icon" alt="Agent Logo" class="agent-icon" />
        </button>
        <button class="send-button" @click="sendMessage" :disabled="isLoading">
          {{ isLoading ? "..." : "Send" }}
        </button>
      </div>

      <!-- 🔹 Agent Selectie -->
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
/* Wrapper voor de chat */
.chat-wrapper {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

/* 🔘 Clickable Chat Logo */
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

/* 💬 Chatbox Styling */
.chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 500px;
  height: 65vh;
  max-height: 75vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  border: 2px solid #5ff38e;
}

/* Header */
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
  color:#5ff38e;
  position: absolute;
  right: 10px;
}

/* 🔹 Chat Messages container */
.chat-messages {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px; 
}

/* ✅ Algemene opmaak voor berichten */
.message {
  max-width: 100%;
  padding: 10px;
  font-size: 16px;
  font-weight: 500;
  color: rgb(100, 100, 100);
  word-wrap: break-word;
  display: flex;
  align-items: center;
}

/* ✅ Welcome Message (nu zelfde als bot message) */
.welcome-message {
  max-width: 100%;
  padding: 10px;
  font-size: 16px;
  font-weight: 500;
  color: rgb(100, 100, 100);
  word-wrap: break-word;
  display: flex;
  align-items: center;
}

/* ✅ Botberichten met logo (LINKS) */

.bot-message {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  border: 1px solid #d1d1d1;
  width: 100%;
  padding: 10px;
  background: white;
}
/* ✅ User-berichten (RECHTS) */
.user-message {
  align-self: flex-end !important;
  text-align: right !important;
  padding: 10px;
}

.bot-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.message-text {
  display: inline-block;
  vertical-align: middle;
}

.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ddd;
  align-items: center;
}

.input-text {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid  #216e39;
  ;
  font-size: 14px;
}

.agent-selector {
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 10px;
  margin-left: 10px;
}

.agent-icon {
  width: 30px;
  height: 30px;
  margin-right: 5px;
}

.send-button {
  background-color: #5ff38e;
  border: none;
  color: white;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

/* 🔹 Agent Selectie met uitleg */
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

/* ✅ Agent naam donker groen */
.agent-name {
  color:#5ff38e;
  font-weight: bold;
}

.sql-response {
  background: white;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d1d1d1;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: 250px;
}

.sql-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  word-wrap: break-word;
}

.sql-table th, .sql-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ✅ Toon volledige tekst bij hover */
.sql-table td:hover {
  overflow: visible;
  white-space: normal;
  word-wrap: break-word;
  z-index: 10;
  position: relative;
  background: #f4f4f4;
}

.thinking {
  font-style: italic;
  color: #5ff38e;
  text-align: center;
  margin-top: 10px;
}

/* ✅ Stijl voor de "Toon meer resultaten"-knop */
.show-more-btn {
  margin-top: 10px;
  padding: 8px 12px;
  border: none;
  background-color: #5ff38e;
  color: white;
  font-size: 14px;
  border-radius: 5px;
  cursor: pointer;
  display: block;
  width: 100%;
  text-align: center;
}

.show-more-btn:hover {
  background-color: #4dd678;
}
</style>