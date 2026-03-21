import { useState, useEffect, useRef } from 'react';
import type { ProjectDetail, AgentRole, Message, Conversation } from '../../types';
import { AGENT_ROLE_META, PHASE_META } from '../../types';
import { api } from '../../lib/api';
import { MessageSquare, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  project: ProjectDetail;
}

export function ConversationView({ project }: Props) {
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(
    project.conversations[0] || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConvo) {
      loadMessages(selectedConvo.id);
    }
  }, [selectedConvo?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages(convoId: string) {
    setLoadingMessages(true);
    try {
      const msgs = await api.getConversationMessages(project.id, convoId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }

  if (project.conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div>
          <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No conversations yet</h3>
          <p className="text-sm text-zinc-500">Agent conversations will appear here once the project starts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-72 border-r border-zinc-800 overflow-auto">
        <div className="p-3">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 px-2">
            Conversations ({project.conversations.length})
          </h3>
          {project.conversations.map((convo) => {
            const phaseMeta = PHASE_META[convo.phase as keyof typeof PHASE_META];
            return (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                  selectedConvo?.id === convo.id
                    ? 'bg-zinc-800 border border-zinc-700'
                    : 'hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {convo.status === 'resolved' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium text-white truncate">{convo.title}</span>
                </div>
                {phaseMeta && (
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1 ml-5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phaseMeta.color }} />
                    {phaseMeta.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {messages.map((msg) => {
              const roleMeta = AGENT_ROLE_META[msg.agentRole as AgentRole];
              const typeColors: Record<string, string> = {
                discussion: 'border-zinc-700',
                decision: 'border-blue-500/30',
                question: 'border-amber-500/30',
                answer: 'border-emerald-500/30',
                task_update: 'border-purple-500/30',
                review: 'border-cyan-500/30',
                approval: 'border-emerald-500/30',
              };

              return (
                <div
                  key={msg.id}
                  className={`rounded-lg border bg-zinc-900 p-4 ${typeColors[msg.messageType] || 'border-zinc-800'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{roleMeta?.emoji || '🤖'}</span>
                    <span className="text-sm font-medium text-white">{roleMeta?.name || msg.agentRole}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 capitalize">
                      {msg.messageType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-zinc-600 ml-auto">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed prose-sm">
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
