import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, formatApiError, ApiRequestError } from '../services/api';
import { ContractWizard } from '../components/figma/dyve/ContractWizard';
import { LoadingIndicator } from '../components/LoadingIndicator';
import type { ContractDraft, ContractDetail, ContractSummary, PenaltyTemplate, SettlementType } from '../types/contract';
import { resolveMeProfile } from '../utils/apiMappers';
import { resolveConversationPartner, loadCurrentUserId } from '../utils/chat';
import { hydrateContractDisplayNames, resolveProfileSummary } from '../utils/contractDisplay';
import { toast } from 'sonner';

export interface DyveProfile {
  name: string;
  imageUrl?: string;
}

type ContractCreateResult = Partial<ContractDetail> & {
  contractId?: string;
};

const hasContractDetailShape = (value: ContractCreateResult): value is ContractDetail =>
  Boolean(
    value &&
    typeof value.contractId === 'string' &&
    value.partyA &&
    value.partyB &&
    typeof value.eventDateTime === 'string' &&
    typeof value.settlementType === 'string',
  );

export function ContractWizardPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [penaltyTemplate, setPenaltyTemplate] = useState<PenaltyTemplate | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [createdContract, setCreatedContract] = useState<ContractDetail | null>(null);
  const [myProfile, setMyProfile] = useState<DyveProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<DyveProfile | null>(null);
  const [myRole, setMyRole] = useState<'artist' | 'venue'>('artist');
  const [businessRegistrationGateMessage, setBusinessRegistrationGateMessage] = useState<string | null>(null);
  const routeSettlementType = (location.state as { settlementType?: SettlementType } | null)?.settlementType;

  const moveToContractDetail = useCallback((contractId: string) => {
    navigate(`/contract/${contractId}`, { replace: true });
  }, [navigate]);

  // 진입 시 기존 활성 계약 선조회 — 있으면 계약 상세로 리다이렉트
  useEffect(() => {
    if (!chatId) return;
    const controller = new AbortController();
    const checkExisting = async () => {
      try {
        const existing = await api.getChatContract(chatId, controller.signal) as ContractSummary | null;
        if (controller.signal.aborted) return;
        if (existing?.contractId) {
          moveToContractDetail(existing.contractId);
          return;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!(error instanceof ApiRequestError && error.status === 404)) {
          // 조회 자체 실패 — 신규 작성은 막지 않음
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingExisting(false);
        }
      }
    };
    void checkExisting();
    return () => controller.abort();
  }, [chatId, moveToContractDetail]);

  useEffect(() => {
    const controller = new AbortController();
    const loadTemplate = async () => {
      try {
        setIsLoadingTemplate(true);
        const template = await api.getPenaltyTemplate(controller.signal) as PenaltyTemplate;
        if (!controller.signal.aborted) {
          setPenaltyTemplate(template);
        }
      } catch {
        if (!controller.signal.aborted) {
          // API 없으면 placeholder로 진행 (null 유지)
          setPenaltyTemplate(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTemplate(false);
        }
      }
    };
    void loadTemplate();
    return () => controller.abort();
  }, []);

  // DYVE 등록명 + 프사: 나(me) + 채팅 상대방(partner) 로드
  useEffect(() => {
    if (!chatId || !user) return;
    const controller = new AbortController();
    const loadProfiles = async () => {
      try {
        setMyProfile(null);
        setPartnerProfile(null);
        const [me, chatsResponse] = await Promise.all([
          api.getMe(controller.signal, chatId),
          api.listChats({ limit: 50 }, controller.signal),
        ]);
        if (controller.signal.aborted) return;

        const meRecord = me as Record<string, unknown>;
        const resolvedMe = resolveMeProfile(me);
        const myKnownType = resolvedMe.profileType;
        const meBusinessRegistrationStatus =
          meRecord.businessRegistrationStatus === 'pending' ||
          meRecord.businessRegistrationStatus === 'approved' ||
          meRecord.businessRegistrationStatus === 'rejected'
            ? meRecord.businessRegistrationStatus
            : null;
        if (myKnownType) {
          setMyRole(myKnownType);
        }

        // active 프로필이 audience(null)이면 artistProfileId → venueProfileId 순으로 실제 프로필 사용
        let effectiveProfileId = resolvedMe.profileId;
        let effectiveProfileType = resolvedMe.profileType;
        if (!myKnownType) {
          const artistPid = typeof meRecord.artistProfileId === 'string' && meRecord.artistProfileId ? meRecord.artistProfileId : null;
          const venuePid = typeof meRecord.venueProfileId === 'string' && meRecord.venueProfileId ? meRecord.venueProfileId : null;
          if (artistPid) {
            effectiveProfileId = artistPid;
            effectiveProfileType = 'artist';
            setMyRole('artist');
          } else if (venuePid) {
            effectiveProfileId = venuePid;
            effectiveProfileType = 'venue';
            setMyRole('venue');
          }
        }

        const mySummary = await resolveProfileSummary(
          {
            profileId: effectiveProfileId,
            fallbackImage:
              resolvedMe.imageUrl ??
              (typeof meRecord.imageUrl === 'string' ? meRecord.imageUrl : null) ??
              (typeof meRecord.image === 'string' ? meRecord.image : null),
            fallbackType: effectiveProfileType,
          },
          api.getProfile,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setMyProfile(mySummary ? { name: mySummary.name, imageUrl: mySummary.imageUrl } : null);
          if (effectiveProfileType === 'venue' && meBusinessRegistrationStatus !== 'approved') {
            setBusinessRegistrationGateMessage('사업자등록증 심사가 완료된 후 계약을 진행할 수 있어요.');
          } else {
            setBusinessRegistrationGateMessage(null);
          }
        }

        // 채팅방 상대방 프로필
        const currentUserId = loadCurrentUserId() ?? user?.id ?? null;
        const matchedChat = (chatsResponse.data as Record<string, unknown>[]).find((chat) => {
          const chatRecord = chat as Record<string, unknown>;
          const id = chatRecord.id ?? chatRecord.chatId ?? chatRecord.threadId ?? chatRecord.conversationId;
          return typeof id === 'string' && id === chatId;
        });
        if (matchedChat) {
          const partner = resolveConversationPartner(
            matchedChat as Record<string, unknown>,
            currentUserId,
            user.nickname ?? null,
          );
          const partnerSummary = await resolveProfileSummary(
            {
              profileId: partner.partnerId,
              fallbackName: partner.partnerName !== 'Unknown' ? partner.partnerName : null,
              fallbackImage: partner.partnerImage,
            },
            api.getProfile,
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setPartnerProfile(partnerSummary ? {
              name: partnerSummary.name,
              imageUrl: partnerSummary.imageUrl,
            } : null);
            // 내 타입을 모를 때 파트너 타입으로 역할 추론
            if (!myKnownType && partnerSummary?.profileType) {
              setMyRole(partnerSummary.profileType === 'artist' ? 'venue' : 'artist');
            }
          }
          if (partner.partnerId) {
            try {
              const partnerDetail = await api.getProfile(partner.partnerId, controller.signal) as Record<string, unknown>;
              if (
                !controller.signal.aborted &&
                partnerDetail.type === 'venue' &&
                partnerDetail.businessRegistrationStatus !== 'approved'
              ) {
                setBusinessRegistrationGateMessage('사업자등록증 심사가 완료된 후 계약을 진행할 수 있어요.');
              }
            } catch {
              // ignore partner detail lookup failure
            }
          }
        }
      } catch {
        // 프로필 로드 실패는 조용히 무시 — 필드에서 직접 입력 가능
      }
    };
    void loadProfiles();
    return () => controller.abort();
  }, [chatId, user]);

  if (!chatId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-muted)]">
        <p>채팅방 정보를 찾을 수 없어요.</p>
      </div>
    );
  }

  if (!user || isCheckingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] text-[var(--color-muted)]">
        <LoadingIndicator className="text-sm" />
      </div>
    );
  }

  const handleSubmit = async (draft: ContractDraft): Promise<ContractDetail | null> => {
    if (!chatId) return null;
    if (businessRegistrationGateMessage) {
      setSubmitError(businessRegistrationGateMessage);
      toast.error(businessRegistrationGateMessage);
      return null;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        chatRoomId: chatId,
        ...draft,
      };
      const result = await api.createContract(payload) as ContractCreateResult;
      let contractDetail: ContractDetail | null = null;

      if (hasContractDetailShape(result)) {
        contractDetail = result;
      } else if (result.contractId) {
        try {
          contractDetail = await api.getContract(result.contractId) as ContractDetail;
        } catch {
          // 생성은 성공했지만 상세 재조회가 실패한 경우, 재제출 대신 상세로 이동시켜 중복 생성 방지
          moveToContractDetail(result.contractId);
          return null;
        }
      }

      if (!contractDetail) {
        throw new Error('Contract created but contract detail is unavailable.');
      }

      const hydrated = await hydrateContractDisplayNames(contractDetail, api.getProfile);
      setCreatedContract(hydrated);
      return hydrated;
    } catch (error) {
      // CONTRACT_EXISTS: 기존 계약 조회 후 해당 계약 상세로 복구 이동
      if (error instanceof ApiRequestError && error.status === 409 && error.code === 'CONTRACT_EXISTS') {
        try {
          const existing = await api.getChatContract(chatId) as ContractSummary | null;
          if (existing?.contractId) {
            moveToContractDetail(existing.contractId);
            return null;
          }
        } catch {
          // 재조회 실패 시 아래 일반 에러 처리로 fallthrough
        }
      }
      if (
        error instanceof ApiRequestError &&
        error.status === 403 &&
        error.code === 'BUSINESS_REGISTRATION_NOT_APPROVED'
      ) {
        const message = formatApiError(error, '사업자등록증 심사가 완료된 후 계약을 진행할 수 있어요.');
        setSubmitError(message);
        toast.error(message);
        return null;
      }
      setSubmitError(formatApiError(error, '계약서 생성에 실패했어요.'));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSign = async (contractId: string) => {
    setIsSigning(true);
    setSignError(null);
    try {
      const updated = await api.signContract(contractId) as ContractDetail;
      const hydrated = await hydrateContractDisplayNames(updated, api.getProfile);
      setCreatedContract(hydrated);
    } catch (error) {
      setSignError(formatApiError(error, '서명에 실패했어요.'));
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="bg-[var(--color-canvas)]">
      <main className="mobile-main-static flex min-h-0 flex-1 flex-col">
        <ContractWizard
          chatId={chatId}
          myRole={myRole}
          penaltyTemplate={penaltyTemplate}
          isLoadingTemplate={isLoadingTemplate}
          onSubmit={handleSubmit}
          createdContract={createdContract}
          onSign={handleSign}
          isSigning={isSigning}
          signError={signError}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onBack={() => navigate(`/chats/${chatId}`, { replace: true })}
          myProfile={myProfile ?? undefined}
          partnerProfile={partnerProfile ?? undefined}
          initialSettlementType={routeSettlementType}
        />
      </main>
    </div>
  );
}
