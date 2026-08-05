import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { NavHeader } from "../components/figma/dyve/NavHeader";
import { PageState } from "../components/figma/dyve/PageState";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { Button } from "../components/figma/ui/button";
import { api, formatApiError, type ConnectionApplicationDto, type ConnectionDto } from "../services/api";
import { CONNECTION_APPLICATION_CLASS, CONNECTION_APPLICATION_LABEL } from "../utils/connectionDisplay";
import { useAuth } from "../contexts/AuthContext";
import { isAdminUser } from "../utils/auth";
import { resolveMediaSrc } from "../utils/media";

const GENDER_LABEL = { female: "여성", male: "남성", other: "기타", any: "모두 좋아요", "": "-" } as const;
type PreparedPair = { applicationAId: string; applicationBId: string };

export function ConnectionApplicationsPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [connection, setConnection] = useState<ConnectionDto | null>(null);
  const [applications, setApplications] = useState<ConnectionApplicationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pairSelection, setPairSelection] = useState<string[]>([]);
  const [preparedPairs, setPreparedPairs] = useState<PreparedPair[]>([]);
  const [isSavingPairs, setIsSavingPairs] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setForbidden(false);
      const [connectionData, applicationsData] = await Promise.all([
        api.getConnection(id),
        api.listConnectionApplications(id, { limit: 100 }),
      ]);
      if (!connectionData.canManage) {
        setForbidden(true);
        return;
      }
      setConnection(connectionData);
      setApplications(applicationsData.data);
      const restored = new Map<string, PreparedPair>();
      for (const application of applicationsData.data) {
        const partnerId = application.matchedPartner?.applicationId;
        if (application.matchStatus !== "prepared" || !partnerId) continue;
        const [applicationAId, applicationBId] = [application.id, partnerId].sort();
        restored.set(`${applicationAId}:${applicationBId}`, { applicationAId, applicationBId });
      }
      setPreparedPairs([...restored.values()]);
    } catch (error) {
      console.error("Failed to load applications", error);
      setErrorMessage(formatApiError(error, "신청자 목록을 불러오지 못했어요."));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCount = applications.filter((a) => a.status === "selected").length;
  const remainingSlots = connection ? Math.max(0, connection.capacity - selectedCount) : 0;

  const handleSelect = async (applicationId: string) => {
    if (!id || processingId) return;
    try {
      setProcessingId(applicationId);
      await api.selectConnectionApplication(id, applicationId);
      toast.success("선정하고 채팅에 초대했어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "선정에 실패했어요."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!id || processingId) return;
    try {
      setProcessingId(applicationId);
      await api.rejectConnectionApplication(id, applicationId);
      toast.success("신청을 반려했어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "반려에 실패했어요."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyInstagram = async (applicationId: string) => {
    if (!id || processingId) return;
    try {
      setProcessingId(applicationId);
      await api.adminVerifyConnectionApplicationInstagram(id, applicationId);
      toast.success("Instagram 본인 인증을 완료했어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "Instagram 인증에 실패했어요."));
    } finally {
      setProcessingId(null);
    }
  };

  const applicationName = (applicationId: string) => {
    const application = applications.find((item) => item.id === applicationId);
    return application?.nickname || application?.applicant.name || "신청자";
  };

  const addPreparedPair = () => {
    if (pairSelection.length !== 2) return;
    setPreparedPairs((current) => [
      ...current,
      { applicationAId: pairSelection[0], applicationBId: pairSelection[1] },
    ]);
    setPairSelection([]);
  };

  const handleSavePairs = async () => {
    if (!id || isSavingPairs) return;
    try {
      setIsSavingPairs(true);
      await api.adminReplaceConnectionMatches(id, preparedPairs);
      toast.success("D-3 매칭 페어를 저장했어요.");
      await load();
    } catch (error) {
      toast.error(formatApiError(error, "매칭 페어를 저장하지 못했어요."));
    } finally {
      setIsSavingPairs(false);
    }
  };

  const renderPageShell = (content: ReactNode) => (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="shrink-0">
        <NavHeader title="신청자 관리" />
      </div>
      <main
        data-connection-applications-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {content}
      </main>
    </div>
  );

  if (forbidden) {
    return (
      renderPageShell(
        <PageState
          title="접근 권한이 없어요"
          description="Buddy Dive 신청자 관리는 DYVE 운영자만 이용할 수 있어요."
          primaryAction={{ label: "돌아가기", onClick: () => navigate(-1) }}
        />,
      )
    );
  }

  if (isLoading) {
    return (
      renderPageShell(
        <div className="flex min-h-full w-full items-center justify-center">
          <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
        </div>,
      )
    );
  }

  if (!connection) {
    return (
      renderPageShell(
        <PageState
          title="정보를 불러오지 못했어요"
          description={errorMessage ?? undefined}
          primaryAction={{ label: "다시 시도", onClick: load }}
        />,
      )
    );
  }

  return renderPageShell(
      <div className="px-4 pb-8 pt-2">
        <h1 className="break-keep text-lg font-bold">{connection.title}</h1>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-3 text-center"><p className="text-[11px] text-[var(--color-muted)]">전체 신청</p><p className="mt-1 text-lg font-bold">{applications.length}</p></div>
          <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-3 text-center"><p className="text-[11px] text-[var(--color-muted)]">선정 정원</p><p className="mt-1 text-lg font-bold">{connection.capacity}</p></div>
          <div className="rounded-[var(--radius-card-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-3 text-center"><p className="text-[11px] text-[var(--color-muted)]">선정 인원</p><p className="mt-1 text-lg font-bold">{selectedCount}</p></div>
        </div>

        {isAdmin && !connection.matchingProcessedAt && new Date(connection.matchingAt ?? 0).getTime() > Date.now() && (
          <section className="mt-5 border-y border-[var(--color-hairline)] py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[14px] font-bold">D-3 매칭 페어</h2>
                <p className="mt-1 text-[12px] text-[var(--color-muted)]">인증과 결제가 완료된 신청자 두 명을 선택해 주세요.</p>
              </div>
              <Button size="sm" disabled={isSavingPairs} onClick={handleSavePairs}>
                {isSavingPairs ? "저장 중" : "페어 저장"}
              </Button>
            </div>
            {pairSelection.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
                <span>{pairSelection.map(applicationName).join(" + ")}</span>
                <Button size="sm" variant="outline-soft" disabled={pairSelection.length !== 2} onClick={addPreparedPair}>
                  페어 추가
                </Button>
                <button type="button" className="min-h-11 px-2 text-xs text-[var(--color-muted)]" onClick={() => setPairSelection([])}>
                  선택 해제
                </button>
              </div>
            )}
            {preparedPairs.length > 0 && (
              <div className="mt-3 divide-y divide-[var(--color-hairline)] border-t border-[var(--color-hairline)]">
                {preparedPairs.map((pair, index) => (
                  <div key={`${pair.applicationAId}:${pair.applicationBId}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-[13px]">
                    <span>{applicationName(pair.applicationAId)} + {applicationName(pair.applicationBId)}</span>
                    <button
                      type="button"
                      className="min-h-11 px-2 text-xs font-bold text-[var(--color-error)]"
                      onClick={() => setPreparedPairs((current) => current.filter((_, pairIndex) => pairIndex !== index))}
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div data-connection-applications-list className="mt-5 space-y-3">
          {applications.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--color-muted)]">아직 신청자가 없어요.</p>
          ) : (
            applications.map((application) => {
              const isProcessing = processingId === application.id;
              const isPaired = preparedPairs.some(
                (pair) => pair.applicationAId === application.id || pair.applicationBId === application.id,
              );
              const isPairSelected = pairSelection.includes(application.id);
              const canPair = application.status === "pending"
                && application.instagramVerificationStatus === "verified"
                && (application.paymentStatus === "paid" || application.paymentStatus === "not_required")
                && !isPaired;
              const canSelect = application.status === "pending"
                && application.instagramVerificationStatus === "verified"
                && remainingSlots > 0;
              return (
                <div
                  key={application.id}
                  data-connection-application-item
                  className="rounded-[var(--radius-card-lg)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-bold text-[var(--color-ink)]">
                        {application.nickname || application.applicant.name}
                      </p>
                      {application.applicant.introduction && (
                        <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
                          {application.applicant.introduction}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-bold ${CONNECTION_APPLICATION_CLASS[application.status]}`}
                    >
                      {CONNECTION_APPLICATION_LABEL[application.status]}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                    <div><p className="text-[var(--color-muted)]">성별 · 나이</p><p className="mt-0.5 font-semibold">{GENDER_LABEL[application.gender]} · {application.age ?? "-"}세</p></div>
                    <div><p className="text-[var(--color-muted)]">원하는 성별</p><p className="mt-0.5 font-semibold">{GENDER_LABEL[application.desiredGender]}</p></div>
                    <div className="col-span-2"><p className="text-[var(--color-muted)]">페스티벌을 즐기는 방법</p><p className="mt-0.5 leading-relaxed">{application.festivalStyle || "-"}</p></div>
                    <div className="col-span-2"><p className="text-[var(--color-muted)]">꼭 봐야 하는 아티스트</p><p className="mt-0.5 leading-relaxed">{application.mustSeeArtists || "-"}</p></div>
                    <div className="col-span-2"><p className="text-[var(--color-muted)]">함께 하고 싶은 것</p><p className="mt-0.5 leading-relaxed">{application.activities || application.message}</p></div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-hairline)] pt-3">
                    <span className={`text-xs font-bold ${application.instagramVerificationStatus === "verified" ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`}>
                      Instagram {application.instagramVerificationStatus === "verified" ? "인증 완료" : "DYVE 인증 대기"}
                    </span>
                    {isAdmin && application.instagramProofImageUrl && (
                      <a
                        href={resolveMediaSrc(application.instagramProofImageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        인증 사진 보기
                      </a>
                    )}
                  </div>

                  {isAdmin && application.instagramVerificationStatus !== "verified" && (
                    <Button
                      size="sm"
                      className="mt-3"
                      disabled={!application.instagramProofImageUrl || isProcessing}
                      onClick={() => handleVerifyInstagram(application.id)}
                    >
                      Instagram 본인 인증
                    </Button>
                  )}
                  {isAdmin && application.status === "pending" && (
                    <Button
                      size="sm"
                      className="mt-3"
                      variant={isPairSelected ? "default" : "outline-soft"}
                      disabled={!canPair || (!isPairSelected && pairSelection.length >= 2)}
                      onClick={() => setPairSelection((current) => (
                        current.includes(application.id)
                          ? current.filter((applicationId) => applicationId !== application.id)
                          : [...current, application.id]
                      ))}
                    >
                      {isPaired ? "페어 지정됨" : isPairSelected ? "선택됨" : "페어 선택"}
                    </Button>
                  )}
                  {!isAdmin && application.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        disabled={!canSelect || isProcessing}
                        onClick={() => handleSelect(application.id)}
                      >
                        {application.instagramVerificationStatus === "verified" ? "선정 및 채팅 초대" : "인증 후 선정 가능"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-soft"
                        disabled={isProcessing}
                        onClick={() => handleReject(application.id)}
                      >
                        반려
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>,
  );
}
