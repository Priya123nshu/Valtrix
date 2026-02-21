const API_BASE = '/api';
let currentAgent = null;

// DOM Elements
const agentListEl = document.getElementById('agentList');
const chatMessagesEl = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatHeader = document.getElementById('chatHeader');
const createModal = document.getElementById('createModal');

// --- Initialization ---

async function init() {
    await fetchAgents();
    lucide.createIcons();
}

// --- API Calls ---

async function fetchAgents() {
    try {
        const res = await fetch(`${API_BASE}/agents`);
        const agents = await res.json();
        renderAgents(agents);
    } catch (err) {
        console.error("Failed to fetch agents:", err);
        agentListEl.innerHTML = '<div style="padding:20px; color:red">NETWORK ERROR</div>';
    }
}

async function createAgent(e) {
    e.preventDefault();
    const name = document.getElementById('agentName').value;
    const description = document.getElementById('agentDesc').value;
    const role = document.getElementById('agentRole').value;

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "DEPLOYING...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, role })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Creation failed");
        }

        await fetchAgents();
        closeModal();
        e.target.reset();
    } catch (err) {
        alert("Failed to create agent: " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentAgent) return;

    // Add User Message
    addMessage('user', text);
    messageInput.value = '';

    // Loading State
    const loadingId = addLoadingMessage();

    try {
        // Construct JSON-RPC payload manually as per A2A spec
        const payload = {
            jsonrpc: "2.0",
            id: Math.random().toString(36).substring(7),
            method: "tasks/send",
            params: {
                id: Math.random().toString(36).substring(7),
                sessionId: null,
                message: {
                    role: "user",
                    parts: [{ text }],
                    timestamp: new Date().toISOString()
                }
            }
        };

        // We send request DIRECTLY to the agent URL (e.g. localhost:8001)
        // Note: In production, browser might block mixed content if not proxied.
        // Ideally frontend_server should proxy this to avoid CORS if agents are on different ports.
        // For now, we assume agents allow CORS (which we set in server.py).

        const res = await fetch(currentAgent.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        removeMessage(loadingId);

        if (data.result) {
            const history = data.result.history;
            const lastMsg = history[history.length - 1];
            if (lastMsg && lastMsg.parts) {
                addMessage('agent', lastMsg.parts[0].text);
            }
        } else if (data.error) {
            addMessage('agent', `[SYSTEM ERROR]: ${data.error.message || JSON.stringify(data.error)}`);
        }
    } catch (err) {
        removeMessage(loadingId);
        addMessage('agent', `[CONNECTION FAILED]: ${err.message}`);
    }
}

// --- UI Rendering ---

function renderAgents(agents) {
    agentListEl.innerHTML = '';

    if (agents.length === 0) {
        agentListEl.innerHTML = '<div style="padding:20px; opacity:0.5; font-size:0.8rem">NO ACTIVE UNITS FOUND</div>';
        return;
    }

    agents.forEach(agent => {
        const card = document.createElement('div');
        card.className = `agent-card ${currentAgent && currentAgent.url === agent.url ? 'active' : ''}`;
        card.onclick = () => selectAgent(agent);
        card.innerHTML = `
            <div class="agent-name">${agent.name}</div>
            <div class="agent-desc">${agent.description}</div>
        `;
        agentListEl.appendChild(card);
    });
}

function selectAgent(agent) {
    currentAgent = agent;

    // Update UI
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('active'));
    // Find the one we clicked (simpler re-render)
    renderAgents(Array.from(document.querySelectorAll('.agent-card')).map((el, i) => {
        // This is a hacky way to re-highlight without storing full state, 
        // essentially re-fetching would be cleaner but this involves less network.
        // Let's just re-fetch to be safe and simple.
        return agent;
    }));
    // Actually, let's just re-fetch to keep class logic simple in renderAgents
    fetchAgents();

    // Enable Input
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.placeholder = `Commanding ${agent.name}...`;

    // Update Header
    chatHeader.innerHTML = `
        <div>
            <h2>${agent.name}</h2>
            <span style="font-size:0.7rem; color:var(--primary)">ONLINE // ${agent.url}</span>
        </div>
    `;

    // Clear Chat
    chatMessagesEl.innerHTML = `
        <div class="message agent">
            [SYSTEM]: Connection established with ${agent.name}. 
            <br>
            Capability: ${agent.description}
        </div>
    `;
}

function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.innerHTML = text.replace(/\n/g, '<br>');
    chatMessagesEl.appendChild(msg);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function addLoadingMessage() {
    const id = 'loading-' + Date.now();
    const msg = document.createElement('div');
    msg.id = id;
    msg.className = 'message agent';
    msg.innerText = 'Analyzing...';
    chatMessagesEl.appendChild(msg);
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- Modal Logic ---

function openModal() {
    createModal.style.display = 'flex';
}

function closeModal() {
    createModal.style.display = 'none';
}

// --- Event Listeners ---

document.getElementById('createAgentForm').addEventListener('submit', createAgent);

sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            // Shift+Enter: Allow default (newline)
            return;
        } else {
            // Enter only: Send message
            e.preventDefault();
            sendMessage();
        }
    }
});

// Close modal on outside click
createModal.addEventListener('click', (e) => {
    if (e.target === createModal) closeModal();
});

// Start
init();
