"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

export interface PaymentOrder {
  orderNo: string;
  qrCode: string;
  amount: number;
  plan: string;
  provider: string;
  simulated: boolean;
}

export function usePayment() {
  const { refreshToken } = useAuth();
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollResult, setPollResult] = useState<"paid" | "pending" | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createOrder = useCallback(async (plan: string, provider: string): Promise<PaymentOrder> => {
    const data = await api<PaymentOrder>("/payments/create", {
      method: "POST",
      body: JSON.stringify({ plan, provider }),
    });
    setCurrentOrder(data);
    setPollResult(null);
    return data;
  }, []);

  const startPolling = useCallback((orderNo: string) => {
    setIsPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const data = await api<{ status: string }>(`/payments/order/${orderNo}`);
        if (data.status === "paid") {
          setPollResult("paid");
          setIsPolling(false);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          await refreshToken();
        } else if (data.status === "cancelled" || data.status === "expired") {
          setPollResult("pending");
          setIsPolling(false);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch {
        // keep polling
      }
    }, 2000);
  }, [refreshToken]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setIsPolling(false);
  }, []);

  const simulatePayment = useCallback(async (orderNo: string) => {
    await api(`/payments/simulate/${orderNo}`, { method: "POST" });
    setPollResult("paid");
    setIsPolling(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    await refreshToken();
  }, [refreshToken]);

  const cancelOrder = useCallback(async (orderNo: string) => {
    await api(`/payments/cancel/${orderNo}`, { method: "POST" });
    setCurrentOrder(null);
    stopPolling();
  }, [stopPolling]);

  const reset = useCallback(() => {
    setCurrentOrder(null);
    setPollResult(null);
    stopPolling();
  }, [stopPolling]);

  return { currentOrder, isPolling, pollResult, createOrder, startPolling, stopPolling, simulatePayment, cancelOrder, reset };
}
