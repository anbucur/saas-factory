/**
 * AgentChat - Team communication view
 */

import { useState, useEffect, useRef } from 'react'
import { useMissionControlStore } from '../store/missionControlStore'

interface Message {
  id: string
  agentId: string
  agentName: string
  agentEmoji: string
  agentColor: string
  message: string
  timestamp: number
  type: 'message' | 'task' | 'status'
}

// Demo messages
const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    agentId: 'pm',
    agentName: 'Product Manager',
    agentEmoji: '👔',
    agentColor: '#6366f1',
    message: 'Team, we have a new project! Family Blog with AI cover images. Let me brief you all on the requirements.',
    timestamp: Date.now() - 300000,
    type: 'message',
  },
  {
    id: '2',
    agentId: 'ba1',
    agentName: 'BA Sarah',
    agentEmoji: '📋',
    agentColor: '#8b5cf6',
    message: 'I\'ve documented the requirements. Key features: blog posts, AI image generation, comments, sharing.',
    timestamp: Date.now() - 280000,
    type: 'message',
  },
  {
    id: '3',
    agentId: 'architect',
    agentName: 'Solutions Architect',
    agentEmoji: '🏗️',
    agentColor: '#14b8a6',
    message: 'Tech stack approved: React + Node.js + PostgreSQL + OpenAI for image generation.',
    timestamp: Date.now() - 250000,
    type: 'message',
  },
  {
    id: '4',
    agentId: 'dev1',
    agentName: 'Dev Alex',
    agentEmoji: '💻',
    agentColor: '#22c55e',
    message: 'Task completed: User authentication system with JWT',
    timestamp: Date.now() - 200000,
    type: 'task',
  },
  {
    id: '5',
    agentId: 'dev2',
    agentName: 'Dev Jordan',
    agentEmoji: '💻',
    agentColor: '#22c55e',
    message: 'Task completed: Blog post CRUD API endpoints',
    timestamp: Date.now() - 180000,
    type: 'task',
  },
  {
    id: '6',
    agentId: 'qa1',
    agentName: 'QA Tester',
    agentEmoji: '🧪',
    agentColor: '#f59e0b',
    message: 'Bug found: Image upload fails for files > 5MB. Assigned to Dev Alex.',
    timestamp: Date.now() - 150000,
    type: 'status',
  },
  {
    id: '7',
    agentId: 'dev1',
    agentName: 'Dev Alex',
    agentEmoji: '💻',
    agentColor: '#22c55e',
    message: 'Fixed the image upload issue. Ready for re-testing.',
    timestamp: Date.now() - 120000,
    type: 'message',
  },
]

export function AgentChat() {
  const { agents } = useMissionControlStore()
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim()) return
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      agentId: 'user',
      agentName: 'You',
      agentEmoji: '👤',
      agentColor: '#6366f1',
      message: newMessage,
      timestamp: Date.now(),
      type: 'message',
    }
    
    setMessages([...messages, userMessage])
    setNewMessage('')

    // Simulate agent responses
    setTimeout(() => {
      const responses = [
        { agentId: 'dev1', name: 'Dev Alex', emoji: '💻', color: '#22c55e', message: 'Got it! I\'ll start working on that feature.' },
        { agentId: 'ba1', name: 'BA Sarah', emoji: '📋', color: '#8b5cf6', message: 'I\'ve updated the requirements document with those details.' },
        { agentId: 'architect', name: 'Solutions Architect', emoji: '🏗️', color: '#14b8a6', message: 'The architecture looks solid. Let\'s proceed with the implementation.' },
        { agentId: 'qa1', name: 'QA Tester', emoji: '🧪', color: '#f59e0b', message: 'I\'ll add this to the test plan.' },
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        agentId: randomResponse.agentId,
        agentName: randomResponse.name,
        agentEmoji: randomResponse.emoji,
        agentColor: randomResponse.color,
        message: randomResponse.message,
        timestamp: Date.now(),
        type: 'message',
      }])
    }, 1000)
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div 
            key={msg.id}
            className={`
              flex gap-3
              ${msg.agentId === 'user' ? 'flex-row-reverse' : ''}
            `}
          >
            {/* Avatar */}
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
              style={{ backgroundColor: `${msg.agentColor}20`, color: msg.agentColor }}
            >
              {msg.agentEmoji}
            </div>
            
            {/* Message bubble */}
            <div className={`
              max-w-[70%] rounded-lg px-3 py-2
              ${msg.agentId === 'user' 
                ? 'bg-indigo-600 text-white' 
                : msg.type === 'task' 
                  ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                  : msg.type === 'status'
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                    : 'bg-zinc-800 text-zinc-200'
              }
            `}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">{msg.agentName}</span>
                <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-sm">{msg.message}</p>
              
              {/* Task indicator */}
              {msg.type === 'task' && (
                <div className="mt-1 flex items-center gap-1 text-xs opacity-75">
                  <span>✓</span>
                  <span>Task Completed</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message to the team..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="flex gap-2 mt-3">
          <button 
            onClick={() => setNewMessage('What\'s the current status?')}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            📊 Status?
          </button>
          <button 
            onClick={() => setNewMessage('Any blockers')}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            Blockers
          </button>
          <button 
            onClick={() => setNewMessage('Good progress team!')}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            👏 Praise
          </button>
        </div>
      </div>
    </div>
  )
}
