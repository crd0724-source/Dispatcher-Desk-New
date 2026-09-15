import React, { useState, useRef, useEffect } from 'react';
import { Conversation, ConversationMessage, MessageType } from '../../communication/types.ts';
import { DriverAssignedLoad } from '../DriverPortalView.tsx';
import {
  Send,
  Mic,
  CheckCheck,
  Clock,
  ArrowLeft,
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  CheckCircle,
  Truck,
  RotateCcw,
  Check,
  ShieldAlert,
  MapPin,
  RefreshCw,
  Info,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge.tsx';

interface DriverMessageThreadProps {
  conversation: Conversation;
  messages: ConversationMessage[];
  isLoadingMessages: boolean;
  loadContext?: DriverAssignedLoad | null;
  onSendMessage: (content: string, messageType: MessageType, context?: Record<string, any>) => Promise<void>;
  onAcknowledgeMessage: (messageId: string) => Promise<void>;
  onReopenConversation: () => Promise<void>;
  onBackToList?: () => void;
  currentUserId?: string | null;
  isSending: boolean;
}

export const DriverMessageThread: React.FC<DriverMessageThreadProps> = ({
  conversation,
  messages,
  isLoadingMessages,
  loadContext,
  onSendMessage,
  onAcknowledgeMessage,
  onReopenConversation,
  onBackToList,
  currentUserId,
  isSending,
}) => {
  const [draftText, setDraftText] = useState('');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<MessageType>('text');
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const hasText = draftText.trim().length > 0;
  const isResolved = conversation.status === 'resolved';

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftText.trim() || isSending || isResolved) return;

    const textToSend = draftText.trim();
    const typeToSend = selectedType;

    const contextPayload: Record<string, any> = {};
    if (loadContext) {
      contextPayload.load_id = loadContext.id;
      contextPayload.load_number = loadContext.load_number;
      contextPayload.origin = `${loadContext.origin_city || ''}, ${loadContext.origin_state || ''}`.trim();
      contextPayload.destination = `${loadContext.dest_city || ''}, ${loadContext.dest_state || ''}`.trim();
    }

    try {
      await onSendMessage(textToSend, typeToSend, contextPayload);
      setDraftText('');
      setSelectedType('text');
    } catch (err) {
      console.error('[DriverMessageThread] Send failed:', err);
    }
  };

  const handleQuickAction = async (actionText: string, messageType: MessageType) => {
    if (isSending || isResolved) return;

    const contextPayload: Record<string, any> = {};
    if (loadContext) {
      contextPayload.load_id = loadContext.id;
      contextPayload.load_number = loadContext.load_number;
      contextPayload.origin = `${loadContext.origin_city || ''}, ${loadContext.origin_state || ''}`.trim();
      contextPayload.destination = `${loadContext.dest_city || ''}, ${loadContext.dest_state || ''}`.trim();
    }

    try {
      await onSendMessage(actionText, messageType, contextPayload);
    } catch (err) {
      console.error('[DriverMessageThread] Quick action failed:', err);
    }
  };

  const handleAcknowledge = async (messageId: string) => {
    setAcknowledgingId(messageId);
    try {
      await onAcknowledgeMessage(messageId);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    try {
      await onReopenConversation();
    } finally {
      setReopening(false);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderTypeBadge = (type: MessageType) => {
    switch (type) {
      case 'instruction':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/90 text-amber-300 border border-amber-800/80 mb-1">
            <ClipboardList className="w-3 h-3" />
            Dispatch Instruction
          </span>
        );
      case 'question':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/90 text-sky-300 border border-sky-800/80 mb-1">
            <HelpCircle className="w-3 h-3" />
            Dispatcher Question
          </span>
        );
      case 'confirmation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-950/90 text-teal-300 border border-teal-800/80 mb-1">
            <CheckCircle className="w-3 h-3" />
            Confirmation
          </span>
        );
      case 'status_update':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 mb-1">
            <Truck className="w-3 h-3" />
            Status Update
          </span>
        );
      case 'exception_update':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/90 text-rose-300 border border-rose-800/80 mb-1">
            <AlertTriangle className="w-3 h-3" />
            Delay / Exception Notice
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="driver-message-thread" className="flex flex-col h-full w-full min-w-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Thread Header */}
      <div className="px-3 py-1.5 sm:p-4 border-b border-slate-800 bg-slate-900/95 flex flex-col gap-1.5 sm:gap-2 w-full min-w-0 shrink-0">
        <div className="flex items-center justify-between gap-3 w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {onBackToList && (
              <button
                id="driver-thread-back-btn"
                type="button"
                onClick={onBackToList}
                className="p-2 -ml-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center md:hidden shrink-0"
                title="Back to conversations list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0 flex-nowrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {conversation.type === 'general' ? (
                    'General Dispatch Chat'
                  ) : (
                    <>
                      {loadContext?.load_number
                        ? `Load #${loadContext.load_number}`
                        : conversation.load?.load_number
                        ? `Load #${conversation.load.load_number}`
                        : 'Load'}
                      <span className="hidden sm:inline"> Dispatch Chat</span>
                    </>
                  )}
                </h3>
                {isResolved ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                    Resolved
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/70 shrink-0">
                    Active
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400 truncate mt-0.5">
                {conversation.type === 'general'
                  ? 'Direct communications with central fleet dispatch'
                  : 'Operational load thread for stops, arrival notifications, and delays'}
              </p>
            </div>
          </div>
        </div>

        {/* Load Operational Context (Strictly firewalled: no rates, margins, or pay) */}
        {loadContext && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5 sm:p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 text-xs w-full min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300 min-w-0 flex-nowrap w-full sm:w-auto">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-semibold text-white whitespace-nowrap truncate">
                {loadContext.origin_city}, {loadContext.origin_state}
              </span>
              <span className="text-slate-500 shrink-0">→</span>
              <span className="font-semibold text-white whitespace-nowrap truncate">
                {loadContext.dest_city}, {loadContext.dest_state}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-start shrink-0">
              <span className="text-[11px] text-slate-400">Status:</span>
              <StatusBadge status={loadContext.pipeline_status} type="pipeline" size="sm" />
            </div>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 w-full min-w-0">
        {isLoadingMessages && messages.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center px-4 space-y-2">
            <Info className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No messages yet in this conversation</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Use the message composer or tap a quick operational update below to notify dispatch.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            // Outbound message if sender_id matches current driver session, or marked as driver
            const isOutbound = currentUserId ? msg.sender_id === currentUserId : true;
            const isAcknowledged = Boolean(msg.acknowledged_at);
            const isActionable =
              !isOutbound &&
              !isAcknowledged &&
              (msg.message_type === 'instruction' ||
                msg.message_type === 'question' ||
                msg.message_type === 'status_update' ||
                msg.message_type === 'exception_update');

            return (
              <div
                key={msg.id}
                id={`driver-msg-${msg.id}`}
                className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Sender label for inbound messages */}
                {!isOutbound && (
                  <span className="text-[11px] text-slate-400 font-medium px-1">
                    {msg.sender?.full_name || 'Fleet Dispatch'}
                  </span>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm text-xs sm:text-sm ${
                    isOutbound
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  {/* Semantic message type pill */}
                  {renderTypeBadge(msg.message_type)}

                  {/* Message body text */}
                  <p className="whitespace-pre-wrap leading-relaxed break-words font-normal">
                    {msg.content}
                  </p>

                  {/* Context snippet if attached */}
                  {msg.context?.load_number && (
                    <div className={`mt-2 pt-2 text-[11px] border-t ${isOutbound ? 'border-indigo-500/50 text-indigo-100' : 'border-slate-700 text-slate-400'}`}>
                      Ref: Load #{msg.context.load_number}
                    </div>
                  )}

                  {/* Footer: Timestamp, Read/Ack indicators */}
                  <div className={`flex items-center justify-end gap-1.5 mt-2 text-[10px] ${isOutbound ? 'text-indigo-200' : 'text-slate-400'}`}>
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(msg.created_at)}</span>

                    {/* Read status for driver outbound messages */}
                    {isOutbound && msg.read_at && (
                      <span className="flex items-center gap-0.5 ml-1 text-emerald-300 font-medium" title={`Read by dispatch at ${new Date(msg.read_at).toLocaleTimeString()}`}>
                        <CheckCheck className="w-3 h-3" />
                        <span>Read</span>
                      </span>
                    )}

                    {/* Acknowledged status */}
                    {isAcknowledged && (
                      <span className="flex items-center gap-0.5 ml-1 text-emerald-400 font-semibold" title={`Acknowledged at ${new Date(msg.acknowledged_at!).toLocaleTimeString()}`}>
                        <Check className="w-3 h-3" />
                        <span>Ack'd</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Driver Acknowledge Button for Actionable Incoming Messages */}
                {isActionable && (
                  <div className="pt-1">
                    <button
                      id={`driver-ack-btn-${msg.id}`}
                      type="button"
                      onClick={() => handleAcknowledge(msg.id)}
                      disabled={acknowledgingId === msg.id}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                    >
                      {acknowledgingId === msg.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      )}
                      <span>Acknowledge Receipt</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compact Quick Message Menu (Active threads only) */}
      {!isResolved && (
        <div className="relative px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 w-full min-w-0 shrink-0">
          {showQuickMenu && (
            <div
              id="driver-quick-message-menu"
              className="absolute bottom-full left-3 mb-2 w-64 max-w-[calc(100vw-3rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-20"
            >
              <div className="p-1.5 space-y-1">
                <button
                  id="driver-quick-action-arrived-shipper"
                  type="button"
                  onClick={() => {
                    handleQuickAction('Driver status update: Arrived at Shipper', 'status_update');
                    setShowQuickMenu(false);
                  }}
                  disabled={isSending}
                  className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">Arrived at Shipper</span>
                </button>
                <button
                  id="driver-quick-action-loaded-rolling"
                  type="button"
                  onClick={() => {
                    handleQuickAction('Driver status update: Loaded & Rolling', 'status_update');
                    setShowQuickMenu(false);
                  }}
                  disabled={isSending}
                  className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">Loaded & Rolling</span>
                </button>
                <button
                  id="driver-quick-action-arrived-receiver"
                  type="button"
                  onClick={() => {
                    handleQuickAction('Driver status update: Arrived at Receiver', 'status_update');
                    setShowQuickMenu(false);
                  }}
                  disabled={isSending}
                  className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">Arrived at Receiver</span>
                </button>
                <button
                  id="driver-quick-action-delivered-empty"
                  type="button"
                  onClick={() => {
                    handleQuickAction('Driver status update: Delivered / Empty', 'status_update');
                    setShowQuickMenu(false);
                  }}
                  disabled={isSending}
                  className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Delivered / Empty</span>
                </button>
                <button
                  id="driver-quick-action-traffic-delay"
                  type="button"
                  onClick={() => {
                    handleQuickAction('Driver delay notice: Experiencing traffic delay en route', 'exception_update');
                    setShowQuickMenu(false);
                  }}
                  disabled={isSending}
                  className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">Traffic Delay</span>
                </button>
              </div>
            </div>
          )}

          <button
            id="driver-quick-message-toggle-btn"
            type="button"
            onClick={() => setShowQuickMenu((prev) => !prev)}
            disabled={isSending}
            className="min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick Message</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showQuickMenu ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Footer Area: Message Composer or Resolved Notice */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 w-full min-w-0 shrink-0">
        {isResolved ? (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs w-full min-w-0">
            <div className="flex items-center gap-2 text-slate-300 text-center sm:text-left min-w-0">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <strong className="text-white block font-semibold truncate">Conversation Resolved</strong>
                <span className="text-[11px] text-slate-400">
                  This conversation has been closed. Reopen to send additional messages.
                </span>
              </div>
            </div>
            <button
              id="driver-reopen-conv-btn"
              type="button"
              onClick={handleReopen}
              disabled={reopening}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-2 shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${reopening ? 'animate-spin' : ''}`} />
              <span>{reopening ? 'Reopening...' : 'Reopen Conversation'}</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-2 w-full min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs w-full min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Message Type:</span>
                <select
                  id="driver-msg-type-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as MessageType)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 min-h-[36px] min-w-0 max-w-full"
                >
                  <option value="text">General Message</option>
                  <option value="status_update">Status Update</option>
                  <option value="exception_update">Delay / Exception Notice</option>
                  <option value="question">Question</option>
                  <option value="confirmation">Confirmation</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full min-w-0">
              <input
                id="driver-msg-composer-input"
                type="text"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Type message to dispatch..."
                disabled={isSending}
                className="flex-1 min-w-0 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 sm:px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-hidden min-h-[44px]"
              />
              {hasText ? (
                <button
                  id="driver-msg-send-btn"
                  type="submit"
                  disabled={!draftText.trim() || isSending}
                  className="min-h-[44px] min-w-[48px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition cursor-pointer flex items-center justify-center shadow-sm shrink-0"
                  title="Send message to dispatch"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <button
                  id="driver-msg-record-btn"
                  type="button"
                  disabled={isSending}
                  className="min-h-[44px] min-w-[48px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-400 hover:text-indigo-300 font-semibold transition cursor-pointer flex items-center justify-center shadow-sm shrink-0 border border-slate-700"
                  title="Record audio message"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
