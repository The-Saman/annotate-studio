'use client';

import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ArrowUp, BookOpenCheck, Brain, FileText, Paperclip, Square, Wand2, X } from 'lucide-react';
import type { ChatEngine } from './useChatEngine';
import { useLibrary } from '@/store/library';
import { useSettings } from '@/store/settings';
import type { StudyFile } from '@/lib/tauri-commands';
import { cn } from '@/lib/utils';
import { isRtlText, normalizeForSearch } from '@/lib/bidi';
import { importBrowserFiles } from '@/lib/workspace-actions';
import { PRESETS } from '@/lib/agent/prompts';
import FileLabel from '@/components/ui/FileLabel';

export interface ChatComposerHandle {
  setDraft: (text: string) => void;
  focus: () => void;
}

interface ChatComposerProps {
  engine: ChatEngine;
}

interface SlashCommand {
  name: string;
  hint: string;
}

const COMMANDS: SlashCommand[] = [
  { name: 'booklet', hint: 'Turn the attached files into a study booklet' },
  { name: 'ocr', hint: 'Transcribe scanned PDFs or images into notes' },
  ...Object.entries(PRESETS).map(([name, preset]) => ({ name, hint: preset.description })),
  { name: 'deep', hint: 'Answer with the reasoning model, thinking deeply' },
  { name: 'flashcards', hint: 'Make flashcards from the attached material' },
];

