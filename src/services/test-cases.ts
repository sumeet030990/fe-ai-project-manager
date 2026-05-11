import axiosInstance from "@/lib/axios";
import {
  PaginatedResponse,
  TestCaseCreate,
  TestCaseGenerateRequest,
  TestCaseResponse,
  TestCaseUpdate,
} from "@/types";

export const getTestCases = async (
  moduleId: string,
  storyId: string,
  page = 1,
  size = 50
): Promise<PaginatedResponse<TestCaseResponse>> => {
  const { data } = await axiosInstance.get(
    `/modules/${moduleId}/stories/${storyId}/test-cases`,
    { params: { page, size } }
  );
  return data;
};

export const getTestCase = async (
  moduleId: string,
  storyId: string,
  testCaseId: string
): Promise<TestCaseResponse> => {
  const { data } = await axiosInstance.get(
    `/modules/${moduleId}/stories/${storyId}/test-cases/${testCaseId}`
  );
  return data;
};

export const createTestCase = async (
  moduleId: string,
  storyId: string,
  payload: TestCaseCreate
): Promise<TestCaseResponse> => {
  const { data } = await axiosInstance.post(
    `/modules/${moduleId}/stories/${storyId}/test-cases`,
    payload
  );
  return data;
};

export const updateTestCase = async (
  moduleId: string,
  storyId: string,
  testCaseId: string,
  payload: TestCaseUpdate
): Promise<TestCaseResponse> => {
  const { data } = await axiosInstance.patch(
    `/modules/${moduleId}/stories/${storyId}/test-cases/${testCaseId}`,
    payload
  );
  return data;
};

export const deleteTestCase = async (
  moduleId: string,
  storyId: string,
  testCaseId: string
): Promise<void> => {
  await axiosInstance.delete(
    `/modules/${moduleId}/stories/${storyId}/test-cases/${testCaseId}`
  );
};

export const generateTestCases = async (
  moduleId: string,
  storyId: string,
  payload: TestCaseGenerateRequest = {}
): Promise<TestCaseResponse[]> => {
  const { data } = await axiosInstance.post(
    `/modules/${moduleId}/stories/${storyId}/test-cases/generate`,
    payload
  );
  return data;
};
