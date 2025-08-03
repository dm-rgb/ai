/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";

interface Message {
    text: string;
    sender: 'user' | 'ai';
    imageUrl?: string;
}

const App: React.FC = () => {
    const [messages, setMessages] = React.useState<Message[]>([
        { 
            text: "Hello! I am Kohli AI, your smart and friendly assistant for everything related to industrial spindle technology. How can I assist you today?", 
            sender: 'ai' 
        }
    ]);
    const [input, setInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const chatWindowRef = React.useRef<HTMLDivElement>(null);
    
    const ai = React.useRef(new GoogleGenAI({ apiKey: process.env.API_KEY }));
    const chat = React.useRef<Chat | null>(null);

    React.useEffect(() => {
        if (!chat.current) {
            chat.current = ai.current.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are Kohli AI, a helpful assistant specializing in industrial spindle technology. You are smart, friendly, and professional. Never mention you are an AI model. Only answer questions related to industrial machinery, spindles, manufacturing, and related technologies. If asked about something else, politely decline and steer the conversation back to your area of expertise.",
                }
            });
        }
    }, []);

    React.useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { text: input, sender: 'user' as const };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const lowercasedInput = currentInput.toLowerCase();
            const imageCommand = 'generate image of ';
            const imageCommandAlt = 'generate an image of ';
            let prompt = '';

            if (lowercasedInput.startsWith(imageCommand)) {
                prompt = currentInput.substring(imageCommand.length);
            } else if (lowercasedInput.startsWith(imageCommandAlt)) {
                prompt = currentInput.substring(imageCommandAlt.length);
            }

            if (prompt) {
                const response = await ai.current.models.generateImages({
                    model: 'imagen-3.0-generate-002',
                    prompt: `A high-quality, detailed image of ${prompt} in an industrial setting.`,
                    config: { numberOfImages: 1, outputMimeType: 'image/png' },
                });

                const base64ImageBytes = response.generatedImages[0].image.imageBytes;
                const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
                const aiMessage: Message = { 
                    text: `Here is the image of "${prompt}" you requested.`, 
                    sender: 'ai', 
                    imageUrl: imageUrl 
                };
                setMessages(prev => [...prev, aiMessage]);

            } else {
                if (!chat.current) throw new Error("Chat not initialized.");
                
                const stream = await chat.current.sendMessageStream({ message: currentInput });
                
                setMessages(prev => [...prev, { text: '', sender: 'ai' }]);

                let fullResponse = "";
                for await (const chunk of stream) {
                    fullResponse += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].text = fullResponse;
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error("AI Error:", error);
            const errorMessage: Message = { text: "Sorry, I encountered an error. Please try again.", sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="app-container">
            <header className="header">
                <h1>Kohli AI</h1>
                <p>Industrial Spindle Technology Assistant</p>
            </header>
            <main className="chat-window" ref={chatWindowRef}>
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.text && <p>{msg.text}</p>}
                        {msg.imageUrl && (
                             <div className="generated-image-container">
                                <img src={msg.imageUrl} alt={msg.text} className="generated-image" />
                            </div>
                        )}
                        {msg.sender === 'ai' && (
                            <span className="signature">
                                — Powered by Kohli AI
                            </span>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="loading-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                    </div>
                )}
            </main>
            <form className="input-form" onSubmit={handleSendMessage}>
                <input
                    type="text"
                    className="input-field"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about spindles or 'generate image of...'"
                    aria-label="Your message"
                    disabled={isLoading}
                />
                <button type="submit" className="send-button" disabled={isLoading || !input.trim()} aria-label="Send message">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 7z"/>
                    </svg>
                </button>
            </form>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
