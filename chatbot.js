// FreelanceChatbot.js - A simple vanilla JavaScript chatbot for freelancing websites

// Initialize the chatbot when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create necessary elements for the chatbot
    const chatbotContainer = document.createElement('div');
    chatbotContainer.className = 'freelance-chatbot-container';
    document.body.appendChild(chatbotContainer);

    // Initial chatbot state
    let isOpen = false;
    let messages = [];

    // Render the initial chatbot state
    renderChatbot();

    // Function to render the chatbot based on its state
    function renderChatbot() {
        chatbotContainer.innerHTML = '';

        if (!isOpen) {
            // Create collapsed chat bubble with message
            const bubbleContainer = document.createElement('div');
            bubbleContainer.className = 'bubble-container';

            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'welcome-bubble';
            welcomeMessage.textContent = 'Hi, I\'m FunEARN Assistant. Need help finding talent or work?';
            bubbleContainer.appendChild(welcomeMessage);

            const chatButton = document.createElement('button');
            chatButton.className = 'chat-button';
            chatButton.innerHTML = '<img src="ai.jpg" alt="Chat Icon" class="chat-icon">';
            chatButton.addEventListener('click', () => {
                isOpen = true;
                renderChatbot();
            });
            bubbleContainer.appendChild(chatButton);
            
            chatbotContainer.appendChild(bubbleContainer);
        } else {
            // Create expanded chat window
            const chatWindow = document.createElement('div');
            chatWindow.className = 'chat-window';

            // Chat header
            const chatHeader = document.createElement('div');
            chatHeader.className = 'chat-header';
            
            const chatTitle = document.createElement('h4');
            chatTitle.textContent = 'Freelance Assistant';
            chatHeader.appendChild(chatTitle);

            const closeButton = document.createElement('button');
            closeButton.className = 'close-button';
            closeButton.textContent = '✕';
            closeButton.addEventListener('click', () => {
                isOpen = false;
                renderChatbot();
            });
            chatHeader.appendChild(closeButton);
            
            chatWindow.appendChild(chatHeader);

            // Chat messages area
            const messagesContainer = document.createElement('div');
            messagesContainer.className = 'messages-container';
            
            // Add welcome message if no messages exist
            if (messages.length === 0) {
                const welcomeMsg = {
                    sender: 'bot',
                    text: 'Hello! I can help you find the perfect freelancer for your project. What kind of service are you looking for?'
                };
                messages.push(welcomeMsg);
            }
            
            // Render all messages
            messages.forEach(msg => {
                const messageElement = document.createElement('div');
                messageElement.className = msg.sender === 'user' ? 'user-message' : 'bot-message';
                
                const messageText = document.createElement('span');
                messageText.className = 'message-text';
                messageText.textContent = msg.text;
                messageElement.appendChild(messageText);
                
                messagesContainer.appendChild(messageElement);
            });
            
            chatWindow.appendChild(messagesContainer);

            // Input area
            const inputContainer = document.createElement('div');
            inputContainer.className = 'input-container';
            
            const messageInput = document.createElement('input');
            messageInput.type = 'text';
            messageInput.className = 'message-input';
            messageInput.placeholder = 'Type your message...';
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
            inputContainer.appendChild(messageInput);
            
            const sendButton = document.createElement('button');
            sendButton.className = 'send-button';
            sendButton.textContent = 'Send';
            sendButton.addEventListener('click', () => {
                handleSendMessage(messageInput.value);
                messageInput.value = '';
            });
            inputContainer.appendChild(sendButton);
            
            chatWindow.appendChild(inputContainer);
            
            chatbotContainer.appendChild(chatWindow);
            
            // Auto-scroll to the bottom of the messages
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Focus on input
            messageInput.focus();
        }
    }

    // Function to handle sending a message
    function handleSendMessage(text) {
        if (!text.trim()) return;

        // Add user message
        const userMessage = { sender: 'user', text: text };
        messages.push(userMessage);

        // Generate bot response
        setTimeout(() => {
            const botResponse = generateResponse(text.toLowerCase());
            messages.push({ sender: 'bot', text: botResponse });
            renderChatbot();
        }, 500); // Small delay to simulate thinking

        renderChatbot();
    }

    // Simple response generation based on keywords
    function generateResponse(text) {
        // Default response if no keywords match
        let response = "I'm not sure I understand. Could you provide more details about what you're looking for?";

        // Check for keywords and provide appropriate responses
        if (text.includes('developer') || text.includes('web') || text.includes('coding')) {
            response = "We have many talented developers available! Are you looking for front-end, back-end, or full-stack developers?";
        } else if (text.includes('design') || text.includes('logo') || text.includes('graphic')) {
            response = "Our designers create stunning visuals! Would you like to see some portfolios from our top graphic designers?";
        } else if (text.includes('writing') || text.includes('content') || text.includes('blog')) {
            response = "Our content writers can help boost your SEO and engage your audience. What type of content are you looking to create?";
        } else if (text.includes('price') || text.includes('cost') || text.includes('rate')) {
            response = "Freelancer rates vary based on experience and project complexity. Would you like me to help you find freelancers within your budget?";
        } else if (text.includes('timeline') || text.includes('deadline') || text.includes('urgent')) {
            response = "We understand tight deadlines! Many of our freelancers can accommodate rush projects. When do you need this completed by?";
        } else if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
            response = "Hi there! I'm the Freelance Assistant. How can I help you find the perfect talent today?";
        } else if (text.includes('thank') || text.includes('thanks')) {
            response = "You're welcome! Is there anything else I can help you with?";
        }

        return response;
    }
});

