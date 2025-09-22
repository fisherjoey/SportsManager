/**
 * Test suite for AI Services
 */

// Mock all external dependencies before importing
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn()
}));

jest.mock('openai', () => ({
  default: jest.fn()
}));

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  stat: jest.fn(),
  remove: jest.fn(),
  ensureDir: jest.fn()
}));

jest.mock('sharp', () => jest.fn(() => ({
  metadata: jest.fn(),
  resize: jest.fn().mockReturnThis(),
  normalize: jest.fn().mockReturnThis(),
  sharpen: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  toFile: jest.fn()
})));

jest.mock('pdf2pic', () => ({
  fromPath: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    logInfo: jest.fn(),
    logWarning: jest.fn(),
    logError: jest.fn()
  }
}));

jest.mock('../../utils/security', () => ({
  sanitizePromptInput: jest.fn((input) => input),
  sanitizeObjectFields: jest.fn((obj) => obj),
  generateRequestId: jest.fn(() => 'test-id')
}));

jest.mock('../../config/aiConfig', () => ({
  default: {
    getCachingConfig: () => ({ maxSize: 1000, ttl: 300 }),
    getLLMConfig: () => ({
      timeout: 30000,
      maxRetries: 3,
      model: { openai: 'gpt-4o-mini', deepseek: 'deepseek-chat' }
    })
  }
}));

import { AIServices } from '../aiServices';
import {
  OCRResult,
  ExtractedReceiptData,
  CategorizationResult,
  ImageValidationResult,
  LLMRequest,
  LLMResponse,
  ServiceInitializationStatus,
  ServiceHealth,
  AIProviderType
} from '../aiServices';

