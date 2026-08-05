import { useState, useEffect, useRef } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { DyveIcon } from "./DyveIcon";
import { resolveMediaSrc } from "../../../utils/media";
import type { ChatParticipantSummary } from "../../../services/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface ChatScreenProps {
  targetName: string;
  targetImage?: string; // Optional image URL
  onBack: () => void;
  messages?: Message[];
  onSend?: (text: string) => Promise<boolean> | boolean;
  onAttachImage?: (file: File) => Promise<boolean> | boolean;
  isSending?: boolean;
  isReadOnly?: boolean;
  isComposerDisabled?: boolean;
  composerNotice?: string | null;
  sendErrorMessage?: string | null;
  onInputChange?: (text: string) => void;
  onRequireMember?: () => void;
  readOnlyMessage?: string;
  readOnlyActionLabel?: string;
  onAskDyve?: () => void;
  onLeaveAdminChat?: () => void;
  adminSupportStatus?: "idle" | "requested" | "active";
  isAskingDyve?: boolean;
  myName?: string;
  headerBottomSlot?: React.ReactNode;
  chatType?: "direct" | "group";
  title?: string;
  participants?: ChatParticipantSummary[];
  isOwner?: boolean;
  onRemoveParticipant?: (profileId: string) => void;
}

interface Message {
  id: string;
  text: string;
  sender: "me" | "other";
  timestamp: string;
  read?: boolean;
  isAdmin?: boolean;
  senderName?: string;
  attachments?: string[] | null;
}

