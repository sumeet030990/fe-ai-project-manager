import axiosInstance from "@/lib/axios";
import { BRDAnalysisResult, BRDBulkSaveRequest, BRDBulkSaveResponse } from "@/types";

export const analyzeBRD = async (
  projectId: string,
  file: File,
  configId?: string
): Promise<BRDAnalysisResult> => {
  const formData = new FormData();
  formData.append("file", file);
  if (configId) {
    formData.append("config_id", configId);
  }
  const { data } = await axiosInstance.post(
    `/projects/${projectId}/brd/analyze`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const saveBRDAnalysis = async (
  projectId: string,
  payload: BRDBulkSaveRequest
): Promise<BRDBulkSaveResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/brd/save`, payload);
  return data;
};