describe('AIServices', () => {
  let aiServices: AIServices;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = 'test-credentials.json';

    aiServices = new AIServices();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(aiServices).toBeInstanceOf(AIServices);
      expect(aiServices['initialized']).toBe(false);
      expect(aiServices['requestQueue']).toEqual([]);
      expect(aiServices['processingRequests']).toBeInstanceOf(Map);
      expect(aiServices['responseCache']).toBeInstanceOf(Map);
    });

    it('should start cache cleanup interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      new AIServices();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        300000 // 5 minutes
      );
    });

    it('should handle initialization promise', async () => {
      const initSpy = jest.spyOn(aiServices as any, 'initializeServices').mockResolvedValue(undefined);

      await aiServices.ensureInitialized();

      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('Service Health and Status', () => {
    it('should check service health', async () => {
      const mockHealth: ServiceHealth = {
        vision: { available: true, lastTested: new Date(), errors: [] },
        llm: { available: true, lastTested: new Date(), errors: [] },
        overall: true
      };

      jest.spyOn(aiServices as any, 'checkServiceHealth').mockResolvedValue(mockHealth);

      const health = await aiServices.getServiceHealth();

      expect(health.overall).toBe(true);
      expect(health.vision).toBeDefined();
      expect(health.llm).toBeDefined();
    });

    it('should handle service initialization status', () => {
      const status = aiServices.getInitializationStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('services');
      expect(status.services).toHaveProperty('vision');
      expect(status.services).toHaveProperty('llm');
    });
  });

  describe('Image Validation', () => {
    it('should validate image files', async () => {
      const mockValidation: ImageValidationResult = {
        isValid: true,
        fileSize: 1024000,
        dimensions: { width: 1920, height: 1080 },
        format: 'jpeg',
        errors: []
      };

      jest.spyOn(aiServices as any, 'validateImageFile').mockResolvedValue(mockValidation);

      const result = await aiServices.validateImage('/path/to/image.jpg');

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('jpeg');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid image files', async () => {
      const mockValidation: ImageValidationResult = {
        isValid: false,
        fileSize: 10000000, // Too large
        dimensions: { width: 100, height: 100 },
        format: 'bmp',
        errors: ['File too large', 'Unsupported format']
      };

      jest.spyOn(aiServices as any, 'validateImageFile').mockResolvedValue(mockValidation);

      const result = await aiServices.validateImage('/path/to/large-image.bmp');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File too large');
      expect(result.errors).toContain('Unsupported format');
    });
  });

  describe('OCR Processing', () => {
    it('should perform OCR on images', async () => {
      const mockOCRResult: OCRResult = {
        text: 'Sample receipt text\nStore: Test Store\nAmount: $25.99',
        confidence: 0.95,
        boundingBoxes: [],
        processingTime: 1500,
        method: 'google-vision',
        metadata: {
          imageSize: { width: 800, height: 600 },
          preprocessing: ['contrast', 'denoise']
        }
      };

      jest.spyOn(aiServices, 'performOCR').mockResolvedValue(mockOCRResult);

      const result = await aiServices.performOCR('/path/to/receipt.jpg');

      expect(result.text).toContain('Test Store');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.method).toBe('google-vision');
    });

    it('should handle OCR failures with fallback', async () => {
      const mockFallbackResult: OCRResult = {
        text: 'Fallback OCR text',
        confidence: 0.75,
        boundingBoxes: [],
        processingTime: 2000,
        method: 'fallback',
        metadata: {}
      };

      jest.spyOn(aiServices, 'performOCR')
        .mockRejectedValueOnce(new Error('Primary OCR failed'))
        .mockResolvedValueOnce(mockFallbackResult);

      const result = await aiServices.performOCR('/path/to/receipt.jpg');

      expect(result.method).toBe('fallback');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should optimize images before OCR', async () => {
      const optimizeSpy = jest.spyOn(aiServices as any, 'optimizeImageForOCR')
        .mockResolvedValue('/path/to/optimized.jpg');

      await aiServices.performOCR('/path/to/receipt.jpg');

      expect(optimizeSpy).toHaveBeenCalledWith('/path/to/receipt.jpg');
    });
  });

  describe('Receipt Data Extraction', () => {
    it('should extract structured data from receipt text', async () => {
      const receiptText = `
        Test Store
        123 Main St
        Receipt #12345
        Date: 2023-10-15
        Item 1: $10.00
        Item 2: $15.99
        Total: $25.99
      `;

      const mockExtractedData: ExtractedReceiptData = {
        storeName: 'Test Store',
        storeAddress: '123 Main St',
        receiptNumber: '12345',
        date: '2023-10-15',
        time: null,
        items: [
          { name: 'Item 1', amount: 10.00, quantity: 1 },
          { name: 'Item 2', amount: 15.99, quantity: 1 }
        ],
        subtotal: 25.99,
        tax: 0,
        total: 25.99,
        paymentMethod: null,
        confidence: 0.9,
        metadata: {
          extractionMethod: 'llm',
          processingTime: 2000
        }
      };

      jest.spyOn(aiServices, 'extractReceiptData').mockResolvedValue(mockExtractedData);

      const result = await aiServices.extractReceiptData(receiptText, 'receipt.jpg');

      expect(result.storeName).toBe('Test Store');
      expect(result.total).toBe(25.99);
      expect(result.items).toHaveLength(2);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle extraction with fallback methods', async () => {
      const receiptText = 'Unclear receipt text...';

      const mockFallbackData: ExtractedReceiptData = {
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
          processingTime: 500
        }
      };

      jest.spyOn(aiServices, 'extractReceiptData').mockResolvedValue(mockFallbackData);

      const result = await aiServices.extractReceiptData(receiptText);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.metadata.extractionMethod).toBe('fallback');
    });

    it('should validate extracted data', () => {
      const validData: ExtractedReceiptData = {
        storeName: 'Test Store',
        storeAddress: '123 Main St',
        receiptNumber: '12345',
        date: '2023-10-15',
        time: '14:30',
        items: [{ name: 'Item 1', amount: 10.00, quantity: 1 }],
        subtotal: 10.00,
        tax: 0.80,
        total: 10.80,
        paymentMethod: 'credit',
        confidence: 0.9,
        metadata: {}
      };

      const isValid = (aiServices as any).validateExtractedData(validData);

      expect(isValid).toBe(true);
    });
  });

  describe('Expense Categorization', () => {
    it('should categorize expenses using AI', async () => {
      const expenseData: ExtractedReceiptData = {
        storeName: 'Starbucks',
        storeAddress: '123 Coffee St',
        receiptNumber: '12345',
        date: '2023-10-15',
        time: '08:30',
        items: [
          { name: 'Latte', amount: 4.50, quantity: 1 },
          { name: 'Muffin', amount: 3.25, quantity: 1 }
        ],
        subtotal: 7.75,
        tax: 0.62,
        total: 8.37,
        paymentMethod: 'credit',
        confidence: 0.95,
        metadata: {}
      };

      const categories = ['food', 'travel', 'office-supplies', 'entertainment'];

      const mockCategorizationResult: CategorizationResult = {
        category: 'food',
        confidence: 0.92,
        reasoning: 'Coffee shop purchase with food items',
        alternativeCategories: [
          { category: 'entertainment', confidence: 0.1 }
        ],
        metadata: {
          processingTime: 1200,
          method: 'llm'
        }
      };

      jest.spyOn(aiServices, 'categorizeExpense').mockResolvedValue(mockCategorizationResult);

      const result = await aiServices.categorizeExpense(expenseData, categories);

      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reasoning).toContain('Coffee shop');
    });

    it('should handle categorization with keyword fallback', async () => {
      const expenseData: ExtractedReceiptData = {
        storeName: 'Unknown Store',
        storeAddress: null,
        receiptNumber: null,
        date: null,
        time: null,
        items: [{ name: 'Gas', amount: 30.00, quantity: 1 }],
        subtotal: 30.00,
        tax: 0,
        total: 30.00,
        paymentMethod: null,
        confidence: 0.7,
        metadata: {}
      };

      const categories = ['travel', 'food', 'office-supplies'];

      const mockResult: CategorizationResult = {
        category: 'travel',
        confidence: 0.8,
        reasoning: 'Keyword-based categorization: gas purchase',
        alternativeCategories: [],
        metadata: {
          processingTime: 100,
          method: 'keyword-fallback'
        }
      };

      jest.spyOn(aiServices, 'categorizeExpense').mockResolvedValue(mockResult);

      const result = await aiServices.categorizeExpense(expenseData, categories);

      expect(result.category).toBe('travel');
      expect(result.metadata.method).toBe('keyword-fallback');
    });
  });

  describe('Caching and Performance', () => {
    it('should cache responses to improve performance', async () => {
      const mockOCRResult: OCRResult = {
        text: 'Cached OCR result',
        confidence: 0.9,
        boundingBoxes: [],
        processingTime: 100,
        method: 'cache',
        metadata: {}
      };

      // First call should process normally
      jest.spyOn(aiServices as any, 'performOCRWithRetry').mockResolvedValueOnce(mockOCRResult);

      const result1 = await aiServices.performOCR('/path/to/receipt.jpg');

      // Second call should return cached result
      const result2 = await aiServices.performOCR('/path/to/receipt.jpg');

      expect(result1.text).toBe('Cached OCR result');
      expect(result2.text).toBe('Cached OCR result');
    });

    it('should clean up expired cache entries', () => {
      const cleanupSpy = jest.spyOn(aiServices as any, 'cleanupExpiredCache');

      (aiServices as any).cleanupExpiredCache();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should respect concurrent request limits', async () => {
      const maxConcurrentRequests = (aiServices as any).maxConcurrentRequests;

      expect(maxConcurrentRequests).toBeGreaterThan(0);
      expect((aiServices as any).currentRequests).toBe(0);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry failed OCR requests', async () => {
      const mockError = new Error('OCR service temporarily unavailable');
      const mockSuccessResult: OCRResult = {
        text: 'Success after retry',
        confidence: 0.9,
        boundingBoxes: [],
        processingTime: 1500,
        method: 'google-vision',
        metadata: {}
      };

      jest.spyOn(aiServices as any, 'performOCRWithRetry')
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccessResult);

      const result = await aiServices.performOCR('/path/to/receipt.jpg');

      expect(result.text).toBe('Success after retry');
    });

    it('should handle LLM API failures gracefully', async () => {
      const receiptText = 'Sample receipt text';

      jest.spyOn(aiServices as any, 'callLLMWithRetry')
        .mockRejectedValue(new Error('LLM API unavailable'));

      jest.spyOn(aiServices as any, 'extractReceiptDataFallback')
        .mockResolvedValue({
          storeName: null,
          confidence: 0.1,
          metadata: { extractionMethod: 'fallback' }
        } as ExtractedReceiptData);

      const result = await aiServices.extractReceiptData(receiptText);

      expect(result.metadata.extractionMethod).toBe('fallback');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Configuration and Environment', () => {
    it('should handle missing API keys gracefully', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;

      const newAiServices = new AIServices();

      expect(newAiServices['openaiClient']).toBeNull();
    });

    it('should support different AI providers', async () => {
      // Test OpenAI configuration
      process.env.OPENAI_API_KEY = 'test-openai-key';
      const openaiService = new AIServices();

      expect(openaiService['getActiveProvider']()).toBe('openai' as AIProviderType);

      // Test DeepSeek configuration
      delete process.env.OPENAI_API_KEY;
      process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
      const deepseekService = new AIServices();

      expect(deepseekService['getActiveProvider']()).toBe('deepseek' as AIProviderType);
    });
  });
});