export function ChatScreen({
  targetName,
  targetImage,
  onBack,
  messages: providedMessages,
  onSend,
  onAttachImage,
  isSending = false,
  isReadOnly = false,
  isComposerDisabled = false,
  composerNotice,
  sendErrorMessage,
  onInputChange,
  onRequireMember,
  readOnlyMessage,
  readOnlyActionLabel,
  onAskDyve,
  onLeaveAdminChat,
  adminSupportStatus,
  isAskingDyve = false,
  myName,
  headerBottomSlot,
  chatType = "direct",
  title,
  participants,
  isOwner = false,
  onRemoveParticipant,
}: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>(providedMessages ?? []);
  const [inputText, setInputText] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; previewUrl: string } | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const isGroup = chatType === "group";
  const displayName = isGroup ? title ?? "그룹 채팅" : targetName;
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const dragDepthRef = useRef(0);
  const resolvedReadOnlyMessage = readOnlyMessage ?? "회원만 메시지를 보낼 수 있어요";
  const resolvedReadOnlyActionLabel = readOnlyActionLabel ?? "로그인";

  // 관리자(DYVE 스태프)가 참여 중인 1:1:1 대화인지 확인
  const resolvedAdminSupportStatus = adminSupportStatus ?? (messages.some((m) => m.isAdmin) ? "active" : "idle");
  const canAttachImage = Boolean(onAttachImage) && !isReadOnly && !isComposerDisabled && !isSending && !isAttaching;

  const isImageAttachment = (src: string) =>
    /^data:image\//i.test(src) || /\.(png|jpe?g|gif|webp)(?:[?#].*)?$/i.test(src);

  const isImageFile = (file: File) => file.type.startsWith("image/");
  const isFileDrag = (dataTransfer: DataTransfer) => Array.from(dataTransfer.types).includes("Files");
  const isImageDrag = (dataTransfer: DataTransfer) =>
    Array.from(dataTransfer.items).some((item) => item.kind === "file" && item.type.startsWith("image/"));

  useEffect(() => {
    if (providedMessages) {
      setMessages(providedMessages);
    }
  }, [providedMessages]);

  useEffect(() => () => {
    if (pendingAttachment) URL.revokeObjectURL(pendingAttachment.previewUrl);
  }, [pendingAttachment]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (isReadOnly) {
      onRequireMember?.();
      return;
    }
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    if (onSend) {
      const didSend = await onSend(trimmedText);
      if (didSend) {
        setInputText("");
      }
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text: trimmedText,
      sender: "me",
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Seoul",
      }),
      read: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
  };

  const handleImageButtonClick = () => {
    if (isReadOnly) {
      onRequireMember?.();
      return;
    }
    if (!canAttachImage) return;
    fileInputRef.current?.click();
  };

  const attachImage = async (file: File) => {
    if (!isImageFile(file) || !onAttachImage || !canAttachImage) return;
    const previewUrl = URL.createObjectURL(file);
    if (pendingAttachment) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment({ file, previewUrl });
    try {
      setIsAttaching(true);
      const didSend = await onAttachImage(file);
      if (didSend) {
        setPendingAttachment(null);
        URL.revokeObjectURL(previewUrl);
      }
    } finally {
      setIsAttaching(false);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void attachImage(file);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    if (canAttachImage && isImageDrag(event.dataTransfer)) setIsDraggingImage(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isFileDrag(event.dataTransfer)) event.preventDefault();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingImage(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingImage(false);
    const file = Array.from(event.dataTransfer.files).find(isImageFile);
    if (file) void attachImage(file);
  };

  const retryPendingAttachment = async () => {
    if (!pendingAttachment || !onAttachImage || isAttaching) return;
    try {
      setIsAttaching(true);
      const didSend = await onAttachImage(pendingAttachment.file);
      if (didSend) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
        setPendingAttachment(null);
      }
    } finally {
      setIsAttaching(false);
    }
  };

  const removePendingAttachment = () => {
    if (!pendingAttachment) return;
    URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing || isComposingRef.current) return;
    e.preventDefault();
    handleSend();
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  return (
    <div
      className="flex h-full w-full flex-col bg-canvas text-ink animate-in slide-in-from-right duration-300"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div data-app-top-bar className="app-top-bar-strong z-10 flex flex-shrink-0 items-center justify-between border-b px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="이전 화면" className="rounded-full p-1 transition-colors hover:bg-surface-muted">
            <DyveIcon name="arrow-left" size="lg" tone="default" className="h-6 w-6 text-ink" />
          </button>
          <div
            className={`flex items-center gap-3 ${isGroup ? "cursor-pointer" : ""}`}
            onClick={isGroup ? () => setIsParticipantsOpen(true) : undefined}
            role={isGroup ? "button" : undefined}
            tabIndex={isGroup ? 0 : undefined}
            onKeyDown={isGroup ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsParticipantsOpen(true);
              }
            } : undefined}
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-hairline bg-surface-muted">
              {isGroup ? (
                <div className="flex h-full w-full items-center justify-center bg-surface-muted">
                  <DyveIcon name="users" size="sm" tone="muted" className="h-5 w-5" />
                </div>
              ) : targetImage ? (
                <img src={targetImage} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface-muted font-bold text-ink">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-base font-bold leading-none text-ink">{displayName}</h1>
              {isGroup ? (
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  {participants?.length ?? 0}명 참여 중
                </p>
              ) : (
                myName && (
                  <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                    {myName}, {displayName} ({resolvedAdminSupportStatus === "active" ? 3 : 2})
                  </p>
                )
              )}
              {resolvedAdminSupportStatus !== "idle" && (
                <p className="mt-0.5 text-[11px] text-primary">
                  {resolvedAdminSupportStatus === "active" ? "DYVE 스태프 지원 중" : "스태프 요청 접수됨"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onAskDyve && (
            <button
              onClick={onAskDyve}
              disabled={isAskingDyve || resolvedAdminSupportStatus !== "idle"}
              className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/20 disabled:cursor-default disabled:opacity-60"
            >
              {isAskingDyve
                ? "요청 중"
                : resolvedAdminSupportStatus === "active"
                  ? "지원 중"
                  : resolvedAdminSupportStatus === "requested"
                    ? "접수됨"
                    : "스태프 도움"}
            </button>
          )}
          {onLeaveAdminChat && (
            <button
              onClick={onLeaveAdminChat}
              className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-active)]"
            >
              지원 종료
            </button>
          )}
        </div>
      </div>

      {headerBottomSlot && (
        <div className="flex-shrink-0 w-full z-10 relative">
          {headerBottomSlot}
        </div>
      )}

      {/* Chat Area */}
      <div
        className="flex-1 space-y-1 overflow-y-auto bg-canvas p-4"
        ref={scrollRef}
      >
        {messages.map((msg, index) => {
          // 관리자 메시지: 중앙 시스템 메시지 스타일로 별도 렌더링
          if (msg.isAdmin) {
            return (
              <div key={msg.id} className="flex flex-col items-center my-3">
                <div className="flex items-start gap-2 px-3 py-2 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 max-w-[85%]">
                  <div className="h-5 w-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[var(--color-on-primary)] text-[11px] font-bold">D</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[var(--color-primary)] mb-0.5">DYVE 스태프</span>
                    <span data-user-content className="text-sm text-[var(--color-ink)] leading-snug">{msg.text}</span>
                  </div>
                </div>
                <span className="mt-1 text-[11px] text-[var(--color-muted-soft)]">{msg.timestamp}</span>
              </div>
            );
          }

          const isMe = msg.sender === "me";
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

          // 관리자 메시지는 그룹 경계로 처리
          const prevSender = prevMsg && !prevMsg.isAdmin ? prevMsg.sender : null;
          const nextSender = nextMsg && !nextMsg.isAdmin ? nextMsg.sender : null;

          const isFirstInGroup = prevSender !== msg.sender;
          const isLastInGroup = nextSender !== msg.sender;
          const showSenderName = !isMe && isFirstInGroup;

          // 내가 보낸 메시지 중 상대가 아직 읽지 않은 메시지에만 "1" 표시
          // read === false 일 때만 미읽음 표시 (undefined면 상태 불명이므로 미표시)
          const showUnread = isMe && msg.read === false;
          const attachments = (msg.attachments ?? [])
            .map((item) => resolveMediaSrc(item))
            .filter(Boolean);
          const hasText = msg.text.trim().length > 0;

          return (
            <div
              key={msg.id}
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-2' : 'mb-0.5'} ${isFirstInGroup && index > 0 ? 'mt-3' : ''}`}
            >
              {/* 상대방 아바타 영역 */}
              {!isMe && (
                <div className="w-9 mr-2 flex-shrink-0 flex flex-col items-center justify-start mt-0.5">
                  {isFirstInGroup ? (
                    <div className="h-8 w-8 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                      {targetImage ? (
                        <img src={targetImage} alt={targetName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-ink)] text-xs font-bold">
                          {targetName.charAt(0)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              )}

              <div className={`flex items-end gap-1.5 max-w-[72%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* 말풍선 */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-0.5`}>
                  {/* 보낸 사람 이름 (상대방 첫 번째 메시지만) */}
                  {showSenderName && (
                    <span className="mb-0.5 pl-1 text-[11px] font-medium text-[var(--color-muted)]">{msg.senderName ?? targetName}</span>
                  )}
                  <div
                    className={`
                      ${attachments.length > 0 ? 'p-1.5' : 'px-4 py-2.5'} text-sm leading-relaxed shadow-sm break-words
                      ${isMe
                        ? `bg-[var(--color-primary)] text-[var(--color-on-primary)]
                           ${isFirstInGroup && isLastInGroup ? 'rounded-2xl'
                           : isFirstInGroup ? 'rounded-t-2xl rounded-bl-2xl rounded-br-md'
                           : isLastInGroup ? 'rounded-b-2xl rounded-tl-2xl rounded-tr-md'
                           : 'rounded-l-2xl rounded-r-md'}`
                        : `bg-[var(--color-surface-soft)] text-[var(--color-ink)] border border-[var(--color-hairline)]
                           ${isFirstInGroup && isLastInGroup ? 'rounded-2xl'
                           : isFirstInGroup ? 'rounded-t-2xl rounded-br-2xl rounded-bl-md'
                           : isLastInGroup ? 'rounded-b-2xl rounded-tr-2xl rounded-tl-md'
                           : 'rounded-r-2xl rounded-l-md'}`
                      }
                    `}
                  >
                    {attachments.length > 0 ? (
                      <div className="flex max-w-[220px] flex-col gap-1.5">
                        {attachments.map((attachment, attachmentIndex) => (
                          isImageAttachment(attachment) ? (
                            <a
                              key={`${attachment}-${attachmentIndex}`}
                              href={attachment}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-xl bg-[var(--color-surface-muted)]"
                            >
                              <img
                                src={attachment}
                                alt="채팅 첨부 이미지"
                                loading="lazy"
                                decoding="async"
                                className="max-h-64 w-full object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              key={`${attachment}-${attachmentIndex}`}
                              href={attachment}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] underline-offset-2 hover:underline"
                            >
                              첨부 파일 보기
                            </a>
                          )
                        ))}
                      </div>
                    ) : null}
                    {hasText ? (
                      <span data-user-content className={attachments.length > 0 ? "mt-1 block px-2 pb-1" : ""}>
                        {msg.text}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* 타임스탬프 & 읽음 표시 */}
                <div className={`flex flex-col pb-0.5 text-[11px] text-[var(--color-muted-soft)] ${isMe ? 'items-end' : 'items-start'} flex-shrink-0`}>
                  {isLastInGroup && (
                    <>
                      {showUnread && <span className="text-[var(--color-primary)] text-[11px] font-bold mb-0.5">1</span>}
                      <span>{msg.timestamp}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div
        data-chat-composer
        className={`app-bottom-bar flex-shrink-0 border-t p-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] ${
          isDraggingImage && canAttachImage
            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
            : ""
        }`}
      >
        {pendingAttachment && (
          <div data-chat-attachment-preview className="mb-2 flex items-center gap-3 rounded-lg border border-hairline bg-canvas/80 p-2">
            <img
              src={pendingAttachment.previewUrl}
              alt="전송할 사진 미리보기"
              className="h-14 w-14 rounded-md object-cover"
            />
            <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-muted)]">{pendingAttachment.file.name}</p>
            <button
              type="button"
              onClick={() => void retryPendingAttachment()}
              disabled={isAttaching}
              className="min-h-11 px-2 text-xs font-bold text-[var(--color-primary)] disabled:opacity-50"
            >
              {isAttaching ? "전송 중" : "재시도"}
            </button>
            <button
              type="button"
              onClick={removePendingAttachment}
              disabled={isAttaching}
              aria-label="첨부 사진 삭제"
              className="min-h-11 px-2 text-xs font-bold text-[var(--color-muted)] disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        )}
        {!isReadOnly && composerNotice && (
          <p className="mb-2 rounded-lg border border-hairline bg-surface-muted px-3 py-2 text-xs text-[var(--color-muted)]">
            {composerNotice}
          </p>
        )}
        {!isReadOnly && sendErrorMessage && (
          <p className="mb-2 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-3 py-2 text-xs text-[var(--color-primary)]">
            {sendErrorMessage}
          </p>
        )}
        {isReadOnly && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-hairline bg-canvas/80 px-3 py-2 text-xs text-[var(--color-muted)]">
            <span className="whitespace-pre-line">{resolvedReadOnlyMessage}</span>
            <button
              onClick={onRequireMember}
              className="font-semibold text-primary hover:text-primary/80"
            >
              {resolvedReadOnlyActionLabel}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageChange}
          />
          <button
            type="button"
            onClick={handleImageButtonClick}
            disabled={!canAttachImage}
            aria-label={isAttaching ? "사진 업로드 중" : "사진 첨부"}
            className={`p-2 transition-colors ${
              canAttachImage
                ? "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                : "cursor-not-allowed text-[var(--color-disabled-text)]"
            }`}
          >
            <DyveIcon name="camera" size="lg" tone="muted" className="h-6 w-6" />
          </button>

          <div className="flex-1 relative">
            <Input
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                onInputChange?.(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              disabled={isReadOnly}
              placeholder={isReadOnly ? resolvedReadOnlyMessage : "메시지 입력"}
              enterKeyHint="send"
              className="w-full rounded-full border border-transparent bg-[var(--color-surface-strong)] py-5 pl-4 pr-10 text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
            />
          </div>

          <Button
            onClick={handleSend}
            aria-label="메시지 보내기"
            disabled={isReadOnly || !inputText.trim() || isSending || isComposerDisabled}
            className={`flex h-10 w-10 items-center justify-center rounded-full p-0 transition-colors ${inputText.trim() && !isReadOnly && !isComposerDisabled ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-active)] text-[var(--color-ink)]' : 'bg-[var(--color-disabled-surface)] text-[var(--color-disabled-text)]'
              }`}
          >
            <ArrowRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isGroup && (
        <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
          <DialogContent className="border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--color-ink)]">참여자 {participants?.length ?? 0}명</DialogTitle>
            </DialogHeader>
            <div className="mt-2 flex flex-col gap-2">
              {(participants ?? []).map((participant) => (
                <div
                  key={participant.profileId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">{participant.name}</span>
                    {participant.role === "owner" && (
                      <span className="rounded-[var(--radius-pill)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                        주최자
                      </span>
                    )}
                  </div>
                  {isOwner && participant.role !== "owner" && onRemoveParticipant && (
                    <button
                      type="button"
                      onClick={() => onRemoveParticipant(participant.profileId)}
                      className="text-[11px] font-semibold text-[var(--color-error)] hover:underline"
                    >
                      내보내기
                    </button>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ArrowRightIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
