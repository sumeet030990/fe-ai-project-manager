import axiosInstance from "@/lib/axios";
import {
  PaginatedResponse,
  TestCaseCreate,
  TestCaseGenerateRequest,
  TestCaseResponse,
  TestCaseUpdate,
} from "@/types";

export const getTestCases = async (
  featureId: string,
  storyId: string,
  page = 1,
  size = 50
): Promise<PaginatedResponse<TestCaseResponse>> => {
  const { data } = await axiosInstance.get(
    `/features/${featureId}/stories/${storyId}/test-cases`,
    { params: { page, size } }
  );
  return data;
};

export const getTestCase = async (
  featureId: string,
  storyId: string,
  testCaseId: string
): Promise<TestCaseResponse> => {
  const { data } = await axiosInstance.get(
    `/features/${featureId}/stories/${storyId}/test-cases/${testCaseId}`
  );
  return data;
};

export const createTestCase = async (
  featureId: string,
  storyId: string,
  payload: TestCaseCreate
): Promise<TestCaseResponse> => {
  const { data } = await axiosInstance.post(
    `/features/${featureId}/stories/${storyId}/test-cases`,
    payload
  );
  return data;
};

export const updateTestCase = async (
  featureId: string,
  storyId: string,
  testCaseId: string,
  payload: TestCaseUpdate
): Promise<TestCaseResponse> => {
  const { data } = await axiosInstance.patch(
    `/features/${featureId}/stories/${storyId}/test-cases/${testCaseId}`,
    payload
  );
  return data;
};

export const deleteTestCase = async (
  featureId: string,
  storyId: string,
  testCaseId: string
): Promise<void> => {
  await axiosInstance.delete(
    `/features/${featureId}/stories/${storyId}/test-cases/${testCaseId}`
  );
};

export const generateTestCases = async (
  featureId: string,
  storyId: string,
  payload: TestCaseGenerateRequest = {}
): Promise<TestCaseResponse[]> => {
  const { data } = await axiosInstance.post(
    `/features/${featureId}/stories/${storyId}/test-cases/generate`,
    payload
  );
  return data;
};
