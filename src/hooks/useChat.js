import { useState, useEffect } from 'react';
import { sendGeminiMessage } from '../services/ai';

export const useChat = (initialMessages = []) => {
    const [messages, setMessages] = useState(() => {
        if (initialMessages.length > 0) return initialMessages;
        return [{
            id: 'welcome',
            role: 'model',
            text: 'Shalom! What kind of text sheet do you want to create together?',
            suggestedSources: []
        }];
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('chevruta_messages', JSON.stringify(messages));
    }, [messages]);

    const sendMessageToGemini = async (userText, sheetTitle, setSheetTitle) => {
        setIsLoading(true);
        try {
            const data = await sendGeminiMessage(userText, messages);

            // Handle suggested_title if provided and sheet is untitled
            if (data.suggested_title && sheetTitle === 'New Source Sheet' && setSheetTitle) {
                setSheetTitle(data.suggested_title);
            }

            const botMessage = {
                id: Date.now().toString(),
                role: 'model',
                text: data.content || data.text || '',
                suggestedSources: data.suggested_sources || []
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "I'm having trouble connecting to the Beit Midrash right now. Please try again.",
                suggestedSources: []
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = (text, sheetTitle, setSheetTitle) => {
        const userMsg = { id: Date.now().toString(), role: 'user', text: text };
        setMessages(prev => [...prev, userMsg]);
        sendMessageToGemini(text, sheetTitle, setSheetTitle);
    };

    return {
        messages,
        setMessages,
        isLoading,
        handleSendMessage
    };
};
