import type { Event } from "../../../api/events";
import type { ConnectionDto } from "../../../services/api";
import { formatDateDisplay } from "../../../utils/formatters";
import { EventCard } from "./EventCard";
import {
  CONNECTION_APPROVAL_CLASS,
  CONNECTION_APPROVAL_LABEL,
  CONNECTION_LIFECYCLE_CLASS,
  CONNECTION_LIFECYCLE_LABEL,
  formatConnectionDeadline,
} from "../../../utils/connectionDisplay";

interface ConnectionCardProps {
  connection: ConnectionDto;
  onClick?: () => void;
  showApprovalBadge?: boolean;
  event?: Event | null;
  displayVariant?: "default" | "dive";
}

export function ConnectionCard({ connection, onClick, showApprovalBadge = false, event, displayVariant = "default" }: ConnectionCardProps) {
  const externalEvent = connection.externalEvent;
  const eventTitle = externalEvent?.title ?? event?.title;
  const eventDate = externalEvent?.startAt ? formatDateDisplay(externalEvent.startAt) : event?.dateDisplay;
  const eventVenue = externalEvent?.venue ?? event?.venue;

  if (displayVariant === "dive") {
    return (
      <div className="w-full">
        <EventCard
        image={externalEvent?.imageUrl ?? event?.image ?? ""}
        title={connection.title}
        dateDisplay={eventDate ?? "일정 미정"}
        venue={eventVenue ?? "장소 미정"}
        capacity={connection.capacity}
        applicationCount={connection.applicationCount}
        participationFee={connection.participationFee}
        isDyvePick={connection.isDyvePick}
        statusLabel={connection.organizer?.isDyveOfficial
          ? `DYVE 운영 · ${CONNECTION_LIFECYCLE_LABEL[connection.lifecycleStatus]}`
          : CONNECTION_LIFECYCLE_LABEL[connection.lifecycleStatus]}
        matchingLabel={connection.matchingAt ? formatConnectionDeadline(connection.matchingAt).replace(" 마감", " 예정") : undefined}
        onClick={onClick}
        variant="compact"
        fullWidth
        showTicketDetails={false}
        />
      </div>
    );
  }

  return (
    <article
      className={`relative w-full rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-4 text-left transition-colors ${onClick ? "hover:border-[var(--color-primary)]/35" : ""}`}
    >
      {onClick && (
        <button
          type="button"
          aria-label={`${connection.title} 상세 보기`}
          onClick={onClick}
          className="absolute inset-0 z-10 rounded-[var(--radius-card-lg)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]"
        />
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {connection.organizer?.isDyveOfficial && (
          <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-on-primary)]">
            DYVE 공식 운영
          </span>
        )}
        {showApprovalBadge && (
          <span
            className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-bold ${CONNECTION_APPROVAL_CLASS[connection.approvalStatus]}`}
          >
            {CONNECTION_APPROVAL_LABEL[connection.approvalStatus]}
          </span>
        )}
        <span
          className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-bold ${CONNECTION_LIFECYCLE_CLASS[connection.lifecycleStatus]}`}
        >
          {CONNECTION_LIFECYCLE_LABEL[connection.lifecycleStatus]}
        </span>
      </div>

      <h3 className="mt-2 break-keep text-[15px] font-bold leading-snug text-[var(--color-ink)]">
        {connection.title}
      </h3>

      {(connection.organizer?.name || connection.organizer?.introduction) && (
        <p className="mt-1 truncate text-[12px] text-[var(--color-muted)]">
          운영 · {connection.organizer?.name}
          {connection.organizer?.introduction ? ` · ${connection.organizer.introduction}` : ""}
        </p>
      )}

      {(eventTitle || eventDate || eventVenue) && (
        <dl data-static-info className="mt-3 text-[12px]">
          {eventTitle && <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 py-2"><dt className="text-[var(--color-muted)]">공연</dt><dd className="font-medium text-[var(--color-ink)]">{eventTitle}</dd></div>}
          {eventDate && <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 py-2"><dt className="text-[var(--color-muted)]">일정</dt><dd className="font-medium text-[var(--color-ink)]">{eventDate}</dd></div>}
          {eventVenue && <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 py-2"><dt className="text-[var(--color-muted)]">장소</dt><dd className="font-medium text-[var(--color-ink)]">{eventVenue}</dd></div>}
        </dl>
      )}

      <dl data-static-info className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        <div><dt className="text-[var(--color-muted)]">참가비</dt><dd className="mt-0.5 font-medium text-[var(--color-ink)]">{connection.participationFee === 0 ? "무료" : `${connection.participationFee.toLocaleString()}원`}</dd></div>
        <div><dt className="text-[var(--color-muted)]">참여</dt><dd className="mt-0.5 font-medium text-[var(--color-ink)]">신청 {connection.applicationCount} / 모집 {connection.capacity}명</dd></div>
        <div className="col-span-2"><dt className="text-[var(--color-muted)]">신청 마감</dt><dd className="mt-0.5 font-medium text-[var(--color-ink)]">{formatConnectionDeadline(connection.applicationDeadline)}</dd></div>
      </dl>

      {connection.approvalStatus === "rejected" && connection.rejectionReason && (
        <div className="mt-3 rounded-[var(--radius-card-md)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] leading-relaxed text-[var(--color-error)]">
          반려 사유: {connection.rejectionReason}
        </div>
      )}
    </article>
  );
}
