// ─── Contract Status ─────────────────────────────────────────────────────────

export type ContractStatus =
  | 'draft'                // 작성 중 (생성 후 미제출 상태)
  | 'pending_sign'         // 제출 완료, 서명 대기
  | 'partially_signed'     // 한쪽만 서명 완료
  | 'completed'            // 양측 서명 완료
  | 'conditionally_active' // 크라우드펀딩형 조건부 계약 진행 중
  | 'fulfilled'            // 조건 달성 → 실제 계약 확정
  | 'voided'               // 계약 무효 (취소 / 조건 미달)
  | 'revision_requested';  // 수정 요청 (MVP에서는 뱃지만 표시)

// ─── Settlement Types ─────────────────────────────────────────────────────────

export type SettlementType =
  | 'fixed_fee'     // 고정 출연료
  | 'revenue_share' // 입장 수익 비율제
  | 'free_funding'  // 무료공연 후 펀딩
  | 'crowdfunding'  // 관객 크라우드 펀딩형
  | 'rental';       // 대관형

// ─── Draft Form Data ──────────────────────────────────────────────────────────

export interface ContractBasicInfo {
  eventDateTime: string;            // ISO 8601
  partyADisplayName: string;
  partyBDisplayName: string;
  partyALegalType: 'individual' | 'corporation' | null;
  partyBLegalType: 'individual' | 'corporation' | null;
  artistBankName: string;
  artistAccountNumber: string;
  artistAccountHolder: string;
  venueBankName: string;
  venueAccountNumber: string;
  venueAccountHolder: string;
}

export interface FixedFeeData {
  settlementType: 'fixed_fee';
  fixedFeeAmount: number;
  fixedFeeDueAt: 'after_1day' | 'custom';
  fixedFeeDueDateCustom?: string;   // fixedFeeDueAt === 'custom' 일 때
}

export interface RevenueShareData {
  settlementType: 'revenue_share';
  partyBSharePercent: number;
  partyASharePercent: number;
}

export interface FreeFundingData {
  settlementType: 'free_funding';
  // 설명성 구조 - 별도 입력 필드 없음
}

export interface CrowdfundingData {
  settlementType: 'crowdfunding';
  crowdfundingTargetRate: number;   // 목표 예매율 1~100
}

export interface RentalData {
  settlementType: 'rental';
  rentalFeeAmount: number;
  rentalFeeDueAt: 'before_3days' | 'custom';
  rentalFeeDueDateCustom?: string;  // rentalFeeDueAt === 'custom' 일 때
}

export type SettlementData =
  | FixedFeeData
  | RevenueShareData
  | FreeFundingData
  | CrowdfundingData
  | RentalData;

