import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Download, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, formatApiError } from '../services/api';
import { ContractSummaryCard } from '../components/figma/dyve/ContractSummaryCard';
import { SettlementResultCard } from '../components/figma/dyve/SettlementResultCard';
import { ContractSignatureStep } from '../components/figma/dyve/ContractSignatureStep';
import { ContractStatusBadge } from '../components/figma/dyve/ContractStatusBadge';
import { NavHeader } from '../components/figma/dyve/NavHeader';
import { LoadingIndicator } from '../components/LoadingIndicator';
import type { ContractDetail } from '../types/contract';
import { resolveMeProfile } from '../utils/apiMappers';
import { hydrateContractDisplayNames } from '../utils/contractDisplay';
import { toast } from 'sonner';

export function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // 커스텀 뒤로가기: state.from이 있으면 해당 경로로 replace, 없으면 히스토리 -1
  const handleBack = () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from) {
      navigate(from, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [myRole, setMyRole] = useState<'artist' | 'venue'>('artist');

  useEffect(() => {
    if (!contractId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [result, me] = await Promise.all([
          api.getContract(contractId, controller.signal) as Promise<ContractDetail>,
          api.getMe(controller.signal).catch(() => null),
        ]);
        if (!controller.signal.aborted) {
          const resolvedMe = resolveMeProfile(me);
          if (resolvedMe.profileType) {
            setMyRole(resolvedMe.profileType);
          }
          const hydrated = await hydrateContractDisplayNames(result, api.getProfile, controller.signal);
          if (!controller.signal.aborted) {
            setContract(hydrated);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(formatApiError(err, '계약서를 불러오지 못했습니다.'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [contractId]);

  const handleSign = async () => {
    if (!contractId) return;
    setIsSigning(true);
    setSignError(null);
    try {
      const updated = await api.signContract(contractId) as ContractDetail;
      const hydrated = await hydrateContractDisplayNames(updated, api.getProfile);
      setContract(hydrated);
    } catch (err) {
      setSignError(formatApiError(err, '서명에 실패했어요.'));
    } finally {
      setIsSigning(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!contractId) return;
    if (contract?.pdfUrl) {
      window.open(contract.pdfUrl, '_blank');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const result = await api.generateContractPdf(contractId) as { pdfUrl?: string };
      if (result?.pdfUrl) {
        setContract((prev) => prev ? { ...prev, pdfUrl: result.pdfUrl ?? null } : prev);
        window.open(result.pdfUrl, '_blank');
      } else {
        toast.info('PDF를 아직 만들 수 없어요. 계약 내용은 화면에서 확인할 수 있어요.');
      }
    } catch {
      toast.info('PDF를 아직 만들 수 없어요. 계약 내용은 화면에서 확인할 수 있어요.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleVoid = async () => {
    if (!contractId || !contract) return;
    const reason = window.prompt('계약 무효 처리 사유를 입력해 주세요:');
    if (!reason?.trim()) return;
    setIsVoiding(true);
    try {
      const updated = await api.voidContract(contractId, { reason }) as ContractDetail;
      const hydrated = await hydrateContractDisplayNames(updated, api.getProfile);
      setContract(hydrated);
      toast.success('계약을 무효 처리했어요.');
    } catch (err) {
      toast.error(formatApiError(err, '계약 무효 처리에 실패했어요.'));
    } finally {
      setIsVoiding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)]">
        <LoadingIndicator className="text-sm text-[var(--color-muted)]" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-canvas)] px-6 text-center">
        <p className="text-base font-semibold text-[var(--color-ink)]">계약서를 찾을 수 없어요</p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">{error}</p>
        <button
          onClick={handleBack}
          className="mt-6 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)]"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const isCompleted = contract.status === 'completed' || contract.status === 'fulfilled';
  const canVoid = contract.status !== 'voided' && contract.status !== 'completed';

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas text-ink">
      {/* 헤더 — 좌상단 나가기 버튼은 NavHeader 로 표준화 (docs/ui-conventions.md) */}
      <NavHeader
        title="공연 계약서"
        onBack={handleBack}
        className="flex-shrink-0"
        rightAction={
          <div className="flex items-center gap-2">
            <ContractStatusBadge status={contract.status} size="sm" />
            {/* PDF 버튼 (완료 상태일 때만) */}
            {isCompleted && (
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {isGeneratingPdf ? '생성 중...' : 'PDF'}
              </button>
            )}
          </div>
        }
      />

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* 서명 진행 중이면 서명 스텝 먼저 */}
        {(contract.status === 'pending_sign' || contract.status === 'partially_signed') && user && (
          <ContractSignatureStep
            contract={contract}
            myRole={myRole}
            onSign={handleSign}
            isSigning={isSigning}
            error={signError}
          />
        )}

        {/* 완료 상태 계약 요약 */}
        {(isCompleted || contract.status === 'voided') && (
          <ContractSummaryCard contract={contract} showSignatureStatus />
        )}

        {/* 진행 중 상태면 요약도 보여줌 */}
        {!isCompleted && contract.status !== 'voided' && (
          <ContractSummaryCard contract={contract} showSignatureStatus />
        )}

        {contract.settlement && (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <SettlementResultCard settlement={contract.settlement} />
          </div>
        )}

        {/* 무효 사유 */}
        {contract.status === 'voided' && contract.voidedReason && (
          <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-4 py-3">
            <p className="text-xs text-[var(--color-error)] font-medium mb-1">계약 무효 사유</p>
            <p className="text-sm text-[var(--color-muted)]">{contract.voidedReason}</p>
          </div>
        )}

        {/* 계약 무효 버튼 */}
        {canVoid && (
          <button
            onClick={handleVoid}
            disabled={isVoiding}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 py-3 text-sm font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-primary)]/15 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {isVoiding ? '처리 중...' : '계약 무효 처리'}
          </button>
        )}
      </div>
    </div>
  );
}
