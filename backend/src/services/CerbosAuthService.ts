import { GRPC } from '@cerbos/grpc';
import type {
  CerbosPrincipal,
  CerbosResource,
  CerbosCheckOptions,
  CerbosCheckResult,
  CerbosBatchCheckOptions,
  CerbosBatchCheckResult,
  CerbosQueryPlanOptions,
  CerbosQueryPlanResult,
  ResourceAction,
} from '../types/cerbos.types';
import logger from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class CerbosAuthService {
  private static instance: CerbosAuthService;
  private client: ReturnType<typeof GRPC>;
  private cache: Map<string, CacheEntry<any>>;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private healthCheckCache: { value: boolean; expiry: number } | null = null;
  private readonly HEALTH_CHECK_TTL = 30000;

  constructor() {
    const host = process.env.CERBOS_HOST || 'localhost:3592';
    const tls = process.env.CERBOS_TLS === 'true';

    this.client = GRPC(host, { tls });

    this.cache = new Map();
    this.cacheEnabled = process.env.CERBOS_CACHE_ENABLED !== 'false';
    this.cacheTTL = parseInt(process.env.CERBOS_CACHE_TTL || '300000', 10);

    logger.info('CerbosAuthService initialized', {
      host,
      tls,
      cacheEnabled: this.cacheEnabled,
      cacheTTL: this.cacheTTL,
    });
  }

  public static getInstance(): CerbosAuthService {
    if (!CerbosAuthService.instance) {
      CerbosAuthService.instance = new CerbosAuthService();
    }
    return CerbosAuthService.instance;
  }

  public async checkPermission(
    options: CerbosCheckOptions
  ): Promise<CerbosCheckResult> {
    const { principal, resource, action, auxData } = options;

    const cacheKey = this.getCacheKey('check', principal.id, resource.id, action);

    if (this.cacheEnabled) {
      const cached = this.getFromCache<CerbosCheckResult>(cacheKey);
      if (cached) {
        logger.debug('Permission check cache hit', { cacheKey });
        return cached;
      }
    }

    try {
      const request: any = {
        principal: {
          id: principal.id,
          roles: principal.roles,
          attr: principal.attr,
        },
        resource: {
          kind: resource.kind,
          id: resource.id,
          attr: resource.attr,
        },
        actions: [action],
      };

      if (auxData) {
        request.auxData = auxData;
      }

      const response = await this.client.checkResource(request);

      const result: CerbosCheckResult = {
        allowed: response.isAllowed(action),
        validationErrors: response.validationErrors?.map((e: any) =>
          `${e.path}: ${e.message}`
        ),
      };

      if (this.cacheEnabled) {
        this.setCache(cacheKey, result);
      }

      logger.debug('Permission check completed', {
        principal: principal.id,
        resource: `${resource.kind}:${resource.id}`,
        action,
        allowed: result.allowed,
      });

      return result;
    } catch (error) {
      logger.error('Permission check failed', {
        error,
        principal: principal.id,
        resource: `${resource.kind}:${resource.id}`,
        action,
      });
      throw error;
    }
  }

  public async batchCheckPermissions(
    options: CerbosBatchCheckOptions
  ): Promise<CerbosBatchCheckResult[]> {
    const { principal, resources } = options;

    if (resources.length === 0) {
      return [];
    }

    try {
      const request = {
        principal: {
          id: principal.id,
          roles: principal.roles,
          attr: principal.attr,
        },
        resources: resources.map((r) => ({
          resource: {
            kind: r.resource.kind,
            id: r.resource.id,
            attr: r.resource.attr,
          },
          actions: r.actions,
        })),
      };

      const response = await this.client.checkResources(request);

      const results: CerbosBatchCheckResult[] = response.results.map(
        (result: any) => {
          const actions: Record<ResourceAction, boolean> = {} as any;

          for (const [action, decision] of Object.entries(result.actions)) {
            actions[action as ResourceAction] = (decision as any).allowed;
          }

          return {
            resourceId: result.resource.id,
            actions,
          };
        }
      );

      logger.debug('Batch permission check completed', {
        principal: principal.id,
        resourceCount: resources.length,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Batch permission check failed', {
        error,
        principal: principal.id,
        resourceCount: resources.length,
      });
      throw error;
    }
  }

  public async getQueryPlan(
    options: CerbosQueryPlanOptions
  ): Promise<CerbosQueryPlanResult> {
    const { principal, resource, action } = options;

    try {
      const request = {
        principal: {
          id: principal.id,
          roles: principal.roles,
          attr: principal.attr,
        },
        resource: {
          kind: resource.kind,
          attr: resource.attr || {},
        },
        action,
      };

      const response = await this.client.planResources(request);

      let condition: string | undefined;
      if (response.filter.kind === 'CONDITIONAL' && response.filter.condition) {
        condition = this.convertConditionToSQL(response.filter.condition);
      }

      const result: CerbosQueryPlanResult = {
        filter: {
          kind: response.filter.kind,
          condition,
        },
        validationErrors: response.validationErrors?.map((e: any) =>
          `${e.path}: ${e.message}`
        ),
      };

      logger.debug('Query plan generated', {
        principal: principal.id,
        resource: resource.kind,
        action,
        filterKind: result.filter.kind,
      });

      return result;
    } catch (error) {
      logger.error('Query plan generation failed', {
        error,
        principal: principal.id,
        resource: resource.kind,
        action,
      });
      throw error;
    }
  }

  public async isHealthy(): Promise<boolean> {
    const now = Date.now();

    if (this.healthCheckCache && this.healthCheckCache.expiry > now) {
      return this.healthCheckCache.value;
    }

    try {
      const healthy = await this.client.isHealthy();

      this.healthCheckCache = {
        value: healthy,
        expiry: now + this.HEALTH_CHECK_TTL,
      };

      logger.debug('Cerbos health check', { healthy });
      return healthy;
    } catch (error) {
      logger.error('Cerbos health check failed', { error });

      this.healthCheckCache = {
        value: false,
        expiry: now + this.HEALTH_CHECK_TTL,
      };

      return false;
    }
  }

  private getCacheKey(...parts: string[]): string {
    return parts.join(':');
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private setCache<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.cacheTTL,
    });
  }

  private convertConditionToSQL(condition: any): string {
    if (!condition.expression) {
      return '';
    }

    return this.expressionToSQL(condition.expression);
  }

  private expressionToSQL(expr: any): string {
    const { operator, operands } = expr;

    switch (operator) {
      case 'eq':
        return `${this.operandToSQL(operands[0])} = ${this.operandToSQL(operands[1])}`;

      case 'ne':
        return `${this.operandToSQL(operands[0])} != ${this.operandToSQL(operands[1])}`;

      case 'in':
        const values = operands[1].value;
        const valueList = Array.isArray(values)
          ? values.map((v: any) => `'${v}'`).join(', ')
          : `'${values}'`;
        return `${this.operandToSQL(operands[0])} IN (${valueList})`;

      case 'and':
        return operands
          .map((op: any) => `(${this.expressionToSQL(op)})`)
          .join(' AND ');

      case 'or':
        return operands
          .map((op: any) => `(${this.expressionToSQL(op)})`)
          .join(' OR ');

      case 'not':
        return `NOT (${this.expressionToSQL(operands[0])})`;

      default:
        logger.warn('Unknown condition operator', { operator });
        return '1=1';
    }
  }

  private operandToSQL(operand: any): string {
    if (operand.variable) {
      const path = operand.variable.replace('request.resource.attr.', '');
      return path;
    }

    if (operand.value !== undefined) {
      if (typeof operand.value === 'string') {
        return `'${operand.value}'`;
      }
      return String(operand.value);
    }

    return 'NULL';
  }
}

export default CerbosAuthService.getInstance();