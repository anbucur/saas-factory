'use strict';

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

const SHRIMP_SERVER_PATH = 'C:\\Users\\alexa\\.config\\opencode\\mcp-shrimp-task-manager\\dist\\index.js';

export interface ShrimpTask {
  id: string;
  name: string;
  description: string;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  summary?: string;
  relatedFiles?: { path: string; type: string; description: string }[];
  agent?: string;
  implementationGuide?: string;
  verificationCriteria?: string;
}

export interface PlanResult {
  taskId: string;
  name: string;
  description: string;
  status: string;
}

export interface AnalysisResult {
  summary: string;
  initialConcept: string;
  requirements: string[];
  risks: string[];
  dependencies: string[];
}

export interface SplitTask {
  name: string;
  description: string;
  notes?: string;
  implementationGuide?: string;
  verificationCriteria?: string;
  dependencies: string[];
  relatedFiles?: { path: string; type: string; description: string }[];
}

export interface SplitResult {
  tasks: SplitTask[];
  globalAnalysis: string;
}

export interface VerifyResult {
  score: number;
  passed: boolean;
  feedback: string;
  summary: string;
}

export interface ReflectionResult {
  analysis: string;
  improvements: string[];
  recommendations: string[];
}

export interface TaskDetail {
  id: string;
  name: string;
  description: string;
  notes?: string;
  status: string;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  summary?: string;
  relatedFiles?: { path: string; type: string; description: string }[];
  agent?: string;
  implementationGuide?: string;
  verificationCriteria?: string;
}

export interface ListTasksResult {
  tasks: TaskDetail[];
  total: number;
}

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, any>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

class ShrimpMCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private connected = false;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
  private buffer = '';
  private nextRequestId = 0;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly RECONNECT_DELAY = 2000;
  private dataDir: string;
  private fallbackMode: 'fail' | 'template' | 'ask' = 'ask';

  constructor() {
    super();
    this.dataDir = process.env.SHRIMP_DATA_DIR || 'C:\\Users\\alexa\\.config\\opencode\\shrimp-data';
  }

  isConnected(): boolean {
    return this.connected;
  }

  getFallbackMode(): 'fail' | 'template' | 'ask' {
    return this.fallbackMode;
  }

  setFallbackMode(mode: 'fail' | 'template' | 'ask'): void {
    this.fallbackMode = mode;
  }

  private getEnv(): Record<string, string> {
    return {
      DATA_DIR: this.dataDir,
      TEMPLATES_USE: 'en',
      ENABLE_GUI: 'false',
      ...process.env
    };
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn('node', [SHRIMP_SERVER_PATH], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: this.getEnv(),
          windowsHide: true
        });

        this.buffer = '';
        this.nextRequestId = 0;
        this.pendingRequests.clear();

        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleData(data.toString());
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          console.error('[Shrimp MCP] stderr:', data.toString());
        });

        this.process.on('error', (error) => {
          console.error('[Shrimp MCP] Process error:', error);
          this.handleDisconnect();
          reject(error);
        });

        this.process.on('exit', (code, signal) => {
          console.log(`[Shrimp MCP] Process exited with code ${code}, signal ${signal}`);
          this.handleDisconnect();
        });

        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();

        this.initializeServer();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async initializeServer(): Promise<void> {
    try {
      const tools = await this.listTools();
      console.log(`[Shrimp MCP] Connected. Available tools: ${tools.length}`);
    } catch (error) {
      console.warn('[Shrimp MCP] Could not verify tools, but connection established');
    }
  }

  private handleData(data: string): void {
    this.buffer += data;

    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!line.trim()) continue;

      try {
        const response: MCPResponse = JSON.parse(line);
        this.handleResponse(response);
      } catch {
        console.warn('[Shrimp MCP] Failed to parse response:', line);
      }
    }
  }

  private handleResponse(response: MCPResponse): void {
    // If it has a 'method' field, it's a server-initiated request/notification, not a response
    // Server requests like 'roots/list' need to be handled by sending a response back
    if ('method' in response) {
      this.handleServerRequest(response as unknown as Record<string, unknown>);
      return;
    }

    if (response.id === undefined || response.id === null) return;
    const id = typeof response.id === 'string' ? parseInt(response.id, 10) : response.id;
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(id);

    if (response.error) {
      pending.reject(new Error(`MCP Error ${response.error.code}: ${response.error.message}`));
    } else {
      pending.resolve(response.result);
    }
  }

  private handleServerRequest(request: Record<string, unknown>): void {
    const method = String(request.method || '');
    const id = request.id;
    if (method === 'roots/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: { roots: [] }
      };
      this.process?.stdin?.write(JSON.stringify(response) + '\n');
      return;
    }
    console.log(`[Shrimp MCP] Unhandled server request: ${method}`);
  }

  private async handleDisconnect(): Promise<void> {
    this.connected = false;
    this.emit('disconnected');

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(`[Shrimp MCP] Attempting reconnection ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}...`);
      setTimeout(() => this.connect().catch(() => {}), this.RECONNECT_DELAY);
    }
  }

  private async sendRequest(method: string, params?: Record<string, any>): Promise<any> {
    if (!this.connected || !this.process?.stdin) {
      throw new Error('Shrimp MCP not connected');
    }

    return new Promise((resolve, reject) => {
      const id = this.nextRequestId++;
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 60000);

      this.pendingRequests.get(id)!.resolve = (value) => {
        clearTimeout(timeout);
        resolve(value);
      };

      this.pendingRequests.get(id)!.reject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.process!.stdin!.write(JSON.stringify(request) + '\n', (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  private async sendRequestWithTimeout(method: string, params?: Record<string, any>, timeoutMs: number = 60000): Promise<any> {
    if (!this.connected || !this.process?.stdin) {
      throw new Error('Shrimp MCP not connected');
    }

    return new Promise((resolve, reject) => {
      const id = this.nextRequestId++;
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingRequests.get(id)!.resolve = (value) => {
        clearTimeout(timeout);
        resolve(value);
      };

      this.pendingRequests.get(id)!.reject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.process!.stdin!.write(JSON.stringify(request) + '\n', (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  async listTools(): Promise<{ name: string; description: string }[]> {
    const result = await this.sendRequest('tools/list');
    return result.tools || [];
  }

  async planTask(content: string): Promise<PlanResult> {
    const result = await this.sendRequest('tools/call', {
      name: 'plan_task',
      arguments: { content }
    });
    return this.parseToolResult(result, 'plan_task') as PlanResult;
  }

  async analyzeTask(summary: string, initialConcept: string): Promise<AnalysisResult> {
    const result = await this.sendRequest('tools/call', {
      name: 'analyze_task',
      arguments: { summary, initialConcept }
    });
    const parsed = this.parseToolResult(result, 'analyze_task');
    if (!parsed) {
      return { summary, initialConcept, requirements: [], risks: [], dependencies: [] };
    }
    return parsed as AnalysisResult;
  }

  async splitTasks(globalAnalysisResult: string, tasksRaw: string, updateMode: 'append' | 'overwrite' | 'selective' | 'clearAllTasks' = 'append'): Promise<SplitResult> {
    // Parse our input tasks so we can use their names as fallback
    let inputTasks: Array<{ name: string; description: string; notes?: string }> = [];
    try {
      inputTasks = JSON.parse(tasksRaw);
    } catch { /* ignore parse errors */ }
    
    const inputTaskNames = new Set(inputTasks.map(t => t.name.toLowerCase()));
    
    // split_tasks with 60s timeout - if Shrimp doesn't respond quickly, use templates
    const result = await this.sendRequestWithTimeout('tools/call', {
      name: 'split_tasks',
      arguments: { updateMode, tasksRaw, globalAnalysisResult }
    }, 60000); // 60 second timeout
    const parsed = this.parseToolResult(result, 'split_tasks');
    
    // Shrimp returns strategy breakdown in markdown format
    // We parse it to extract actual tasks, but use our input task names as fallback
    if (parsed && parsed.raw) {
      const raw = parsed.raw as string;
      const tasks: SplitTask[] = [];
      const taskLines = raw.split('\n');
      let currentTask: Partial<SplitTask> | null = null;
      
      for (const line of taskLines) {
        const numMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*/);
        if (numMatch) {
          if (currentTask && currentTask.name) {
            tasks.push(currentTask as SplitTask);
          }
          currentTask = { 
            name: numMatch[2].trim(), 
            description: numMatch[2].trim(),
            dependencies: [] 
          };
        } else if (currentTask && line.includes('**')) {
          currentTask.description += ' ' + line.replace(/\*\*/g, '').trim();
        }
      }
      if (currentTask && currentTask.name) {
        tasks.push(currentTask as SplitTask);
      }
      
      // Check if we got actual task names (not strategy headers)
      const isStrategyHeader = (name: string): boolean => {
        const lower = name.toLowerCase();
        return lower.includes('decomposition') || 
               lower.includes('strategy') || 
               lower.includes('stage ') ||
               lower.includes('criteria') ||
               lower.includes('completeness') ||
               lower.includes('atomicity') ||
               lower.includes('dependencies') ||
               lower.includes('risk-based');
      };
      
      // If parsed tasks look like strategy headers, use input task names instead
      const hasRealTaskNames = tasks.length > 0 && tasks.some(t => !isStrategyHeader(t.name));
      
      if (hasRealTaskNames) {
        console.log(`[Shrimp MCP] Parsed ${tasks.length} real tasks from markdown`);
        return { tasks, globalAnalysis: parsed.globalAnalysis || globalAnalysisResult };
      }
      
      // Use input task names as fallback - they are the actual tasks we want to execute
      console.log(`[Shrimp MCP] Shrimp returned strategy text, using ${inputTasks.length} input task names`);
      const fallbackTasks: SplitTask[] = inputTasks.map(t => ({
        name: t.name,
        description: t.description,
        dependencies: [],
        notes: t.notes || '',
      }));
      
      if (fallbackTasks.length > 0) {
        return { tasks: fallbackTasks, globalAnalysis: parsed.globalAnalysis || globalAnalysisResult };
      }
    }
    
    // If parsing failed entirely, use input tasks as fallback
    if (inputTasks.length > 0) {
      console.log(`[Shrimp MCP] Using ${inputTasks.length} input task names as fallback`);
      return { 
        tasks: inputTasks.map(t => ({
          name: t.name,
          description: t.description,
          dependencies: [],
          notes: t.notes || '',
        })), 
        globalAnalysis: globalAnalysisResult 
      };
    }
    
    throw new Error(`split_tasks returned invalid result: ${JSON.stringify(parsed)?.slice(0, 200)}`);
  }

  async verifyTask(taskId: string, summary: string, score: number): Promise<VerifyResult> {
    const result = await this.sendRequest('tools/call', {
      name: 'verify_task',
      arguments: { taskId, summary, score }
    });
    return this.parseToolResult(result, 'verify_task') as VerifyResult;
  }

  async reflectTask(summary: string, analysis: string): Promise<ReflectionResult> {
    const result = await this.sendRequest('tools/call', {
      name: 'reflect_task',
      arguments: { summary, analysis }
    });
    return this.parseToolResult(result, 'reflect_task') as ReflectionResult;
  }

  async listTasks(status?: string): Promise<ListTasksResult> {
    const result = await this.sendRequest('tools/call', {
      name: 'list_tasks',
      arguments: { status: status || 'all' }
    });
    return this.parseToolResult(result, 'list_tasks') as ListTasksResult;
  }

  async getTaskDetail(taskId: string): Promise<TaskDetail> {
    const result = await this.sendRequest('tools/call', {
      name: 'get_task_detail',
      arguments: { taskId }
    });
    return this.parseToolResult(result, 'get_task_detail') as TaskDetail;
  }

  async queryTask(query: string, page = 1, pageSize = 5): Promise<{ tasks: TaskDetail[]; total: number }> {
    const result = await this.sendRequest('tools/call', {
      name: 'query_task',
      arguments: { query, page, pageSize }
    });
    return this.parseToolResult(result, 'query_task');
  }

  async deleteTask(taskId: string): Promise<void> {
    const result = await this.sendRequest('tools/call', {
      name: 'delete_task',
      arguments: { taskId }
    });
    return this.parseToolResult(result, 'delete_task');
  }

  async clearAllTasks(confirm: boolean): Promise<void> {
    const result = await this.sendRequest('tools/call', {
      name: 'clear_all_tasks',
      arguments: { confirm }
    });
    return this.parseToolResult(result, 'clear_all_tasks');
  }

  async initProjectRules(): Promise<void> {
    const result = await this.sendRequest('tools/call', {
      name: 'init_project_rules',
      arguments: {}
    });
    return this.parseToolResult(result, 'init_project_rules');
  }

  async researchMode(topic: string, currentState: string, nextSteps: string): Promise<any> {
    const result = await this.sendRequest('tools/call', {
      name: 'research_mode',
      arguments: { topic, currentState, nextSteps }
    });
    return this.parseToolResult(result, 'research_mode');
  }

  private parseToolResult(result: any, toolName: string): any {
    if (!result) return null;

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent) {
        try {
          const parsed = JSON.parse(textContent.text);
          return parsed;
        } catch {
          return { raw: textContent.text };
        }
      }
    }

    if (typeof result === 'string') {
      try {
        return JSON.parse(result);
      } catch {
        return { raw: result };
      }
    }

    return result;
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
    this.emit('disconnected');
  }
}

let instance: ShrimpMCPClient | null = null;

export async function getShrimpClient(): Promise<ShrimpMCPClient> {
  if (!instance) {
    instance = new ShrimpMCPClient();
    await instance.connect();
  }
  return instance;
}

export function getShrimpClientSync(): ShrimpMCPClient | null {
  return instance;
}

export async function disconnectShrimpClient(): Promise<void> {
  if (instance) {
    await instance.disconnect();
    instance = null;
  }
}

export { ShrimpMCPClient };
