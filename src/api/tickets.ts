import { api } from "../services/api";
import type { AdmissionType } from "./events";

export type GroupDiveApplication = {
  applicationId: string;
  eventId: string;
  paymentId: string | null;
  ticketId: string | null;
  nickname: string;
  gender: "male" | "female" | "other";
  enthusiasm: string;
  paymentStatus: "pending" | "paid" | "failed" | "cancelled";
  paidAmount: number | null;
  paidAt: string | null;
};

export type Ticket = {
  id: string;
  title: string;
  image: string;
  venue: string;
  startAt?: string;
  dateDisplay: string;
  seat?: string;
  tableOptionId?: string | null;
  tableLabel?: string | null;
  tableSaleMode?: "WHOLE_TABLE" | "SHARED_SEAT" | null;
  tableSeatSummary?: string | null;
  admissionType?: AdmissionType | null;
  price?: number;
  bookingId?: string;
  ticketNumber?: string;
  status?: string;
  canCancel: boolean;
  qrPayload?: string;
  qrText?: string;
  paymentMethod?: string;
  paidAmount?: number;
  amount?: number;
  totalAmount?: number;
  refundStatus?: string;
  refundedAmount?: number;
  refundAmount?: number;
  groupDiveApplication?: GroupDiveApplication | null;
};

export type RefundStatus = "pending" | "completed" | "failed";

export type RefundPolicy = {
  refundable: boolean;
  feeRate: string;
  refundAmount: number;
  paidAmount: number;
  reason: string;
};

export type CancelTicketResponse = {
  id: string;
  status: "cancelled";
  cancelledAt: string;
  refundAmount: number | null;
  refundStatus: RefundStatus | null;
  refundId: string | null;
};

export type Refund = {
  refundId: string;
  ticketId: string;
  bookingId: string;
  eventTitle: string;
  eventId: string;
  amount: number;
  feeRate: string;
  reason: string;
  status: RefundStatus;
  refundedAt: string | null;
  createdAt: string;
};

export type CancelTicketPayload = {
  reason?: string;
};

export const listMyTickets = (signal?: AbortSignal) => api.listMyTickets(signal);

export const getTicket = (ticketId: string, signal?: AbortSignal) => api.getTicket(ticketId, signal);

export const cancelTicket = (ticketId: string, payload?: CancelTicketPayload, signal?: AbortSignal) =>
  api.cancelTicket(ticketId, payload, signal);

export const getCancelPreview = (ticketId: string, signal?: AbortSignal) =>
  api.getCancelPreview(ticketId, signal);

export const listMyRefunds = (signal?: AbortSignal) =>
  api.listMyRefunds(signal);

export const listEventTickets = (eventId: string, params?: any, signal?: AbortSignal) =>
  api.listEventTickets(eventId, params, signal);