const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(function ChatComposer({ engine }, ref) {
  const [value, setValue] = useState('');
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [deep, setDeep] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const files = useLibrary((state) => state.files);
  const agentEnabled = useSettings((state) => state.agent.enabled);
  const updateAgent = useSettings((state) => state.updateAgent);

  const resize = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  };

  useImperativeHandle(ref, () => ({
    setDraft: (text) => {
      setValue(text);
      requestAnimationFrame(() => {
        resize();
        const element = textareaRef.current;
        if (element) {
          element.focus();
          element.setSelectionRange(text.length, text.length);
        }
      });
    },
    focus: () => textareaRef.current?.focus(),
  }));

  const suggestions = useMemo(() => {
    if (!mention) return [] as StudyFile[];
    const query = normalizeForSearch(mention.query);
    return files.filter((file) => normalizeForSearch(file.name).includes(query)).slice(0, 8);
  }, [mention, files]);

  const trimmed = value.trim();
  const slash = /^\/\w*$/.test(trimmed) ? trimmed.slice(1).toLowerCase() : null;
  const commands = slash !== null ? COMMANDS.filter((command) => command.name.startsWith(slash)) : [];

  const updateMention = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const match = /(^|\s)@([^\s@]*)$/.exec(before);
    if (match) {
      setMention({ query: match[2], start: caret - match[2].length - 1 });
      setHighlight(0);
    } else {
      setMention(null);
    }
  };

  const pickMention = (file: StudyFile) => {
    if (!mention) return;
    const element = textareaRef.current;
    const caret = element?.selectionStart ?? value.length;
    const next = `${value.slice(0, mention.start)}${value.slice(caret)}`.replace(/\s{2,}/g, ' ');
    setValue(next);
    setMention(null);
    engine.addAttachments([file]);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(mention.start, mention.start);
      resize();
    });
  };

  const pickCommand = (command: SlashCommand) => {
    const next = `/${command.name} `;
    setValue(next);
    setHighlight(0);
    requestAnimationFrame(() => {
      const element = textareaRef.current;
      element?.focus();
      element?.setSelectionRange(next.length, next.length);
    });
  };

  const submit = () => {
    const text = value.trim();
    if (!text || engine.busy) return;
    setValue('');
    setMention(null);
    requestAnimationFrame(resize);
    void engine.send(text, { deep });
  };

  const explain = () => {
    const text = value.trim();
    if (!text || engine.busy) return;
    setValue('');
    requestAnimationFrame(resize);
    void engine.explain(text);
  };

  const onPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;
    event.preventDefault();
    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '-');
    const named = images.map(
      (file, index) => new File([file], `Chat image ${stamp}${index ? ` ${index + 1}` : ''}.${file.type.split('/')[1] || 'png'}`, { type: file.type }),
    );
    const saved = await importBrowserFiles(named);
    engine.addAttachments(saved);
  };

  const menuOpen = (mention !== null && suggestions.length > 0) || commands.length > 0;

  return (
    <div className="chat-composer">
      {engine.attachments.length > 0 && (
        <div className="chat-attachments">
          {engine.attachments.map((attachment) => (
            <span key={attachment.path} className={cn('attachment-chip', !attachment.enabled && 'attachment-chip-off')}>
              <button type="button" onClick={() => engine.toggleAttachment(attachment.path)} title={attachment.enabled ? 'Included in the next message' : 'Not included'}>
                <FileText size={12} />
                <FileLabel path={attachment.name} />
              </button>
              <button type="button" onClick={() => engine.removeAttachment(attachment.path)} aria-label="Remove attachment">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="chat-input-row">
        {menuOpen && (
          <div className="mention-menu menu">
            {commands.length > 0
              ? commands.map((command, index) => (
                  <button
                    key={command.name}
                    type="button"
                    className={cn('menu-item', index === highlight && 'menu-item-active')}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pickCommand(command);
                    }}
                  >
                    <span className="menu-item-icon">
                      <Wand2 size={13} />
                    </span>
                    <span className="menu-item-label">
                      /{command.name}
                      <small>{command.hint}</small>
                    </span>
                  </button>
                ))
              : suggestions.map((file, index) => (
                  <button
                    key={file.path}
                    type="button"
                    className={cn('menu-item', index === highlight && 'menu-item-active')}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pickMention(file);
                    }}
                  >
                    <span className="menu-item-icon">
                      <FileText size={13} />
                    </span>
                    <span className="menu-item-label" dir="auto">
                      {file.name}
                    </span>
                  </button>
                ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          dir={isRtlText(value) ? 'rtl' : 'auto'}
          placeholder={agentEnabled ? 'Ask or give a task… @ attaches a file, / shows commands' : 'Ask anything… type @ to attach a document'}
          onPaste={(event) => void onPaste(event)}
          onChange={(event) => {
            setValue(event.target.value);
            updateMention(event.target.value, event.target.selectionStart ?? event.target.value.length);
            resize();
          }}
          onKeyDown={(event) => {
            const count = commands.length > 0 ? commands.length : mention ? suggestions.length : 0;
            if (count > 0) {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlight((i) => (i + 1) % count);
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlight((i) => (i - 1 + count) % count);
                return;
              }
              if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
                event.preventDefault();
                if (commands.length > 0) pickCommand(commands[Math.min(highlight, commands.length - 1)]);
                else pickMention(suggestions[Math.min(highlight, suggestions.length - 1)]);
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setMention(null);
                if (commands.length > 0) setValue('');
                return;
              }
            }
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="chat-input-actions">
          <button
            type="button"
            className="icon-btn"
            title="Attach a document (@)"
            onClick={() => {
              const next = value.endsWith(' ') || !value ? `${value}@` : `${value} @`;
              setValue(next);
              setMention({ query: '', start: next.length - 1 });
              requestAnimationFrame(() => textareaRef.current?.focus());
            }}
          >
            <Paperclip size={15} />
          </button>
          <button type="button" className="icon-btn" title="Explain step by step" onClick={explain} disabled={!value.trim() || engine.busy}>
            <BookOpenCheck size={15} />
          </button>
          {engine.busy ? (
            <button type="button" className="send-btn send-btn-stop" onClick={engine.cancel} title="Stop">
              <Square size={13} />
            </button>
          ) : (
            <button type="button" className="send-btn" onClick={submit} disabled={!value.trim()} title="Send (Enter)">
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="chat-modes">
        <button
          type="button"
          className={cn('chat-mode', agentEnabled && 'chat-mode-on')}
          onClick={() => updateAgent({ enabled: !agentEnabled })}
          title={agentEnabled ? 'Agent: the assistant searches, reads and writes your files itself' : 'Chat only: the assistant sees only attached files'}
        >
          <Wand2 size={12} /> Agent
        </button>
        <button
          type="button"
          className={cn('chat-mode', deep && 'chat-mode-on')}
          onClick={() => setDeep((current) => !current)}
          title="Think deeper: use the reasoning model with extended thinking"
        >
          <Brain size={12} /> Think deeper
        </button>
      </div>
    </div>
  );
});

export default ChatComposer;
