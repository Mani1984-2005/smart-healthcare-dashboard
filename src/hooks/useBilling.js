// src/hooks/useBilling.js

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInvoices,
  fetchBillingSummary,
  createInvoice,
} from "../api/billingApi";

export const useInvoices = (filters) => {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => fetchInvoices(filters),
    staleTime: 30_000,
  });
};

export const useBillingSummary = () => {
  return useQuery({
    queryKey: ["billing-summary"],
    queryFn: fetchBillingSummary,
    refetchInterval: 60_000,
  });
};

export const useCreateInvoice = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      qc.invalidateQueries(["invoices"]);
      qc.invalidateQueries(["billing-summary"]);
    },
  });
};