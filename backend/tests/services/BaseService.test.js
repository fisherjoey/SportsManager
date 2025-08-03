/**
 * BaseService Unit Tests
 * 
 * Tests for the foundational BaseService class that provides common CRUD operations,
 * transaction support, and error handling patterns.
 */

const BaseService = require('../../src/services/BaseService');

// Mock database
const mockDb = {
  transaction: jest.fn(),
  raw: jest.fn()
};

// Mock query builder
const mockQueryBuilder = {
  where: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  del: jest.fn(),
  returning: jest.fn(),
  first: jest.fn(),
  limit: jest.fn(),
  offset: jest.fn(),
  orderBy: jest.fn(),
  count: jest.fn(),
  leftJoin: jest.fn(),
  innerJoin: jest.fn(),
  clone: jest.fn(),
  clearSelect: jest.fn(),
  whereIn: jest.fn()
};

// Setup chainable mock methods
Object.keys(mockQueryBuilder).forEach(key => {
  mockQueryBuilder[key].mockReturnValue(mockQueryBuilder);
});

// Mock table function
mockDb.mockReturnValue = jest.fn(() => mockQueryBuilder);

describe('BaseService', () => {
  let service;
  let mockTable;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock database function
    mockTable = jest.fn(() => mockQueryBuilder);
    Object.setPrototypeOf(mockTable, mockDb);
    Object.assign(mockTable, mockDb);

    service = new BaseService('test_table', mockTable);
  });

  describe('Constructor', () => {
    it('should create service with required parameters', () => {
      expect(service.tableName).toBe('test_table');
      expect(service.db).toBe(mockTable);
    });

    it('should throw error without required parameters', () => {
      expect(() => new BaseService()).toThrow('BaseService requires tableName and db parameters');
      expect(() => new BaseService('table')).toThrow('BaseService requires tableName and db parameters');
    });

    it('should set default options', () => {
      expect(service.options.defaultLimit).toBe(50);
      expect(service.options.maxLimit).toBe(200);
      expect(service.options.defaultOrderBy).toBe('created_at');
    });

    it('should merge custom options', () => {
      const customService = new BaseService('table', mockTable, {
        defaultLimit: 25,
        customOption: true
      });

      expect(customService.options.defaultLimit).toBe(25);
      expect(customService.options.customOption).toBe(true);
      expect(customService.options.maxLimit).toBe(200); // Should keep defaults
    });
  });

  describe('findById', () => {
    const mockRecord = { id: '123', name: 'Test Record' };

    beforeEach(() => {
      mockQueryBuilder.first.mockResolvedValue(mockRecord);
    });

    it('should find record by ID', async () => {
      const result = await service.findById('123');

      expect(mockTable).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id', '123');
      expect(mockQueryBuilder.first).toHaveBeenCalled();
      expect(result).toEqual(mockRecord);
    });

    it('should handle select option', async () => {
      await service.findById('123', { select: ['id', 'name'] });

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(['id', 'name']);
    });

    it('should handle includes option', async () => {
      await service.findById('123', { include: ['users'] });

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
    });

    it('should throw error when record not found and throwOnNotFound is true', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(service.findById('123')).rejects.toThrow('test_tabl not found with id: 123');
    });

    it('should return null when record not found and throwOnNotFound is false', async () => {
      const serviceWithoutThrow = new BaseService('test_table', mockTable, { throwOnNotFound: false });
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await serviceWithoutThrow.findById('123');
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockQueryBuilder.first.mockRejectedValue(dbError);

      await expect(service.findById('123')).rejects.toThrow('Failed to find test_tabl: Database connection failed');
    });
  });

  describe('create', () => {
    const mockData = { name: 'New Record', value: 42 };
    const mockCreatedRecord = { id: '456', ...mockData, created_at: expect.any(Date) };

    beforeEach(() => {
      mockQueryBuilder.returning.mockResolvedValue([mockCreatedRecord]);
    });

    it('should create new record', async () => {
      const result = await service.create(mockData);

      expect(mockTable).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockData,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        })
      );
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockCreatedRecord);
    });

    it('should preserve existing timestamps', async () => {
      const dataWithTimestamps = {
        ...mockData,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-02')
      };

      await service.create(dataWithTimestamps);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(dataWithTimestamps);
    });

    it('should call afterCreate hook if defined', async () => {
      service.afterCreate = jest.fn();

      await service.create(mockData);

      expect(service.afterCreate).toHaveBeenCalledWith(mockCreatedRecord, {});
    });

    it('should handle unique constraint violations', async () => {
      const uniqueError = new Error('Unique constraint violation');
      uniqueError.code = '23505';
      mockQueryBuilder.returning.mockRejectedValue(uniqueError);

      await expect(service.create(mockData)).rejects.toThrow('test_tabl already exists');
    });

    it('should handle other database errors', async () => {
      const dbError = new Error('Database error');
      mockQueryBuilder.returning.mockRejectedValue(dbError);

      await expect(service.create(mockData)).rejects.toThrow('Failed to create test_tabl: Database error');
    });
  });

  describe('update', () => {
    const existingRecord = { id: '123', name: 'Old Name', created_at: new Date() };
    const updateData = { name: 'New Name' };
    const updatedRecord = { ...existingRecord, ...updateData, updated_at: expect.any(Date) };

    beforeEach(() => {
      mockQueryBuilder.first.mockResolvedValue(existingRecord);
      mockQueryBuilder.returning.mockResolvedValue([updatedRecord]);
    });

    it('should update existing record', async () => {
      const result = await service.update('123', updateData);

      expect(mockTable).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.where).toHaveBeenNthCalledWith(1, 'id', '123'); // First call for existence check
      expect(mockQueryBuilder.where).toHaveBeenNthCalledWith(2, 'id', '123'); // Second call for update
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        ...updateData,
        updated_at: expect.any(Date)
      });
      expect(result).toEqual(updatedRecord);
    });

    it('should throw error when record not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(service.update('123', updateData)).rejects.toThrow('test_tabl not found with id: 123');
    });

    it('should call afterUpdate hook if defined', async () => {
      service.afterUpdate = jest.fn();

      await service.update('123', updateData);

      expect(service.afterUpdate).toHaveBeenCalledWith(updatedRecord, existingRecord, {});
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Update failed');
      mockQueryBuilder.returning.mockRejectedValue(dbError);

      await expect(service.update('123', updateData)).rejects.toThrow('Failed to update test_tabl: Update failed');
    });
  });

  describe('delete', () => {
    const existingRecord = { id: '123', name: 'Test Record' };

    beforeEach(() => {
      mockQueryBuilder.first.mockResolvedValue(existingRecord);
      mockQueryBuilder.del.mockResolvedValue(1);
    });

    it('should delete existing record', async () => {
      const result = await service.delete('123');

      expect(mockTable).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id', '123');
      expect(mockQueryBuilder.del).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw error when record not found and throwOnNotFound is true', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      await expect(service.delete('123')).rejects.toThrow('test_tabl not found with id: 123');
    });

    it('should return false when record not found and throwOnNotFound is false', async () => {
      const serviceWithoutThrow = new BaseService('test_table', mockTable, { throwOnNotFound: false });
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await serviceWithoutThrow.delete('123');
      expect(result).toBe(false);
    });

    it('should call beforeDelete and afterDelete hooks if defined', async () => {
      service.beforeDelete = jest.fn();
      service.afterDelete = jest.fn();

      await service.delete('123');

      expect(service.beforeDelete).toHaveBeenCalledWith(existingRecord, {});
      expect(service.afterDelete).toHaveBeenCalledWith(existingRecord, {});
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Delete failed');
      mockQueryBuilder.del.mockRejectedValue(dbError);

      await expect(service.delete('123')).rejects.toThrow('Failed to delete test_tabl: Delete failed');
    });
  });

  describe('findWithPagination', () => {
    const mockRecords = [
      { id: '1', name: 'Record 1' },
      { id: '2', name: 'Record 2' }
    ];
    const mockCountResult = { total: 10 };

    beforeEach(() => {
      mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
      // Setup Promise.all resolution
      mockTable.mockImplementation((tableName) => {
        const qb = { ...mockQueryBuilder };
        if (qb.count && qb.first) {
          qb.count.mockReturnValue(qb);
          qb.first.mockResolvedValue(mockCountResult);
        }
        return qb;
      });
    });

    it('should return paginated results', async () => {
      // Mock the parallel query execution
      const mockQuery1 = { ...mockQueryBuilder };
      const mockQuery2 = { ...mockQueryBuilder };
      
      mockQueryBuilder.clone.mockReturnValue(mockQuery2);
      mockQuery2.count = jest.fn().mockReturnValue(mockQuery2);
      mockQuery2.first = jest.fn().mockResolvedValue(mockCountResult);
      
      // Mock Promise.all
      jest.spyOn(Promise, 'all').mockResolvedValue([mockRecords, mockCountResult]);

      const result = await service.findWithPagination({}, 1, 10);

      expect(result).toEqual({
        data: mockRecords,
        pagination: {
          page: 1,
          limit: 10,
          total: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      Promise.all.mockRestore();
    });

    it('should apply filters correctly', async () => {
      const filters = { status: 'active', category: 'test' };
      
      jest.spyOn(Promise, 'all').mockResolvedValue([mockRecords, mockCountResult]);

      await service.findWithPagination(filters, 1, 10);

      // Verify filters are applied (implementation will vary based on _applyFilters)
      expect(mockTable).toHaveBeenCalledWith('test_table');

      Promise.all.mockRestore();
    });

    it('should handle pagination parameters correctly', async () => {
      jest.spyOn(Promise, 'all').mockResolvedValue([mockRecords, mockCountResult]);

      await service.findWithPagination({}, 2, 5);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(5); // (2-1) * 5

      Promise.all.mockRestore();
    });

    it('should enforce maximum limit', async () => {
      jest.spyOn(Promise, 'all').mockResolvedValue([mockRecords, mockCountResult]);

      await service.findWithPagination({}, 1, 500); // Over maxLimit of 200

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(200);

      Promise.all.mockRestore();
    });
  });

  describe('findWhere', () => {
    const mockRecords = [{ id: '1', name: 'Test' }];
    const conditions = { status: 'active' };

    beforeEach(() => {
      mockQueryBuilder.mockResolvedValue(mockRecords);
    });

    it('should find records with conditions', async () => {
      const result = await service.findWhere(conditions);

      expect(mockTable).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(conditions);
      expect(result).toEqual(mockRecords);
    });

    it('should apply select option', async () => {
      await service.findWhere(conditions, { select: ['id', 'name'] });

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(['id', 'name']);
    });

    it('should apply ordering', async () => {
      await service.findWhere(conditions, { orderBy: 'name', orderDirection: 'desc' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('name', 'desc');
    });

    it('should apply limit', async () => {
      await service.findWhere(conditions, { limit: 5 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('bulkCreate', () => {
    const mockRecords = [
      { name: 'Record 1' },
      { name: 'Record 2' }
    ];
    const mockCreatedRecords = [
      { id: '1', name: 'Record 1', created_at: new Date() },
      { id: '2', name: 'Record 2', created_at: new Date() }
    ];

    beforeEach(() => {
      mockQueryBuilder.returning.mockResolvedValue(mockCreatedRecords);
    });

    it('should create multiple records', async () => {
      const result = await service.bulkCreate(mockRecords);

      expect(mockTable).toHaveBeenCalledWith('test_table');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Record 1', created_at: expect.any(Date) }),
          expect.objectContaining({ name: 'Record 2', created_at: expect.any(Date) })
        ])
      );
      expect(result).toEqual(mockCreatedRecords);
    });

    it('should throw error for empty array', async () => {
      await expect(service.bulkCreate([])).rejects.toThrow('Records array is required and cannot be empty');
    });

    it('should throw error for too many records', async () => {
      const tooManyRecords = new Array(1001).fill({ name: 'Test' });

      await expect(service.bulkCreate(tooManyRecords)).rejects.toThrow('Bulk create limited to 1000 records at once');
    });
  });

  describe('withTransaction', () => {
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    beforeEach(() => {
      mockTable.transaction = jest.fn().mockResolvedValue(mockTransaction);
    });

    it('should execute callback within transaction and commit', async () => {
      const callback = jest.fn().mockResolvedValue('success');

      const result = await service.withTransaction(callback);

      expect(mockTable.transaction).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(mockTransaction);
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(service.withTransaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });

  describe('_applyFilters', () => {
    it('should apply simple filters', () => {
      const filters = { status: 'active', name: 'test' };
      const query = service._applyFilters(mockQueryBuilder, filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('status', 'active');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('name', 'test');
    });

    it('should apply array filters with whereIn', () => {
      const filters = { status: ['active', 'pending'] };
      service._applyFilters(mockQueryBuilder, filters);

      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('status', ['active', 'pending']);
    });

    it('should apply complex operator filters', () => {
      const filters = { 
        age: { operator: '>=', value: 18 },
        score: { operator: '<', value: 100 }
      };
      service._applyFilters(mockQueryBuilder, filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('age', '>=', 18);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('score', '<', 100);
    });

    it('should ignore null, undefined, and empty string values', () => {
      const filters = { 
        name: 'test',
        nullValue: null,
        undefinedValue: undefined,
        emptyString: ''
      };
      service._applyFilters(mockQueryBuilder, filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('name', 'test');
      expect(mockQueryBuilder.where).not.toHaveBeenCalledWith('nullValue', null);
      expect(mockQueryBuilder.where).not.toHaveBeenCalledWith('undefinedValue', undefined);
      expect(mockQueryBuilder.where).not.toHaveBeenCalledWith('emptyString', '');
    });
  });

  describe('_applyIncludes', () => {
    it('should apply simple string includes', () => {
      const includes = ['users', 'categories'];
      service._applyIncludes(mockQueryBuilder, includes);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('users', 'test_table.user_id', 'users.id');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('categories', 'test_table.categorie_id', 'categories.id');
    });

    it('should apply complex object includes', () => {
      const includes = [
        { table: 'users', as: 'author', on: 'test_table.author_id = author.id', type: 'inner' },
        { table: 'categories', on: 'test_table.category_id = categories.id' }
      ];
      service._applyIncludes(mockQueryBuilder, includes);

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('users as author', 'test_table.author_id = author.id');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('categories as categories', 'test_table.category_id = categories.id');
    });
  });
});