/**
 * Simple test suite for AI Services TypeScript migration
 * Testing core interfaces and basic functionality
 */

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

describe('AIServices TypeScript Interfaces', () => {
  describe('Type Definitions', () => {
    it('should have correct OCRResult interface', () => {
      const ocrResult: OCRResult = {
        text: 'Sample text',
        confidence: 0.9,
        boundingBoxes: [],
        processingTime: 1000,
        method: 'google-vision',
        metadata: {}
      };

      expect(ocrResult.text).toBe('Sample text');
      expect(ocrResult.confidence).toBe(0.9);
      expect(ocrResult.method).toBe('google-vision');
    });

    it('should have correct ExtractedReceiptData interface', () => {
      const receiptData: ExtractedReceiptData = {
        storeName: 'Test Store',
        storeAddress: '123 Main St',
        receiptNumber: '12345',
        date: '2023-10-15',
        time: '14:30',
        items: [
          { name: 'Item 1', amount: 10.50, quantity: 1 }
        ],
        subtotal: 10.50,
        tax: 0.84,
        total: 11.34,
        paymentMethod: 'credit',
        confidence: 0.95,
        metadata: {
          extractionMethod: 'llm',
          processingTime: 2000
        }
      };

      expect(receiptData.storeName).toBe('Test Store');
      expect(receiptData.items).toHaveLength(1);
      expect(receiptData.items[0].name).toBe('Item 1');
      expect(receiptData.metadata.extractionMethod).toBe('llm');
    });

    it('should have correct CategorizationResult interface', () => {
      const categorizationResult: CategorizationResult = {
        category: 'food',
        confidence: 0.92,
        reasoning: 'Restaurant purchase',
        alternativeCategories: [
          { category: 'entertainment', confidence: 0.1 }
        ],
        metadata: {
          processingTime: 1500,
          method: 'llm'
        }
      };

      expect(categorizationResult.category).toBe('food');
      expect(categorizationResult.confidence).toBe(0.92);
      expect(categorizationResult.alternativeCategories).toHaveLength(1);
      expect(categorizationResult.metadata.method).toBe('llm');
    });

    it('should have correct ServiceHealth interface', () => {
      const serviceHealth: ServiceHealth = {
        vision: {
          available: true,
          lastTested: new Date(),
          errors: []
        },
        llm: {
          available: true,
          lastTested: new Date(),
          errors: []
        },
        overall: true
      };

      expect(serviceHealth.vision.available).toBe(true);
      expect(serviceHealth.llm.available).toBe(true);
      expect(serviceHealth.overall).toBe(true);
    });

    it('should have correct AIProviderType values', () => {
      const openaiProvider: AIProviderType = 'openai';
      const deepseekProvider: AIProviderType = 'deepseek';
      const noneProvider: AIProviderType = 'none';

      expect(openaiProvider).toBe('openai');
      expect(deepseekProvider).toBe('deepseek');
      expect(noneProvider).toBe('none');
    });
  });

  describe('Data Validation Helpers', () => {
    it('should validate receipt line items structure', () => {
      const items = [
        { name: 'Coffee', amount: 4.50, quantity: 1 },
        { name: 'Sandwich', amount: 8.99, quantity: 2, category: 'food' }
      ];

      items.forEach(item => {
        expect(typeof item.name).toBe('string');
        expect(typeof item.amount).toBe('number');
        expect(typeof item.quantity).toBe('number');
        if (item.category) {
          expect(typeof item.category).toBe('string');
        }
      });
    });

    it('should validate bounding box structure', () => {
      const boundingBoxes = [
        { x: 10, y: 20, width: 100, height: 30 },
        { x: 50, y: 100, width: 150, height: 25, confidence: 0.9 }
      ];

      boundingBoxes.forEach(box => {
        expect(typeof box.x).toBe('number');
        expect(typeof box.y).toBe('number');
        expect(typeof box.width).toBe('number');
        expect(typeof box.height).toBe('number');
        if (box.confidence !== undefined) {
          expect(typeof box.confidence).toBe('number');
          expect(box.confidence).toBeGreaterThanOrEqual(0);
          expect(box.confidence).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('LLM Request/Response Types', () => {
    it('should have correct LLMRequest interface', () => {
      const request: LLMRequest = {
        prompt: 'Extract data from this receipt',
        model: 'gpt-4o-mini',
        maxTokens: 1500,
        temperature: 0.1,
        timeout: 30000
      };

      expect(request.prompt).toBe('Extract data from this receipt');
      expect(request.model).toBe('gpt-4o-mini');
      expect(request.maxTokens).toBe(1500);
      expect(request.temperature).toBe(0.1);
      expect(request.timeout).toBe(30000);
    });

    it('should have correct LLMResponse interface', () => {
      const response: LLMResponse = {
        content: 'Extracted data result',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300
        },
        model: 'gpt-4o-mini',
        processingTime: 2500
      };

      expect(response.content).toBe('Extracted data result');
      expect(response.usage?.totalTokens).toBe(300);
      expect(response.model).toBe('gpt-4o-mini');
      expect(response.processingTime).toBe(2500);
    });
  });

  describe('Image Validation Types', () => {
    it('should have correct ImageValidationResult interface', () => {
      const validationResult: ImageValidationResult = {
        isValid: true,
        fileSize: 1024000,
        dimensions: { width: 1920, height: 1080 },
        format: 'jpeg',
        errors: []
      };

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.fileSize).toBe(1024000);
      expect(validationResult.dimensions.width).toBe(1920);
      expect(validationResult.dimensions.height).toBe(1080);
      expect(validationResult.format).toBe('jpeg');
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should handle validation errors', () => {
      const invalidResult: ImageValidationResult = {
        isValid: false,
        fileSize: 15000000, // Too large
        dimensions: { width: 100, height: 100 },
        format: 'bmp',
        errors: ['File too large', 'Unsupported format']
      };

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('File too large');
      expect(invalidResult.errors).toContain('Unsupported format');
    });
  });

  describe('Service Status Types', () => {
    it('should have correct ServiceInitializationStatus interface', () => {
      const status: ServiceInitializationStatus = {
        initialized: true,
        services: {
          vision: true,
          llm: true
        },
        provider: 'openai',
        errors: []
      };

      expect(status.initialized).toBe(true);
      expect(status.services.vision).toBe(true);
      expect(status.services.llm).toBe(true);
      expect(status.provider).toBe('openai');
      expect(status.errors).toHaveLength(0);
    });
  });

  describe('Complex Data Structures', () => {
    it('should handle complex receipt with multiple items', () => {
      const complexReceipt: ExtractedReceiptData = {
        storeName: 'SuperMarket Plus',
        storeAddress: '456 Commerce Ave, City, ST 12345',
        receiptNumber: 'TXN-987654321',
        date: '2023-10-15',
        time: '15:42:33',
        items: [
          { name: 'Organic Bananas', amount: 3.49, quantity: 2, category: 'produce', unitPrice: 1.745 },
          { name: 'Whole Milk', amount: 4.29, quantity: 1, category: 'dairy' },
          { name: 'Bread Loaf', amount: 2.99, quantity: 1, category: 'bakery' },
          { name: 'Ground Coffee', amount: 12.99, quantity: 1, category: 'beverages' }
        ],
        subtotal: 23.76,
        tax: 1.90,
        total: 25.66,
        paymentMethod: 'credit_card',
        confidence: 0.94,
        metadata: {
          extractionMethod: 'llm',
          processingTime: 3200,
          imageQuality: 'high',
          textRegions: 15
        }
      };

      expect(complexReceipt.items).toHaveLength(4);
      expect(complexReceipt.items[0].unitPrice).toBe(1.745);
      expect(complexReceipt.metadata.imageQuality).toBe('high');

      // Verify all items have required fields
      complexReceipt.items.forEach(item => {
        expect(item.name).toBeDefined();
        expect(item.amount).toBeGreaterThan(0);
        expect(item.quantity).toBeGreaterThan(0);
      });

      // Verify totals make sense
      const itemsTotal = complexReceipt.items.reduce((sum, item) => sum + item.amount, 0);
      expect(itemsTotal).toBeCloseTo(complexReceipt.subtotal!, 2);
    });

    it('should handle categorization with alternatives', () => {
      const categorization: CategorizationResult = {
        category: 'travel',
        confidence: 0.85,
        reasoning: 'Gas station purchase with fuel-related items',
        alternativeCategories: [
          { category: 'automotive', confidence: 0.12 },
          { category: 'maintenance', confidence: 0.03 }
        ],
        metadata: {
          processingTime: 1800,
          method: 'llm',
          keywords: ['gas', 'fuel', 'chevron'],
          contextFactors: ['location_type', 'merchant_category']
        }
      };

      expect(categorization.alternativeCategories).toHaveLength(2);
      expect(categorization.metadata.keywords).toContain('gas');
      expect(categorization.metadata.contextFactors).toContain('location_type');

      // Verify confidence values sum to reasonable total
      const totalConfidence = categorization.confidence +
        categorization.alternativeCategories.reduce((sum, alt) => sum + alt.confidence, 0);
      expect(totalConfidence).toBeCloseTo(1.0, 1);
    });
  });
});