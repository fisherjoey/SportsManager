/**
 * AI Services for OCR, text extraction, and intelligent categorization
 * Supports Google Vision API and OpenAI/DeepSeek integrations
 */

import vision from '@google-cloud/vision';
import OpenAI from 'openai';
import fs from 'fs-extra';
import sharp from 'sharp';
import pdf2pic from 'pdf2pic';
import path from 'path';
import { logger } from '../utils/logger';
import aiConfig from '../config/aiConfig';

import { sanitizePromptInput, sanitizeObjectFields, generateRequestId } from '../utils/security';

/**
 * AI Provider types
 */
export type AIProviderType = 'openai' | 'deepseek' | 'none';

/**
 * OCR detection method
 */
export type OCRMethod = 'google-vision' | 'fallback' | 'cache';

/**
 * Extraction method
 */
export type ExtractionMethod = 'llm' | 'fallback' | 'keyword-fallback';

/**
 * Bounding box for text detection
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * OCR processing result
 */
export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: BoundingBox[];
  processingTime: number;
  method: OCRMethod;
  metadata: {
    imageSize?: ImageDimensions;
    preprocessing?: string[];
    fallbackReason?: string;
    [key: string]: any;
  };
}

/**
 * Receipt line item
 */
export interface ReceiptLineItem {
  name: string;
  amount: number;
  quantity: number;
  category?: string;
  unitPrice?: number;
}

/**
 * Extracted receipt data structure
 */
export interface ExtractedReceiptData {
  storeName: string | null;
  storeAddress: string | null;
  receiptNumber: string | null;
  date: string | null;
  time: string | null;
  items: ReceiptLineItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  paymentMethod: string | null;
  confidence: number;
  metadata: {
    extractionMethod: ExtractionMethod;
    processingTime: number;
    fallbackReason?: string;
    [key: string]: any;
  };
}

/**
 * Image validation result
 */
export interface ImageValidationResult {
  isValid: boolean;
  fileSize: number;
  dimensions: ImageDimensions;
  format: string;
  errors: string[];
}

/**
 * Categorization alternative
 */
export interface CategorizationAlternative {
  category: string;
  confidence: number;
}

/**
 * Expense categorization result
 */
export interface CategorizationResult {
  category: string;
  confidence: number;
  reasoning: string;
  alternativeCategories: CategorizationAlternative[];
  metadata: {
    processingTime: number;
    method: ExtractionMethod;
    [key: string]: any;
  };
}

/**
 * LLM request options
 */
export interface LLMRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

/**
 * LLM response
 */
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  processingTime: number;
}

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  available: boolean;
  lastTested: Date;
  errors: string[];
}

/**
 * Overall service health
 */
export interface ServiceHealth {
  vision: ServiceHealthStatus;
  llm: ServiceHealthStatus;
  overall: boolean;
}

/**
 * Service initialization status
 */
export interface ServiceInitializationStatus {
  initialized: boolean;
  services: {
    vision: boolean;
    llm: boolean;
  };
  provider: AIProviderType;
  errors: string[];
}

/**
 * Cache entry for AI responses
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * AI Services configuration
 */
interface AIServicesConfig {
  maxCacheSize: number;
  cacheTTL: number;
  maxConcurrentRequests: number;
  retryAttempts: number;
  timeout: number;
}

/**
 * Request queue item
 */
interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  priority: number;
}

/**
 * AI Services class providing OCR, text extraction, and categorization
 */
export class AIServices {
  private visionClient: any | null = null;
  private openaiClient: OpenAI | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void>;

  // Performance optimization
  private requestQueue: QueuedRequest[] = [];
  private processingRequests: Map<string, Promise<any>> = new Map();
  private responseCache: Map<string, CacheEntry> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  // Configuration
  private readonly config: AIServicesConfig;
  private currentRequests: number = 0;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Get configuration
    const cachingConfig = aiConfig.getCachingConfig();
    this.config = {
      maxCacheSize: cachingConfig.maxSize,
      cacheTTL: cachingConfig.ttl * 1000, // Convert to milliseconds
      maxConcurrentRequests: 3,
      retryAttempts: 3,
      timeout: 30000
    };