export interface ContractDraft extends ContractBasicInfo {
  settlementType: SettlementType;
  // fixed_fee
  fixedFeeAmount?: number;
  fixedFeeDueAt?: 'after_1day' | 'custom';
  fixedFeeDueDateCustom?: string;
  // revenue_share
  partyBSharePercent?: number;
  partyASharePercent?: number;
  // crowdfunding
  crowdfundingTargetRate?: number;
  // rental
  rentalFeeAmount?: number;
  rentalFeeDueAt?: 'before_3days' | 'custom';
  rentalFeeDueDateCustom?: string;
  // penalty
  penaltyTemplateVersion: string;
  penaltyAgreed: boolean;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ContractDetail extends ContractDraft {
  contractId: string;
  chatRoomId: string;
  status: ContractStatus;
  createdByParty: 'partyA' | 'partyB';
  createdAt: string;
  updatedAt: string;
  partyA: {
    profileId: string;
    profileType: string;
    signedAt: string | null;
  };
  partyB: {
    profileId: string;
    profileType: string;
    signedAt: string | null;
  };
  pdfUrl: string | null;
  voidedReason?: string | null;
  /** 백엔드가 내려주는 현재 사용자의 프로필 정보 */
  myProfile?: { id: string; name: string; imageUrl?: string | null; type: string } | null;
  /** 현재 사용자가 partyA인지 partyB인지 */
  myParty?: 'partyA' | 'partyB' | null;
  settlement?: ContractSettlement | null;
}

/** 채팅방 헤더에 노출할 요약 정보 */
export interface ContractSummary {
  contractId: string;
  chatRoomId: string;
  status: ContractStatus;
  eventDateTime: string;
  settlementType: SettlementType;
  partyA: {
    profileId: string;
    profileType: string;
    signedAt: string | null;
  };
  partyB: {
    profileId: string;
    profileType: string;
    signedAt: string | null;
  };
  myProfile?: { id: string; name: string; imageUrl?: string | null; type: string } | null;
  myParty?: 'partyA' | 'partyB' | null;
  settlement?: ContractSettlement | null;
}

export interface PenaltyTemplate {
  version: string;
  content: string;
  updatedAt: string;
}

export interface ContractSettlementParty {
  name: string;
  bankName: string | null;
  accountNumberMasked: string | null;
  accountHolder: string | null;
  amount: number;
}

export interface ContractSettlement {
  settlementId: string;
  eventId: string;
  contractId: string;
  chatRoomId: string;
  status: string;
  settlementType: SettlementType;
  totalRevenue: number;
  baseRevenueAmount: number;
  pgFee: number;
  dyveFee: number;
  distributableAmount: number;
  artistAmount: number;
  venueAmount: number;
  artistRatio: string;
  additionalPayableAmount: number;
  additionalPayableSide: 'artist' | 'venue' | null;
  calculationMemo: string | null;
  settledAt: string | null;
  artist: ContractSettlementParty;
  venue: ContractSettlementParty;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export type SignatureStatus =
  | 'not_signed'
  | 'i_signed_waiting'
  | 'other_signed_need_mine'
  | 'both_signed';

export function getSignatureStatus(
  myProfileId: string | undefined,
  partyA: { profileId: string; signedAt: string | null },
  partyB: { profileId: string; signedAt: string | null },
): SignatureStatus {
  if (!myProfileId) return 'not_signed';

  const isPartyA = myProfileId === partyA.profileId;
  const mySigned = isPartyA ? !!partyA.signedAt : !!partyB.signedAt;
  const otherSigned = isPartyA ? !!partyB.signedAt : !!partyA.signedAt;

  if (mySigned && otherSigned) return 'both_signed';
  if (mySigned && !otherSigned) return 'i_signed_waiting';
  if (!mySigned && otherSigned) return 'other_signed_need_mine';
  return 'not_signed';
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: '작성 중',
  pending_sign: '서명 대기',
  partially_signed: '서명 진행 중',
  completed: '계약 완료',
  conditionally_active: '조건부 계약',
  fulfilled: '조건 달성',
  voided: '계약 무효',
  revision_requested: '수정 요청',
};

export const SETTLEMENT_TYPE_LABEL: Record<SettlementType, string> = {
  fixed_fee: '고정 출연료',
  revenue_share: '수익 비율제',
  free_funding: '무료공연 후 펀딩',
  crowdfunding: '크라우드펀딩형',
  rental: '대관형',
};

export const SETTLEMENT_TYPES: SettlementType[] = [
  'fixed_fee',
  'revenue_share',
  'free_funding',
  'crowdfunding',
  'rental',
];

export const SETTLEMENT_TYPE_DESCRIPTION: Record<SettlementType, string> = {
  fixed_fee: '베뉴가 약속한 출연료를 지급하고 입장 수익은 베뉴가 가져갑니다.',
  revenue_share: '입장 수익을 합의한 비율로 아티스트와 베뉴가 나눕니다.',
  free_funding: '출연료 없이 공연한 뒤 현장 펀딩 수익을 아티스트가 가져갑니다.',
  crowdfunding: '목표 예매율을 달성하면 공연이 확정되고, 미달하면 계약이 무효가 됩니다.',
  rental: '아티스트가 대관료를 내고 공연 수익을 가져가며 F&B 수익은 베뉴에 귀속됩니다.',
};
