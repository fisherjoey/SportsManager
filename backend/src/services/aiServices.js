const vision = require('@google-cloud/vision');
const OpenAI = require('openai');
const fs = require('fs-extra');
const sharp = require('sharp');

class AIServices {
  constructor() {
    this.visionClient = null;
    this.openaiClient = null;
    this.initializeServices();
  }

  initializeServices() {
    try {
      // Initialize Google Vision API
      if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_KEY_FILE) {
        this.visionClient = new vision.ImageAnnotatorClient({
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
          keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
        });
        console.log('Google Vision API initialized');
      } else {
        console.warn('Google Vision API credentials not found. OCR will use fallback methods.');
      }

      // Initialize OpenAI API
      if (process.env.OPENAI_API_KEY) {
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('OpenAI API initialized');
      } else if (process.env.DEEPSEEK_API_KEY) {
        this.openaiClient = new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com/v1'
        });
        console.log('DeepSeek API initialized');
      } else {
        console.warn('OpenAI/DeepSeek API key not found. LLM processing will be disabled.');
      }
    } catch (error) {
      console.error('Error initializing AI services:', error);
    }
  }

  /**
   * Perform OCR on an image using Google Vision API
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} OCR results with text and confidence
   */
  async performOCR(imagePath) {
    if (!this.visionClient) {
      throw new Error('Google Vision API not configured');
    }

    try {
      const startTime = Date.now();
      
      // Optimize image for OCR
      const optimizedPath = await this.optimizeImageForOCR(imagePath);
      
      const [result] = await this.visionClient.textDetection(optimizedPath);
      const detections = result.textAnnotations;
      
      const processingTime = Date.now() - startTime;
      
      if (!detections || detections.length === 0) {
        return {
          text: '',
          confidence: 0,
          processingTime,
          error: 'No text detected in image'
        };
      }

      // First annotation contains all detected text
      const fullText = detections[0].description;
      const confidence = this.calculateOverallConfidence(detections);
      
      // Clean up optimized image if it's different from original
      if (optimizedPath !== imagePath) {
        await fs.remove(optimizedPath);
      }

      return {
        text: fullText,
        confidence,
        processingTime,
        detections: detections.slice(1), // Individual word detections
        boundingBoxes: detections.slice(1).map(d => d.boundingPoly)
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Extract structured data from receipt text using LLM
   * @param {string} receiptText - Raw OCR text from receipt
   * @param {string} fileName - Original file name for context
   * @returns {Promise<Object>} Structured expense data
   */
  async extractReceiptData(receiptText, fileName = '') {
    if (!this.openaiClient) {
      throw new Error('DeepSeek API not configured');
    }

    const prompt = this.buildExtractionPrompt(receiptText, fileName);
    
    try {
      const startTime = Date.now();
      
      const completion = await this.openaiClient.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured data from receipt text. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });

      const processingTime = Date.now() - startTime;
      const response = completion.choices[0].message.content;
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(response);
      } catch (parseError) {
        // Try to extract JSON from response if it's wrapped in markdown
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      return {
        ...extractedData,
        processingTime,
        tokensUsed: completion.usage?.total_tokens || 0,
        model: completion.model
      };
    } catch (error) {
      console.error('LLM extraction error:', error);
      throw new Error(`Data extraction failed: ${error.message}`);
    }
  }

  /**
   * Categorize an expense using AI
   * @param {Object} expenseData - Extracted expense data
   * @param {Array} categories - Available expense categories
   * @returns {Promise<Object>} Category suggestion with confidence
   */
  async categorizeExpense(expenseData, categories) {
    if (!this.openaiClient) {
      // Fallback to keyword-based categorization
      return this.keywordBasedCategorization(expenseData, categories);
    }

    const prompt = this.buildCategorizationPrompt(expenseData, categories);
    
    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at categorizing business expenses. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      });

      const response = completion.choices[0].message.content;
      
      // Parse the JSON response
      let result;
      try {
        result = JSON.parse(response);
      } catch (parseError) {
        // Try to extract JSON from response if it's wrapped in markdown
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }
      
      return {
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        confidence: result.confidence,
        reasoning: result.reasoning,
        tokensUsed: completion.usage?.total_tokens || 0
      };
    } catch (error) {
      console.error('AI categorization error:', error);
      // Fallback to keyword-based categorization
      return this.keywordBasedCategorization(expenseData, categories);
    }
  }

  /**
   * Optimize image for better OCR results
   * @private
   */
  async optimizeImageForOCR(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      
      // If image is already optimized, return original
      if (metadata.width <= 2000 && metadata.height <= 2000 && metadata.format === 'png') {
        return imagePath;
      }

      const optimizedPath = imagePath.replace(/\.[^/.]+$/, '_optimized.png');
      
      await sharp(imagePath)
        .resize(2000, 2000, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .normalize()
        .sharpen()
        .png({ quality: 95 })
        .toFile(optimizedPath);
        
      return optimizedPath;
    } catch (error) {
      console.warn('Image optimization failed, using original:', error.message);
      return imagePath;
    }
  }

  /**
   * Calculate overall confidence from OCR detections
   * @private
   */
  calculateOverallConfidence(detections) {
    if (!detections || detections.length <= 1) return 0;
    
    const wordDetections = detections.slice(1);
    const confidences = wordDetections
      .map(d => d.confidence || 0.5)
      .filter(c => c > 0);
      
    if (confidences.length === 0) return 0.5;
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  /**
   * Build extraction prompt for LLM
   * @private
   */
  buildExtractionPrompt(receiptText, fileName) {
    return `Extract structured data from this receipt text and return as JSON:

Receipt Text:
${receiptText}

File Context: ${fileName}

Please extract the following information and return as JSON:
{
  "vendorName": "string or null",
  "vendorAddress": "string or null", 
  "vendorPhone": "string or null",
  "totalAmount": "number or null",
  "taxAmount": "number or null",
  "subtotalAmount": "number or null",
  "transactionDate": "YYYY-MM-DD or null",
  "transactionTime": "HH:MM or null",
  "receiptNumber": "string or null",
  "paymentMethod": "string or null",
  "lineItems": [
    {
      "description": "string",
      "quantity": "number or null",
      "unitPrice": "number or null",
      "totalPrice": "number or null"
    }
  ],
  "confidence": "number 0-1",
  "extractionNotes": "string - any issues or observations"
}

Rules:
- Return only valid JSON
- Use null for missing/unclear data
- Amounts should be numbers (no currency symbols)
- Dates in YYYY-MM-DD format
- Confidence should reflect data clarity (0-1)
- If receipt is unclear/corrupted, set confidence < 0.5`;
  }

  /**
   * Build categorization prompt for LLM
   * @private
   */
  buildCategorizationPrompt(expenseData, categories) {
    const categoriesText = categories.map(cat => 
      `ID: ${cat.id}, Name: ${cat.name}, Code: ${cat.code}, Keywords: ${JSON.stringify(cat.keywords)}`
    ).join('\n');

    return `Categorize this expense into one of the available categories:

Expense Data:
- Vendor: ${expenseData.vendorName || 'Unknown'}
- Amount: $${expenseData.totalAmount || 0}
- Description: ${expenseData.description || 'N/A'}
- Line Items: ${JSON.stringify(expenseData.lineItems || [])}

Available Categories:
${categoriesText}

Return JSON with:
{
  "categoryId": "uuid of best matching category",
  "categoryName": "name of category",
  "confidence": "number 0-1",
  "reasoning": "brief explanation of choice"
}`;
  }

  /**
   * Fallback keyword-based categorization
   * @private
   */
  keywordBasedCategorization(expenseData, categories) {
    const text = `${expenseData.vendorName || ''} ${expenseData.description || ''} ${JSON.stringify(expenseData.lineItems || [])}`.toLowerCase();
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const category of categories) {
      if (!category.keywords) continue;
      
      const keywords = Array.isArray(category.keywords) ? category.keywords : JSON.parse(category.keywords || '[]');
      let score = 0;
      
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    }
    
    return {
      categoryId: bestMatch?.id || null,
      categoryName: bestMatch?.name || 'Uncategorized',
      confidence: bestScore > 0 ? Math.min(bestScore * 0.3, 0.9) : 0.1,
      reasoning: bestScore > 0 ? `Matched ${bestScore} keywords` : 'No keyword matches found'
    };
  }
}

module.exports = new AIServices();