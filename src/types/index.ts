export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface RoleResponse {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyResponse {
  id: string;
  name: string;
  gst_no?: string;
  email: string;
  phone: string;
  website?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreate {
  name: string;
  gst_no?: string;
  email: string;
  phone: string;
  website?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface CompanyUpdate {
  name?: string;
  gst_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  is_active?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  contact_no: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  dob?: string;
  is_active: boolean;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  role_id: string;
  role: RoleResponse;
  company_id?: string;
  company?: CompanyResponse;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  contact_no: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  dob?: string;
  password: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  role_id: string;
  company_id?: string;
}

export interface UserUpdate {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  dob?: string;
  is_active?: boolean;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  role_id?: string;
  company_id?: string;
}

// Project
export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  project_info?: string;
  status: string;
  is_active: boolean;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  project_info?: string;
  company_id: string;
  created_by: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  project_info?: string;
  status?: string;
  is_active?: boolean;
}

// Tech Stack
export type TechStackCategory = "frontend" | "backend" | "database" | "devops" | "mobile" | "other";

export interface ProjectTechStackResponse {
  id: string;
  project_id: string;
  name: string;
  version?: string;
  category: TechStackCategory;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTechStackCreate {
  name: string;
  version?: string;
  category: TechStackCategory;
  description?: string;
}

export interface ProjectTechStackUpdate {
  name?: string;
  version?: string;
  category?: TechStackCategory;
  description?: string;
}

// Plugin
export type PluginEcosystem = "npm" | "pip" | "maven" | "composer" | "gem" | "nuget" | "cargo" | "other";

export interface ProjectPluginResponse {
  id: string;
  project_id: string;
  tech_stack_id: string;
  name: string;
  version?: string;
  ecosystem?: PluginEcosystem;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPluginCreate {
  tech_stack_id: string;
  name: string;
  version?: string;
  ecosystem?: PluginEcosystem;
  description?: string;
}

export interface ProjectPluginUpdate {
  name?: string;
  version?: string;
  ecosystem?: PluginEcosystem;
  description?: string;
}

// Module
export type ModuleStatus = "draft" | "ready" | "in_progress" | "done";

export interface ModuleResponse {
  id: string;
  project_id: string;
  created_by: string;
  name: string;
  description?: string;
  order: number;
  status: ModuleStatus;
  created_at: string;
  updated_at: string;
}

export interface ModuleCreate {
  name: string;
  description?: string;
  order?: number;
  status?: ModuleStatus;
  created_by: string;
}

export interface ModuleUpdate {
  name?: string;
  description?: string;
  order?: number;
  status?: ModuleStatus;
}

// Story
export type StoryStatus = "draft" | "review" | "approved" | "rejected" | "in_progress" | "done";

export interface StoryResponse {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  order: number;
  status: StoryStatus;
  story_points?: number;
  is_ai_generated: boolean;
  azure_work_item_id?: number;
  jira_issue_key?: string;
  business_rules?: string;
  acceptance_criteria?: string;
  file_references?: string;
  urls?: string;
  created_at: string;
  updated_at: string;
}

export interface JiraSyncFailure {
  jira_key: string;
  title: string;
  error: string;
}

export interface JiraSyncResult {
  fetched: number;
  imported: StoryResponse[];
  skipped: number;
  failed: JiraSyncFailure[];
}


export interface StoryCreate {
  title: string;
  description?: string;
  order?: number;
  status?: StoryStatus;
  story_points?: number;
}

export interface StoryUpdate {
  title?: string;
  description?: string;
  order?: number;
  status?: StoryStatus;
  story_points?: number;
  business_rules?: string;
  acceptance_criteria?: string;
  file_references?: string;
  urls?: string;
}

export interface StoryGenerateRequest {
  context?: string;
}

export interface StoryRefineRequest {
  context?: string;
}

// Test Case
export type TestCaseType = "positive" | "negative";

export interface TestCaseResponse {
  id: string;
  story_id: string;
  title: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  test_type: TestCaseType;
  order: number;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestCaseCreate {
  title: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  test_type?: TestCaseType;
  order?: number;
}

export interface TestCaseUpdate {
  title?: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  test_type?: TestCaseType;
  order?: number;
}

export interface TestCaseGenerateRequest {
  context?: string;
}

// Prompt
export interface PromptCreate {
  content: string;
  target_ai?: string;
  tech_stacks?: string;
  extra_context?: string;
}

export interface PromptResponse {
  id: string;
  story_id: string;
  content: string;
  target_ai: string;
  tech_stacks?: string;
  extra_context?: string;
  created_at: string;
  updated_at: string;
}