    this.initPromise = this.initializeServices();

    // Start cache cleanup interval
    this.startCacheCleanup();
  }

  /**
   * Ensure services are initialized before use
   */
  async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  /**
   * Get service initialization status
   */
  getInitializationStatus(): ServiceInitializationStatus {
    return {
      initialized: this.initialized,
      services: {
        vision: this.visionClient !== null,
        llm: this.openaiClient !== null
      },
      provider: this.getActiveProvider(),
      errors: []
    };
  }

  /**
   * Get current service health
   */
  async getServiceHealth(): Promise<ServiceHealth> {
    const health: ServiceHealth = {
      vision: { available: false, lastTested: new Date(), errors: [] },
      llm: { available: false, lastTested: new Date(), errors: [] },
      overall: false
    };

    try {
      // Test Vision API
      if (this.visionClient) {
        const visionTest = await this.testVisionAPI();
        health.vision.available = visionTest;
      }
    } catch (error) {
      health.vision.errors.push((error as Error).message);
    }

    try {
      // Test LLM API
      if (this.openaiClient) {
        const llmTest = await this.testLLMAPI(this.getActiveProvider());
        health.llm.available = llmTest;
      }
    } catch (error) {
      health.llm.errors.push((error as Error).message);
    }

    health.overall = health.vision.available || health.llm.available;
    return health;
  }

  /**
   * Validate image file
   */
  async validateImage(imagePath: string): Promise<ImageValidationResult> {
    return this.validateImageFile(imagePath);
  }

  /**
   * Perform OCR on an image
   */
  async performOCR(imagePath: string): Promise<OCRResult> {
    await this.ensureInitialized();

    const cacheKey = `ocr:${imagePath}`;
    const cached = this.getFromCache<OCRResult>(cacheKey);
    if (cached) {
      return { ...cached, method: 'cache' as OCRMethod };
    }

    try {
      const result = await this.performOCRWithRetry(imagePath);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('OCR processing failed', {
        component: 'aiServices',
        operation: 'performOCR',
        imagePath,
        error
      });

      // Try fallback OCR
      try {
        const fallbackResult = await this.performFallbackOCR(imagePath);
        this.setCache(cacheKey, fallbackResult);
        return fallbackResult;
      } catch (fallbackError) {
        throw new Error(`All OCR methods failed: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Extract structured data from receipt text
   */
  async extractReceiptData(receiptText: string, fileName: string = ''): Promise<ExtractedReceiptData> {
    await this.ensureInitialized();

    const sanitizedText = sanitizePromptInput(receiptText);
    const cacheKey = `extraction:${this.generateCacheKey(sanitizedText, fileName)}`;

    const cached = this.getFromCache<ExtractedReceiptData>(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      if (!this.openaiClient) {
        throw new Error('LLM service not available');
      }

      const prompt = this.buildImprovedExtractionPrompt(sanitizedText, fileName);
      const response = await this.callLLMWithRetry({
        prompt,
        maxTokens: 1500,
        temperature: 0.1
      });

      const extractedData = await this.parseJSONResponse(response.content, sanitizedText, fileName);
      extractedData.metadata = {
        ...extractedData.metadata,
        extractionMethod: 'llm' as ExtractionMethod,
        processingTime: Date.now() - startTime
      };

      this.setCache(cacheKey, extractedData);
      return extractedData;

    } catch (error) {
      logger.logWarning('LLM extraction failed, using fallback', {
        component: 'aiServices',
        operation: 'extractReceiptData',
        error: (error as Error).message
      });

      const fallbackData = await this.extractReceiptDataFallback(sanitizedText, fileName);
      fallbackData.metadata = {
        ...fallbackData.metadata,
        extractionMethod: 'fallback' as ExtractionMethod,
        processingTime: Date.now() - startTime,
        fallbackReason: (error as Error).message
      };

      this.setCache(cacheKey, fallbackData);
      return fallbackData;
    }
  }

  /**
   * Categorize expense using AI
   */
  async categorizeExpense(expenseData: ExtractedReceiptData, categories: string[]): Promise<CategorizationResult> {
    await this.ensureInitialized();

    const cacheKey = `categorization:${this.generateCacheKey(JSON.stringify(expenseData), categories.join(','))}`;

    const cached = this.getFromCache<CategorizationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      if (!this.openaiClient) {
        throw new Error('LLM service not available');
      }

      const prompt = this.buildImprovedCategorizationPrompt(expenseData, categories);
      const response = await this.callLLMWithRetry({
        prompt,
        maxTokens: 300,
        temperature: 0.2
      });

      const result = JSON.parse(response.content) as CategorizationResult;
      result.metadata = {
        processingTime: Date.now() - startTime,
        method: 'llm' as ExtractionMethod
      };

      if (!this.validateCategorizationResult(result, categories)) {
        throw new Error('Invalid categorization result');
      }

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      logger.logWarning('LLM categorization failed, using keyword fallback', {
        component: 'aiServices',
        operation: 'categorizeExpense',
        error: (error as Error).message
      });

      const fallbackResult = this.keywordBasedCategorization(expenseData, categories);
      fallbackResult.metadata = {
        processingTime: Date.now() - startTime,
        method: 'keyword-fallback' as ExtractionMethod
      };

      this.setCache(cacheKey, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Initialize AI services
   * @private
   */
  private async initializeServices(): Promise<void> {
    try {
      // Initialize Google Vision API
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && await fs.pathExists(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        try {
          this.visionClient = new vision.ImageAnnotatorClient();
          await this.testVisionAPI();

          logger.logInfo('Google Vision API initialized and tested successfully', {
            component: 'aiServices',
            service: 'vision'
          });
        } catch (testError) {
          logger.logWarning('Google Vision API test failed, continuing with fallback OCR methods', {
            component: 'aiServices',
            service: 'vision',
            error: (testError as Error).message
          });
          this.visionClient = null;
        }
      } else {
        logger.logWarning('Google Vision API credentials not found, OCR will use fallback methods', {
          component: 'aiServices',
          service: 'vision'
        });
      }

      // Initialize OpenAI/DeepSeek API
      const llmConfig = aiConfig.getLLMConfig();
      if (process.env.OPENAI_API_KEY) {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: llmConfig.timeout,
          maxRetries: llmConfig.maxRetries
        });
        await this.testLLMAPI('openai');

        logger.logInfo('OpenAI API initialized and tested successfully', {
          component: 'aiServices',
          service: 'openai',
          model: llmConfig.model.openai
        });
      } else if (process.env.DEEPSEEK_API_KEY) {
        this.openaiClient = new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com/v1',
          timeout: llmConfig.timeout,
          maxRetries: llmConfig.maxRetries
        });
        await this.testLLMAPI('deepseek');

        logger.logInfo('DeepSeek API initialized and tested successfully', {
          component: 'aiServices',
          service: 'deepseek',
          model: llmConfig.model.deepseek
        });
      } else {
        logger.logWarning('OpenAI/DeepSeek API key not found, LLM processing will be disabled', {
          component: 'aiServices',
          service: 'llm'
        });
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Error initializing AI services', {
        component: 'aiServices',
        operation: 'initialization',
        error
      });
    }
  }

  /**
   * Get the active AI provider
   * @private
   */
  private getActiveProvider(): AIProviderType {
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
    return 'none';
  }

  /**
   * Test Google Vision API connectivity
   * @private
   */
  private async testVisionAPI(): Promise<boolean> {
    if (!this.visionClient) {
      return false;
    }

    try {
      // Create a small test image (1x1 white pixel)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
      );

      const [result] = await this.visionClient.textDetection({
        image: { content: testImageBuffer },
      });

      return true;
    } catch (error) {
      throw new Error(`Vision API test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Test LLM API connectivity
   * @private
   */
  private async testLLMAPI(provider: AIProviderType): Promise<boolean> {
    if (!this.openaiClient) {
      return false;
    }

    try {
      const model = provider === 'openai' ? 'gpt-4o-mini' : (process.env.DEEPSEEK_MODEL || 'deepseek-chat');

      const response = await this.openaiClient.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Test connection - respond with "OK"' }],
        max_tokens: 5,
        temperature: 0
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from API');
      }

      return true;
    } catch (error) {
      throw new Error(`LLM API test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Start cache cleanup interval
   * @private
   */
  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Clean up expired cache entries
   * @private
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.responseCache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.responseCache.delete(key);
      this.cacheTimestamps.delete(key);
    }

    // Enforce max cache size
    if (this.responseCache.size > this.config.maxCacheSize) {
      const sortedEntries = Array.from(this.cacheTimestamps.entries())
        .sort(([,a], [,b]) => a - b);

      const entriesToRemove = sortedEntries.slice(0, this.responseCache.size - this.config.maxCacheSize);

      for (const [key] of entriesToRemove) {
        this.responseCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  /**
   * Get item from cache
   * @private
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.responseCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.responseCache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set item in cache
   * @private
   */
  private setCache<T>(key: string, data: T): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.config.cacheTTL
    };

    this.responseCache.set(key, entry);
    this.cacheTimestamps.set(key, now);
  }

  /**
   * Generate cache key
   * @private
   */
  private generateCacheKey(...parts: string[]): string {
    return parts.join(':').replace(/[^a-zA-Z0-9:]/g, '_');
  }

  /**
   * Validate image file
   * @private
   */
  private async validateImageFile(imagePath: string): Promise<ImageValidationResult> {
    const result: ImageValidationResult = {
      isValid: false,
      fileSize: 0,
      dimensions: { width: 0, height: 0 },
      format: '',
      errors: []
    };

    try {
      const stats = await fs.stat(imagePath);
      result.fileSize = stats.size;

      // Check file size (max 10MB)
      if (result.fileSize > 10 * 1024 * 1024) {
        result.errors.push('File too large (max 10MB)');
      }

      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      result.dimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0
      };
      result.format = metadata.format || 'unknown';

      // Check supported formats
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff'];
      if (!supportedFormats.includes(result.format.toLowerCase())) {
        result.errors.push(`Unsupported format: ${result.format}`);
      }

      // Check minimum dimensions
      if (result.dimensions.width < 50 || result.dimensions.height < 50) {
        result.errors.push('Image too small (minimum 50x50)');
      }

      result.isValid = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Validation failed: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * Perform OCR with retry logic
   * @private
   */
  private async performOCRWithRetry(imagePath: string, maxRetries: number = 3): Promise<OCRResult> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.performOCRInternal(imagePath);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Internal OCR processing
   * @private
   */
  private async performOCRInternal(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();

    // Optimize image first
    const optimizedPath = await this.optimizeImageForOCR(imagePath);

    try {
      if (this.visionClient) {
        // Try Google Vision API first
        const [result] = await this.visionClient.textDetection({
          image: { path: optimizedPath }
        });

        const textAnnotations = result.textAnnotations || [];
        const fullText = textAnnotations[0]?.description || '';

        const boundingBoxes: BoundingBox[] = textAnnotations.slice(1).map(annotation => {
          const vertices = annotation.boundingPoly?.vertices || [];
          if (vertices.length >= 2) {
            return {
              x: vertices[0].x || 0,
              y: vertices[0].y || 0,
              width: (vertices[2]?.x || 0) - (vertices[0].x || 0),
              height: (vertices[2]?.y || 0) - (vertices[0].y || 0)
            };
          }
          return { x: 0, y: 0, width: 0, height: 0 };
        });

        return {
          text: fullText,
          confidence: this.calculateOverallConfidence(textAnnotations),
          boundingBoxes,
          processingTime: Date.now() - startTime,
          method: 'google-vision',
          metadata: {
            imageSize: await this.getImageDimensions(optimizedPath),
            preprocessing: ['optimization']
          }
        };
      } else {
        throw new Error('Google Vision API not available');
      }
    } finally {
      // Clean up optimized image if it's different from original
      if (optimizedPath !== imagePath) {
        try {
          await fs.remove(optimizedPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Fallback OCR implementation
   * @private
   */
  private async performFallbackOCR(imagePath: string): Promise<OCRResult> {
    const startTime = Date.now();

    // Simple fallback - could integrate with other OCR libraries
    // For now, return minimal result
    return {
      text: '',
      confidence: 0.1,
      boundingBoxes: [],
      processingTime: Date.now() - startTime,
      method: 'fallback',
      metadata: {
        fallbackReason: 'Primary OCR method failed'
      }
    };
  }

  /**
   * Optimize image for OCR
   * @private
   */
  private async optimizeImageForOCR(imagePath: string): Promise<string> {
    try {
      const outputPath = imagePath.replace(/\.[^.]+$/, '_optimized.png');

      await sharp(imagePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .normalize()
        .sharpen()
        .png({ quality: 95 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      // Return original path if optimization fails
      return imagePath;
    }
  }

  /**
   * Get image dimensions
   * @private
   */
  private async getImageDimensions(imagePath: string): Promise<ImageDimensions> {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0
      };
    } catch (error) {
      return { width: 0, height: 0 };
    }
  }

  /**
   * Calculate overall confidence from detections
   * @private
   */
  private calculateOverallConfidence(detections: any[]): number {
    if (!detections || detections.length === 0) return 0;

    // Simple confidence calculation - can be improved
    return Math.min(0.95, 0.5 + (detections.length * 0.01));
  }

  /**
   * Call LLM with retry logic
   * @private
   */
  private async callLLMWithRetry(options: LLMRequest, maxRetries: number = 3): Promise<LLMResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const model = this.getActiveProvider() === 'openai' ? 'gpt-4o-mini' : (process.env.DEEPSEEK_MODEL || 'deepseek-chat');

        const response = await this.openaiClient!.chat.completions.create({
          model: options.model || model,
          messages: [{ role: 'user', content: options.prompt }],
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.1
        });

        return {
          content: response.choices[0]?.message?.content || '',
          usage: response.usage ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          } : undefined,
          model: response.model,
          processingTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Parse JSON response from LLM
   * @private
   */
  private async parseJSONResponse(response: string, originalText: string, fileName: string): Promise<ExtractedReceiptData> {
    try {
      const parsed = JSON.parse(response);

      // Validate and clean the parsed data
      const cleaned = this.validateExtractedData(parsed);
      return cleaned;
    } catch (error) {
      // Fallback to rule-based extraction
      return this.extractDataWithRules(originalText, fileName);
    }
  }

  /**
   * Validate extracted data
   * @private
   */
  private validateExtractedData(data: any): ExtractedReceiptData {
    return {
      storeName: this.cleanString(data.storeName),
      storeAddress: this.cleanString(data.storeAddress),
      receiptNumber: this.cleanString(data.receiptNumber),
      date: this.cleanDate(data.date),
      time: this.cleanTime(data.time),
      items: this.cleanLineItems(data.items || []),
      subtotal: this.cleanAmount(data.subtotal),
      tax: this.cleanAmount(data.tax),
      total: this.cleanAmount(data.total),
      paymentMethod: this.cleanString(data.paymentMethod),
      confidence: Math.min(1, Math.max(0, data.confidence || 0.5)),
      metadata: data.metadata || {}
    };
  }

  /**
   * Clean string values
   * @private
   */
  private cleanString(value: any): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    return value.trim();
  }

  /**
   * Clean amount values
   * @private
   */
  private cleanAmount(value: any): number | null {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const cleaned = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(cleaned) ? null : cleaned;
    }
    return null;
  }

  /**
   * Clean date values
   * @private
   */
  private cleanDate(value: any): string | null {
    if (!value) return null;

    // Basic date validation and cleaning
    const dateStr = String(value).trim();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    return null;
  }

  /**
   * Clean time values
   * @private
   */
  private cleanTime(value: any): string | null {
    if (!value) return null;

    const timeStr = String(value).trim();
    if (timeStr.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      return timeStr;
    }

    return null;
  }

  /**
   * Clean line items
   * @private
   */
  private cleanLineItems(items: any[]): ReceiptLineItem[] {
    if (!Array.isArray(items)) return [];

    return items.map(item => ({
      name: this.cleanString(item.name) || 'Unknown Item',
      amount: this.cleanAmount(item.amount) || 0,
      quantity: this.cleanAmount(item.quantity) || 1,
      category: this.cleanString(item.category),
      unitPrice: this.cleanAmount(item.unitPrice)
    }));
  }

  /**
   * Fallback receipt data extraction
   * @private
   */
  private async extractReceiptDataFallback(receiptText: string, fileName: string): Promise<ExtractedReceiptData> {
    return this.extractDataWithRules(receiptText, fileName);
  }

  /**
   * Rule-based data extraction
   * @private
   */
  private extractDataWithRules(text: string, fileName: string): ExtractedReceiptData {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

    return {
      storeName: null,
      storeAddress: null,
      receiptNumber: null,
      date: null,
      time: null,
      items: [],
      subtotal: null,
      tax: null,
      total: null,
      paymentMethod: null,
      confidence: 0.3,
      metadata: {
        extractionMethod: 'fallback',
        processingTime: 0
      }
    };
  }

  /**
   * Keyword-based expense categorization
   * @private
   */
  private keywordBasedCategorization(expenseData: ExtractedReceiptData, categories: string[]): CategorizationResult {
    const keywords: Record<string, string[]> = {
      food: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'meal', 'lunch', 'dinner', 'breakfast'],
      travel: ['gas', 'fuel', 'hotel', 'airline', 'taxi', 'uber', 'lyft', 'parking'],
      'office-supplies': ['office', 'supplies', 'paper', 'pen', 'staples', 'printer'],
      entertainment: ['movie', 'theater', 'game', 'entertainment', 'fun']
    };

    const text = `${expenseData.storeName || ''} ${expenseData.items.map(i => i.name).join(' ')}`.toLowerCase();

    let bestCategory = categories[0] || 'other';
    let bestScore = 0;

    for (const category of categories) {
      const categoryKeywords = keywords[category] || [];
      let score = 0;

      for (const keyword of categoryKeywords) {
        if (text.includes(keyword)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return {
      category: bestCategory,
      confidence: Math.min(0.8, bestScore * 0.2),
      reasoning: `Keyword-based categorization: ${bestScore > 0 ? 'found matching keywords' : 'default category'}`,
      alternativeCategories: [],
      metadata: {
        processingTime: 0,
        method: 'keyword-fallback'
      }
    };
  }

  /**
   * Validate categorization result
   * @private
   */
  private validateCategorizationResult(result: any, categories: string[]): boolean {
    return result &&
           typeof result.category === 'string' &&
           categories.includes(result.category) &&
           typeof result.confidence === 'number' &&
           result.confidence >= 0 && result.confidence <= 1;
  }

  /**
   * Build improved extraction prompt
   * @private
   */
  private buildImprovedExtractionPrompt(receiptText: string, fileName: string): string {
    return `Extract structured data from this receipt text. Return valid JSON only.

Receipt text:
${receiptText}

Return JSON in this exact format:
{
  "storeName": "string or null",
  "storeAddress": "string or null",
  "receiptNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM or null",
  "items": [{"name": "string", "amount": number, "quantity": number}],
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "paymentMethod": "string or null",
  "confidence": number between 0 and 1
}`;
  }

  /**
   * Build improved categorization prompt
   * @private
   */
  private buildImprovedCategorizationPrompt(expenseData: ExtractedReceiptData, categories: string[]): string {
    return `Categorize this expense. Return valid JSON only.

Expense: ${expenseData.storeName || 'Unknown'} - $${expenseData.total || 0}
Items: ${expenseData.items.map(i => i.name).join(', ')}

Available categories: ${categories.join(', ')}

Return JSON in this exact format:
{
  "category": "one of the available categories",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation",
  "alternativeCategories": [{"category": "string", "confidence": number}]
}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.responseCache.clear();
    this.cacheTimestamps.clear();
  }
}

// Export a singleton instance
export const aiServices = new AIServices();

// Export the class for testing
export default aiServices;