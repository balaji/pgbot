'use client';

import { useState } from 'react';
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';

type Message = {
  content: string;
  role: string;
  sources?: {
    title: string;
    url: string;
  }[];
}

export default function Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const onTextnput = async () => {
    const question = input;
    if (question === '') {
      return;
    }
    setInput('');
    setMessages(currentMessages => [
      ...currentMessages,
      { role: "user", content: input },
    ]);

    setLoading(true);
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: messages,
        input: question,
      }),
    });
    setLoading(false);
    const { answer } = await response.json();
    setMessages((currentMessages) => [...currentMessages, answer]);
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      <ChatMessageList>
        {messages.map((message, index) => {
          if (message.role === "user") {
            return (
              <ChatBubble key={index} variant='sent'>
                <ChatBubbleAvatar fallback='👤' />
                <ChatBubbleMessage variant='sent'>
                  {message.content}
                </ChatBubbleMessage>
              </ChatBubble>
            );
          } else if (message.role === "system") {
            return (
              <div key={index}>
                <ChatBubble variant='received'>
                  <ChatBubbleAvatar fallback='🤖' />
                  <ChatBubbleMessage variant='received'>
                    {message.content}
                  </ChatBubbleMessage>
                </ChatBubble>
                {message.sources && message.sources.length > 0 && (
                  <div className="ml-12">
                    {message.sources.map((source, index) => (
                      <div key={index} className="text-sm text-gray-500">
                        <a href={source.url} target="_blank">
                          {source.title} - ({source.url})
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        }
        )}
        <ChatBubble variant='received' className={loading ? '' : 'hidden'}>
          <ChatBubbleAvatar fallback='🤖' />
          <ChatBubbleMessage isLoading />
        </ChatBubble>
      </ChatMessageList>
      <Textarea
        value={input}
        onChange={event => {
          setInput(event.target.value);
        }}
        onKeyUp={async event => {
          if (event.key === 'Enter') {
            await onTextnput();
          }
        }}
      />
      <Button variant="outline" onClick={onTextnput}>Ask</Button>
    </div>
  );
}