// CSS Styles for the chatbot
const styles = `
.freelance-chatbot-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    font-family: Arial, sans-serif;
    z-index: 1000;
}

.bubble-container {
    position: relative;
}

.welcome-bubble {
    position: absolute;
    bottom: 60px;
    right: 0;
    background: #2c5cc5;
    color: white;
    padding: 10px 15px;
    border-radius: 15px 15px 0 15px;
    font-size: 14px;
    box-shadow: 0 4px 7px rgba(0,0,0,0.2);
    white-space: nowrap;
    animation: fadeIn 0.5s;
}

.chat-button {
    background: #ffffff;
    border: 2px solid #2c5cc5;
    border-radius: 50%;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    width: 60px;
    height: 60px;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.chat-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 10px rgba(0,0,0,0.3);
}

.chat-icon {
    width: 35px;
    height: 35px;
    border-radius: 50%;
}

.chat-window {
    width: 320px;
    border: 1px solid #e0e0e0;
    border-radius: 15px;
    overflow: hidden;
    background: #f9f9f9;
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s;
}

.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background: #2c5cc5;
    color: white;
}

.chat-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}

.close-button {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
}

.messages-container {
    height: 300px;
    overflow-y: auto;
    padding: 15px;
    background: white;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.user-message, .bot-message {
    display: flex;
    margin: 5px 0;
}

.user-message {
    justify-content: flex-end;
}

.bot-message {
    justify-content: flex-start;
}

.message-text {
    padding: 10px 12px;
    border-radius: 18px;
    max-width: 80%;
    word-wrap: break-word;
    font-size: 14px;
    line-height: 1.4;
}

.user-message .message-text {
    background: #2c5cc5;
    color: white;
    border-radius: 18px 18px 0 18px;
}

.bot-message .message-text {
    background: #f0f2f5;
    color: #333;
    border-radius: 18px 18px 18px 0;
}

.input-container {
    display: flex;
    padding: 10px;
    background: #f0f2f5;
    border-top: 1px solid #e0e0e0;
}

.message-input {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    outline: none;
    font-size: 14px;
}

.message-input:focus {
    border-color: #2c5cc5;
}

.send-button {
    margin-left: 10px;
    padding: 8px 15px;
    background: #2c5cc5;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}

.send-button:hover {
    background: #1f4998;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
`;

// Add styles to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);