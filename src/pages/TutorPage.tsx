import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  Plus,
  Loader2,
  Bookmark,
  ChevronDown,
  Trash2,
  Layers,
  Info,
  GraduationCap,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ExternalLink,
  MessageSquareQuote,
  Lightbulb,
  Globe,
  ListOrdered,
  Star,
  HelpCircle,
  ArrowRight,
  Mic,
  MicOff
} from 'lucide-react';
import { DocumentItem, TutorConversation, TutorMessage, TutorLevel, Citation } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { DocumentInspectorModal } from '../components/DocumentInspectorModal.tsx';

interface TutorPageProps {
  documents: DocumentItem[];
  preselectedDocId?: string;
  initialQuestion?: string;
  studyMaterial?: { title: string; content: string };
}

/**
 * Beautiful pedagogical message component for structured explanations
 */
function PedagogicalMessageContent({
  content,
  onReplyUnderstanding
}: {
  content: string;
  onReplyUnderstanding?: (prompt: string) => void;
}) {
  // Check if content has the 6 pedagogical sections
  const hasSections =
    content.includes('Simple Explanation') ||
    content.includes('Real-Life Example') ||
    content.includes('Step-by-Step') ||
    content.includes('Important Points') ||
    content.includes('Check Your Understanding');

  if (!hasSections) {
    return (
      <div className="prose prose-stone prose-sm max-w-none text-[#242338] leading-relaxed whitespace-pre-line">
        {content}
      </div>
    );
  }

  // Split into sections cleanly
  const sections = content.split(/(?=###?\s+\d+\.|\b(?:1|2|3|4|5|6)\.\s+[A-Z\s]{4,})/);

  return (
    <div className="space-y-4 text-xs sm:text-sm text-[#242338]">
      {sections.map((sec, idx) => {
        const trimmed = sec.trim();
        if (!trimmed) return null;

        const isSimple = /Simple Explanation/i.test(trimmed);
        const isExample = /Real-Life Example/i.test(trimmed);
        const isSteps = /Step-by-Step/i.test(trimmed);
        const isPoints = /Important Points/i.test(trimmed);
        const isCheck = /Check Your Understanding/i.test(trimmed);
        const isNext = /Next Step/i.test(trimmed);

        if (isSimple) {
          const body = trimmed.replace(/^###?\s*\d*\.?\s*Simple Explanation:?/i, '').trim();
          return (
            <div key={idx} className="p-3.5 rounded-xl bg-[#E8F5EE]/60 border border-[#1B6A43]/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B6A43]">
                <Lightbulb className="w-4 h-4 text-[#1B6A43]" />
                <span>1. Simple Explanation</span>
              </div>
              <p className="leading-relaxed text-[#242338] whitespace-pre-line">{body}</p>
            </div>
          );
        }

        if (isExample) {
          const body = trimmed.replace(/^###?\s*\d*\.?\s*Real-Life Example:?/i, '').trim();
          return (
            <div key={idx} className="p-3.5 rounded-xl bg-[#F7F5FF] border border-[#E8E5F0] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D4AFF]">
                <Globe className="w-4 h-4 text-[#9254DE]" />
                <span>2. Real-Life Example (Intuitive Illustration)</span>
              </div>
              <p className="leading-relaxed text-[#242338] whitespace-pre-line">{body}</p>
            </div>
          );
        }

        if (isSteps) {
          const body = trimmed.replace(/^###?\s*\d*\.?\s*Step-by-Step Breakdown:?/i, '').trim();
          return (
            <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#E8E5F0] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D4AFF]">
                <ListOrdered className="w-4 h-4 text-[#6D4AFF]" />
                <span>3. Step-by-Step Breakdown</span>
              </div>
              <p className="leading-relaxed text-[#242338] whitespace-pre-line">{body}</p>
            </div>
          );
        }

        if (isPoints) {
          const body = trimmed.replace(/^###?\s*\d*\.?\s*Important Points:?/i, '').trim();
          return (
            <div key={idx} className="p-3.5 rounded-xl bg-[#EEE9FF]/70 border border-[#D1DCD6] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D4AFF]">
                <Star className="w-4 h-4 text-[#B45309]" />
                <span>4. Important Takeaways</span>
              </div>
              <p className="leading-relaxed text-[#242338] whitespace-pre-line">{body}</p>
            </div>
          );
        }

        if (isCheck) {
          const body = trimmed.replace(/^###?\s*\d*\.?\s*Check Your Understanding:?/i, '').trim();
          return (
            <div key={idx} className="p-3.5 rounded-xl bg-[#FEF3C7]/60 border border-[#B45309]/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#B45309]">
                  <HelpCircle className="w-4 h-4 text-[#B45309]" />
                  <span>5. Check Your Understanding</span>
                </div>
                {onReplyUnderstanding && (
                  <button
                    onClick={() => onReplyUnderstanding(`Regarding: ${body.slice(0, 80)}... `)}
                    className="text-[11px] font-bold text-[#6D4AFF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Reply to this check</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="leading-relaxed text-[#242338] font-medium whitespace-pre-line">{body}</p>
            </div>
          );
        }

        return (
          <div key={idx} className="leading-relaxed whitespace-pre-line">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

export function TutorPage({ documents, preselectedDocId, initialQuestion, studyMaterial }: TutorPageProps) {
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [inputQuestion, setInputQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Teaching Level (default: Beginner)
  const [teachingLevel, setTeachingLevel] = useState<TutorLevel>('beginner');

  // Document filter: empty array = all documents
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    preselectedDocId ? [preselectedDocId] : []
  );
  const [showDocSelector, setShowDocSelector] = useState(false);

  // Selected document for citation inspect
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);

  // Speech read-aloud state
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const voicePrefixRef = useRef('');
  const isStartingRecordingRef = useRef(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!initialQuestion) return;
    setActiveConvId(null);
    setMessages([]);
    setInputQuestion(initialQuestion);
    setSelectedDocIds(preselectedDocId ? [preselectedDocId] : []);
  }, [initialQuestion, preselectedDocId]);

  useEffect(() => () => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    window.speechSynthesis?.cancel();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
      if (!initialQuestion && res.conversations.length > 0 && !activeConvId) {
        selectConversation(res.conversations[0].id);
      }
    } catch {
      // ignore
    }
  };

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    setIsLoadingMessages(true);
    try {
      const res = await api.getConversation(convId);
      setMessages(res.messages);
      if (res.conversation.documentIds && res.conversation.documentIds.length > 0) {
        setSelectedDocIds(res.conversation.documentIds);
      }
    } catch {
      showToast('error', 'Error', 'Failed to load conversation history');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const res = await api.createConversation('New Study Session', selectedDocIds);
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveConvId(res.conversation.id);
      setMessages([]);
    } catch {
      showToast('error', 'Error', 'Failed to create new conversation');
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        const remaining = conversations.filter((c) => c.id !== convId);
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete conversation');
    }
  };

  const handleSendMessage = async (
    queryOverride?: string,
    actionType?: string,
    speakResponse = voiceRepliesEnabled
  ) => {
    const q = (queryOverride || inputQuestion).trim();
    if (!q || isSending || isListening || isTranscribing) return;

    setInputQuestion('');
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: TutorMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConvId || 'pending',
      role: 'user',
      content: q,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.askTutor(
        q,
        activeConvId || undefined,
        selectedDocIds,
        teachingLevel,
        actionType,
        studyMaterial
      );
      if (!activeConvId) {
        setActiveConvId(res.conversationId);
        loadConversations();
      }
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, res.message]);
      if (speakResponse) {
        speakMessage(res.message.id, res.message.content);
      }
    } catch (err: any) {
      showToast('error', 'Tutor Error', err.message || 'Failed to get tutor answer');
      setInputQuestion(q);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  // Interactive Action Triggers
  const handleActionClick = (action: string) => {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
    const lastTopicOrContext = lastAssistantMsg ? `regarding the previous explanation` : ``;

    let promptText = '';
    let actionKey = '';

    switch (action) {
      case 'explain_simply':
        promptText = `Could you please explain this even more simply in everyday words? ${lastTopicOrContext}`;
        actionKey = 'explain_simply';
        break;
      case 'another_example':
        promptText = `Can you give me another relatable real-life example to help me understand? ${lastTopicOrContext}`;
        actionKey = 'another_example';
        break;
      case 'step_by_step':
        promptText = `Please break down how this works step by step in detail. ${lastTopicOrContext}`;
        actionKey = 'step_by_step';
        break;
      case 'summarize_5':
        promptText = `Could you summarize the most important ideas into five key points? ${lastTopicOrContext}`;
        actionKey = 'summarize_5';
        break;
      case 'practice_question':
        promptText = `Ask me a quick practice question to test if I understand this properly. ${lastTopicOrContext}`;
        actionKey = 'practice_question';
        break;
      case 'why_wrong':
        promptText = `Can you explain why a student might get this wrong or common misconceptions to watch out for? ${lastTopicOrContext}`;
        actionKey = 'why_wrong';
        break;
      default:
        promptText = action;
    }

    handleSendMessage(promptText, actionKey);
  };

  const speakMessage = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code example omitted.')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/[*_`~]/g, '')
      .replace(/---\s*General Knowledge Explanation\s*---/g, 'General knowledge explanation.')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = navigator.language || 'en-US';
    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = (event) => {
      setSpeakingMsgId(null);
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        showToast('error', 'Read-Aloud', 'Speech playback failed. Try again or use the browser’s audio settings.');
      }
    };

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Speech read-aloud
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('info', 'Read-Aloud', 'Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    speakMessage(msgId, text);
  };

  const handleToggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      const message = 'Audio recording is not supported in this browser. Try an updated version of Chrome or Edge.';
      setVoiceError(message);
      showToast('error', 'Voice Input', message);
      return;
    }

    if (isStartingRecordingRef.current) return;
    isStartingRecordingRef.current = true;
    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);
    setVoiceError('');
    voicePrefixRef.current = inputQuestion.trim();
    setIsListening(true);
    setInterimTranscript('');
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setVoiceError('Audio recording failed. Check your microphone connection and try again.');
        showToast('error', 'Voice Input', 'Audio recording failed. Check your microphone connection and try again.');
      };
      recorder.onstop = async () => {
        if (recordingTimeoutRef.current !== null) {
          window.clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
        const audio = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        setIsListening(false);
        setIsTranscribing(true);
        setInterimTranscript('Transcribing your question...');

        try {
          if (!audio.size) throw new Error('No audio was recorded. Please try again.');
          const { transcript } = await api.transcribeTutorAudio(audio);
          const question = [voicePrefixRef.current, transcript.trim()].filter(Boolean).join(' ');
          if (!transcript.trim()) throw new Error('No speech was detected. Please speak clearly and try again.');
          setInputQuestion(question);
          setInterimTranscript('');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Voice transcription failed. Please try again.';
          setVoiceError(message);
          setInputQuestion(voicePrefixRef.current);
          showToast('error', 'Voice Input', message);
        } finally {
          setIsTranscribing(false);
          setInterimTranscript('');
        }
      };

      recorder.start();
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 30000);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setInterimTranscript('');
      setIsListening(false);
      const name = error instanceof DOMException ? error.name : '';
      const message = name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Microphone access was blocked. Allow microphone access for localhost in your browser site settings, then try again.'
        : name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? 'No microphone is available. Connect or enable a microphone, then try again.'
          : error instanceof Error ? error.message : 'Could not start audio recording. Check your microphone and try again.';
      setVoiceError(message);
      showToast('error', 'Voice Input', message);
    } finally {
      isStartingRecordingRef.current = false;
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    showToast('success', 'Copied', 'Explanation copied to clipboard.');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Open Citation in Document Inspector
  const handleInspectCitation = (cite: Citation) => {
    const doc = documents.find((d) => d.id === cite.documentId || d.title.toLowerCase() === cite.documentTitle.toLowerCase());
    if (doc) {
      setInspectDoc(doc);
    } else {
      showToast('info', 'Source Excerpt', `Citation from "${cite.documentTitle}" (Page ${cite.pageNumber})`);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const samplePrompts = [
    'Explain the difference between Linearizability and Serializability in simple language.',
    'How does the Raft consensus algorithm handle leader election timeouts?',
    'What are the key trade-offs between B+ Trees and LSM Trees for write amplification?',
    'Explain how Vector Clocks determine if two events are concurrent.'
  ];

  const interactiveActions = [
    { id: 'explain_simply', label: 'Explain simply' },
    { id: 'another_example', label: 'Give an example' },
    { id: 'step_by_step', label: 'Explain step by step' },
    { id: 'summarize_5', label: 'Summarize in 5 points' },
    { id: 'practice_question', label: 'Quiz me' },
    { id: 'why_wrong', label: 'Explain common mistakes' }
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 animate-in fade-in duration-300">
      {/* Left Sidebar: Conversations & Document Filter */}
      <div className="w-full md:w-72 bg-white border border-[#E8E5F0] rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-xs">
        {/* New Session Action */}
        <div className="p-3 border-b border-[#E8E5F0] flex items-center justify-between bg-[#EEE9FF]">
          <span className="font-serif font-bold text-sm text-[#6D4AFF]">Study Sessions</span>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6D4AFF] hover:bg-[#5638D5] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#EEE9FF]" />
            <span>New</span>
          </button>
        </div>

        {/* Document Filter Control */}
        <div className="p-3 border-b border-[#E8E5F0] bg-[#F7F5FF]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#242338] mb-1.5">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#77758A]" />
              Source Material Filter
            </span>
            <button
              onClick={() => setShowDocSelector(!showDocSelector)}
              className="text-[11px] text-[#6D4AFF] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
            >
              <span>{selectedDocIds.length === 0 ? 'All Documents' : `${selectedDocIds.length} Selected`}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {showDocSelector && (
            <div className="mt-2 p-2 rounded-xl bg-white border border-[#E8E5F0] space-y-1.5 max-h-40 overflow-y-auto">
              <div
                onClick={() => setSelectedDocIds([])}
                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer ${
                  selectedDocIds.length === 0 ? 'bg-[#EEE9FF] text-[#6D4AFF] font-bold' : 'hover:bg-[#F7F5FF] text-[#242338]'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedDocIds.length === 0 ? 'border-[#6D4AFF] bg-[#6D4AFF] text-white' : 'border-[#E8E5F0]'}`}>
                  {selectedDocIds.length === 0 && '✓'}
                </div>
                <span>Search all library notes</span>
              </div>
              {documents.map((d) => {
                const isSelected = selectedDocIds.includes(d.id);
                return (
                  <div
                    key={d.id}
                    onClick={() => toggleDocSelection(d.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer ${
                      isSelected ? 'bg-[#EEE9FF] text-[#6D4AFF] font-bold' : 'hover:bg-[#F7F5FF] text-[#242338]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'border-[#6D4AFF] bg-[#6D4AFF] text-white' : 'border-[#E8E5F0]'}`}>
                      {isSelected && '✓'}
                    </div>
                    <span className="truncate">{d.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-xs text-[#77758A] p-3 text-center">No previous sessions</p>
          ) : (
            conversations.map((c) => {
              const isActive = activeConvId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors group ${
                    isActive
                      ? 'bg-[#6D4AFF] text-white font-medium shadow-xs'
                      : 'hover:bg-[#EEE9FF] text-[#242338]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate">{c.title || 'Study Session'}</p>
                    <p className={`text-[10px] mt-0.5 ${isActive ? 'text-[#EEE9FF]' : 'text-[#77758A]'}`}>
                      {new Date(c.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-[#E8E5F0] text-[#77758A] hover:text-[#B91C1C]'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Chat Conversation */}
      <div className="flex-1 bg-white border border-[#E8E5F0] rounded-2xl flex flex-col overflow-hidden shadow-xs">
        {/* Chat Header with Level Selector */}
        <div className="px-5 py-3 border-b border-[#E8E5F0] bg-[#EEE9FF] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6D4AFF] text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4 text-[#EEE9FF]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-serif text-sm font-bold text-[#6D4AFF]">LearnMate AI Tutor</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EEE9FF] text-[#6D4AFF] font-semibold border border-[#D1DCD6]">
                  Personal Teacher
                </span>
              </div>
              <p className="text-[11px] text-[#77758A]">
                {selectedDocIds.length === 0
                  ? 'Grounded in all library materials with page citations'
                  : `Filtered to ${selectedDocIds.length} document(s)`}
              </p>
            </div>
          </div>

          {/* Explanation Level Selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!('speechSynthesis' in window)) {
                  showToast('info', 'Voice Replies', 'Speech synthesis is not supported in this browser.');
                  return;
                }
                setVoiceRepliesEnabled((enabled) => !enabled);
              }}
              aria-pressed={voiceRepliesEnabled}
              title={voiceRepliesEnabled ? 'Turn off automatic voice replies' : 'Turn on automatic voice replies'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                voiceRepliesEnabled
                  ? 'bg-[#6D4AFF] text-white border-[#6D4AFF]'
                  : 'bg-white text-[#77758A] border-[#E8E5F0] hover:text-[#6D4AFF]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Voice replies {voiceRepliesEnabled ? 'on' : 'off'}</span>
            </button>
            <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-xl border border-[#E8E5F0]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] px-1.5">
                Level:
              </span>
              {(['beginner', 'intermediate', 'advanced'] as TutorLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setTeachingLevel(lvl)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  teachingLevel === lvl
                    ? 'bg-[#6D4AFF] text-white shadow-2xs'
                    : 'text-[#77758A] hover:text-[#242338] hover:bg-[#EEE9FF]'
                }`}
              >
                {lvl}
              </button>
              ))}
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#F7F5FF]">
          {isLoadingMessages ? (
            <div className="h-full flex items-center justify-center text-[#77758A]">
              <Loader2 className="w-6 h-6 animate-spin text-[#6D4AFF]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEE9FF] text-[#6D4AFF] flex items-center justify-center shadow-xs">
                <BookOpen className="w-6 h-6 text-[#6D4AFF]" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-[#242338]">
                  Learn with your friendly AI teacher
                </h4>
                <p className="text-xs text-[#77758A] mt-1 leading-relaxed">
                  I explain complex concepts in plain language with intuitive real-world analogies, numbered breakdowns, and source citations from your verified notes.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="w-full text-left space-y-1.5 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#77758A]">
                  Try asking:
                </span>
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(p)}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#EEE9FF] hover:border-[#9254DE] border border-[#E8E5F0] text-xs text-[#242338] transition-colors cursor-pointer shadow-2xs"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[#6D4AFF] text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                      <GraduationCap className="w-4 h-4 text-[#EEE9FF]" />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#EEE9FF] text-[#242338] rounded-tr-none shadow-xs'
                          : 'bg-white border border-[#E8E5F0] text-[#242338] rounded-tl-none shadow-xs'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-line text-[#242338]">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <PedagogicalMessageContent
                            content={msg.content}
                            onReplyUnderstanding={(p) => setInputQuestion(p)}
                          />

                          {/* Assistant Message Actions Toolbar */}
                          <div className="mt-3 pt-2.5 border-t border-[#E8E5F0] flex items-center justify-between text-[11px] text-[#77758A]">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleSpeak(msg.id, msg.content)}
                                className="flex items-center gap-1 hover:text-[#6D4AFF] transition-colors cursor-pointer"
                                title="Listen to explanation"
                              >
                                {speakingMsgId === msg.id ? (
                                  <>
                                    <VolumeX className="w-3.5 h-3.5 text-[#B91C1C]" />
                                    <span className="text-[#B91C1C]">Stop audio</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>Read aloud</span>
                                  </>
                                )}
                              </button>
                              <span className="text-[#E8E5F0]">•</span>
                              <button
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="flex items-center gap-1 hover:text-[#6D4AFF] transition-colors cursor-pointer"
                                title="Copy explanation"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#1B6A43]" />
                                    <span className="text-[#1B6A43]">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* General Knowledge fallback indicator */}
                            {msg.isGeneralKnowledge && (
                              <div className="flex items-center gap-1 text-[#B45309] font-medium">
                                <Info className="w-3.5 h-3.5 text-[#B45309]" />
                                <span>Supplementary General Knowledge</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Citations block beneath assistant answers */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-1.5 pl-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#77758A]">
                          <Bookmark className="w-3 h-3 text-[#1B6A43]" />
                          <span>Verified Source References ({msg.citations.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.citations.map((cite, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleInspectCitation(cite)}
                              className="p-2.5 rounded-xl bg-white border border-[#E8E5F0] text-xs text-[#242338] space-y-1 hover:border-[#6D4AFF] hover:shadow-xs transition-all cursor-pointer group"
                            >
                              <div className="flex items-center justify-between text-[11px] font-bold text-[#6D4AFF]">
                                <span className="truncate max-w-[150px] group-hover:underline">{cite.documentTitle}</span>
                                <div className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.2 rounded bg-[#EEE9FF] text-[#6D4AFF] font-mono text-[10px]">
                                    Page {cite.pageNumber}
                                  </span>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#6D4AFF]" />
                                </div>
                              </div>
                              <p className="text-[11px] text-[#77758A] line-clamp-2 italic">
                                "{cite.snippet}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested follow-up prompt chips */}
                    {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1 pt-1">
                        {msg.suggestedFollowUps.map((fu, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleSendMessage(fu)}
                            disabled={isSending}
                            className="px-2.5 py-1 rounded-full bg-white hover:bg-[#EEE9FF] border border-[#E8E5F0] hover:border-[#6D4AFF] text-[11px] text-[#242338] transition-colors cursor-pointer shadow-2xs"
                          >
                            💡 {fu}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex gap-3 justify-start items-center text-xs text-[#77758A]">
              <div className="w-8 h-8 rounded-xl bg-[#6D4AFF] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#EEE9FF] animate-pulse" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#E8E5F0] flex items-center gap-2 shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#6D4AFF]" />
                <span className="text-[#242338] font-medium">Preparing crystal-clear, source-grounded explanation...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Interactive Learning Actions Bar */}
        <div className="px-4 py-2 border-t border-[#E8E5F0] bg-[#EEE9FF] overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mr-1">
              Actions:
            </span>
            {interactiveActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id)}
                disabled={isSending}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EEE9FF] border border-[#E8E5F0] text-[11px] font-semibold text-[#242338] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#E8E5F0] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask your tutor any question or reply to the understanding check..."
              disabled={isSending}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-[#F7F5FF] border border-[#E8E5F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF] focus:border-[#6D4AFF] text-[#242338]"
            />
            <button
              type="button"
              onClick={handleToggleListening}
              disabled={isSending || isTranscribing}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={isListening}
              title={isListening ? 'Stop recording and transcribe your question' : 'Record a voice question'}
              className={`p-2.5 rounded-xl border transition-colors disabled:opacity-50 cursor-pointer ${
                isListening
                  ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#B91C1C] animate-pulse'
                  : 'bg-white text-[#6D4AFF] border-[#E8E5F0] hover:bg-[#EEE9FF]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isSending || isListening || isTranscribing}
              className="px-4 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5638D5] text-white font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-4 h-4 text-[#EEE9FF]" />
              <span className="hidden sm:inline">Ask Tutor</span>
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-[#77758A] mt-2 px-1">
            <span aria-live="polite">
              {isTranscribing
                ? interimTranscript
                : isListening
                  ? 'Recording your question — select the microphone again when finished (30 second limit)'
                : voiceError || 'Voice recordings are transcribed into this box for review before sending'}
            </span>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </div>
      </div>

      {/* Citation Inspector Modal */}
      {inspectDoc && (
        <DocumentInspectorModal
          document={inspectDoc}
          onClose={() => setInspectDoc(null)}
        />
      )}
    </div>
  );
}
