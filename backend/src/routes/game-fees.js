const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireAnyRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandling');

/**
 * GET /api/game-fees
 * Get all game fees with optional filtering and pagination
 */
router.get('/', authenticateToken, requireAnyRole('admin', 'finance'), asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    status, 
    startDate, 
    endDate,
    gameId 
  } = req.query;
  
  const offset = (page - 1) * limit;

  let query = db('game_fees as gf')
    .select(
      'gf.id',
      'gf.game_id',
      'gf.amount',
      'gf.payment_status',
      'gf.payment_date',
      'gf.payment_method',
      'gf.notes',
      'gf.created_at',
      'g.game_date',
      'g.game_time',
      'g.location',
      'g.level',
      'ht.name as home_team_name',
      'at.name as away_team_name',
      'u.name as recorded_by'
    )
    .leftJoin('games as g', 'gf.game_id', 'g.id')
    .leftJoin('teams as ht', 'g.home_team_id', 'ht.id')
    .leftJoin('teams as at', 'g.away_team_id', 'at.id')
    .leftJoin('users as u', 'gf.recorded_by', 'u.id')
    .orderBy('g.game_date', 'desc')
    .orderBy('gf.created_at', 'desc');

  // Apply filters
  if (status) {
    query = query.where('gf.payment_status', status);
  }

  if (gameId) {
    query = query.where('gf.game_id', gameId);
  }

  if (startDate && endDate) {
    query = query.whereBetween('g.game_date', [startDate, endDate]);
  }

  // Get total count for pagination
  const totalQuery = db('game_fees as gf')
    .leftJoin('games as g', 'gf.game_id', 'g.id')
    .modify((q) => {
      if (status) q.where('gf.payment_status', status);
      if (gameId) q.where('gf.game_id', gameId);
      if (startDate && endDate) q.whereBetween('g.game_date', [startDate, endDate]);
    })
    .count('gf.id as count')
    .first();

  const dataQuery = query.limit(limit).offset(offset);
  
  const [totalResult, gameFees] = await Promise.all([totalQuery, dataQuery]);
  const total = parseInt(totalResult.count);

  res.json({
    gameFees: gameFees.map(fee => ({
      id: fee.id,
      gameId: fee.game_id,
      amount: parseFloat(fee.amount),
      paymentStatus: fee.payment_status,
      paymentDate: fee.payment_date,
      paymentMethod: fee.payment_method,
      notes: fee.notes,
      createdAt: fee.created_at,
      game: {
        date: fee.game_date,
        time: fee.game_time,
        location: fee.location,
        level: fee.level,
        homeTeam: fee.home_team_name || 'TBD',
        awayTeam: fee.away_team_name || 'TBD'
      },
      recordedBy: fee.recorded_by
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * POST /api/game-fees
 * Record a new game fee payment
 */
router.post('/', authenticateToken, requireAnyRole('admin', 'finance'), asyncHandler(async (req, res) => {
  const { gameId, amount, paymentStatus = 'pending', paymentDate, paymentMethod, notes } = req.body;

  // Validate required fields
  if (!gameId || !amount) {
    return res.status(400).json({ 
      error: 'Game ID and amount are required' 
    });
  }

  // Validate amount is positive
  if (amount <= 0) {
    return res.status(400).json({ 
      error: 'Amount must be greater than 0' 
    });
  }

  // Check if game exists
  const game = await db('games').where('id', gameId).first();
  if (!game) {
    return res.status(404).json({ 
      error: 'Game not found' 
    });
  }

  // Check if fee already exists for this game
  const existingFee = await db('game_fees').where('game_id', gameId).first();
  if (existingFee) {
    return res.status(409).json({ 
      error: 'Game fee already exists for this game. Use PUT to update.' 
    });
  }

  // Insert new game fee
  const [newFee] = await db('game_fees').insert({
    game_id: gameId,
    amount: amount,
    payment_status: paymentStatus,
    payment_date: paymentDate || (paymentStatus === 'paid' ? new Date() : null),
    payment_method: paymentMethod,
    notes: notes,
    recorded_by: req.user.userId
  }).returning('*');

  res.status(201).json({
    success: true,
    gameFee: {
      id: newFee.id,
      gameId: newFee.game_id,
      amount: parseFloat(newFee.amount),
      paymentStatus: newFee.payment_status,
      paymentDate: newFee.payment_date,
      paymentMethod: newFee.payment_method,
      notes: newFee.notes,
      recordedBy: req.user.userId,
      createdAt: newFee.created_at
    }
  });
}));

/**
 * PUT /api/game-fees/:id
 * Update an existing game fee
 */
router.put('/:id', authenticateToken, requireAnyRole('admin', 'finance'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, paymentStatus, paymentDate, paymentMethod, notes } = req.body;

  // Check if game fee exists
  const existingFee = await db('game_fees').where('id', id).first();
  if (!existingFee) {
    return res.status(404).json({ 
      error: 'Game fee not found' 
    });
  }

  // Validate amount if provided
  if (amount !== undefined && amount <= 0) {
    return res.status(400).json({ 
      error: 'Amount must be greater than 0' 
    });
  }

  // Build update object
  const updateData = {};
  if (amount !== undefined) updateData.amount = amount;
  if (paymentStatus !== undefined) {
    updateData.payment_status = paymentStatus;
    // Automatically set payment_date if status changes to paid
    if (paymentStatus === 'paid' && !paymentDate && !existingFee.payment_date) {
      updateData.payment_date = new Date();
    }
  }
  if (paymentDate !== undefined) updateData.payment_date = paymentDate;
  if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;
  if (notes !== undefined) updateData.notes = notes;

  // Update the record
  await db('game_fees').where('id', id).update(updateData);

  // Fetch updated record
  const updatedFee = await db('game_fees').where('id', id).first();

  res.json({
    success: true,
    gameFee: {
      id: updatedFee.id,
      gameId: updatedFee.game_id,
      amount: parseFloat(updatedFee.amount),
      paymentStatus: updatedFee.payment_status,
      paymentDate: updatedFee.payment_date,
      paymentMethod: updatedFee.payment_method,
      notes: updatedFee.notes,
      createdAt: updatedFee.created_at,
      updatedAt: updatedFee.updated_at
    }
  });
}));

/**
 * GET /api/game-fees/stats
 * Get game fee statistics and summaries
 */
router.get('/stats', authenticateToken, requireAnyRole('admin', 'finance'), asyncHandler(async (req, res) => {
  const { period = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Get basic stats
  const [
    totalFeesResult,
    paidFeesResult,
    pendingFeesResult,
    overdueFeesResult
  ] = await Promise.all([
    // Total fees
    db('game_fees as gf')
      .leftJoin('games as g', 'gf.game_id', 'g.id')
      .where('g.game_date', '>=', startDate.toISOString().split('T')[0])
      .sum('gf.amount as total')
      .count('gf.id as count')
      .first(),

    // Paid fees
    db('game_fees as gf')
      .leftJoin('games as g', 'gf.game_id', 'g.id')
      .where('g.game_date', '>=', startDate.toISOString().split('T')[0])
      .where('gf.payment_status', 'paid')
      .sum('gf.amount as total')
      .count('gf.id as count')
      .first(),

    // Pending fees
    db('game_fees as gf')
      .leftJoin('games as g', 'gf.game_id', 'g.id')
      .where('g.game_date', '>=', startDate.toISOString().split('T')[0])
      .where('gf.payment_status', 'pending')
      .sum('gf.amount as total')
      .count('gf.id as count')
      .first(),

    // Overdue fees (games older than 30 days with pending payment)
    db('game_fees as gf')
      .leftJoin('games as g', 'gf.game_id', 'g.id')
      .where('g.game_date', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .where('gf.payment_status', 'pending')
      .sum('gf.amount as total')
      .count('gf.id as count')
      .first()
  ]);

  // Get revenue by level
  const revenueByLevel = await db('game_fees as gf')
    .select('g.level')
    .leftJoin('games as g', 'gf.game_id', 'g.id')
    .where('g.game_date', '>=', startDate.toISOString().split('T')[0])
    .where('gf.payment_status', 'paid')
    .groupBy('g.level')
    .sum('gf.amount as total')
    .count('gf.id as count');

  // Get payment methods breakdown
  const paymentMethods = await db('game_fees')
    .leftJoin('games as g', 'game_fees.game_id', 'g.id')
    .where('g.game_date', '>=', startDate.toISOString().split('T')[0])
    .where('game_fees.payment_status', 'paid')
    .whereNotNull('game_fees.payment_method')
    .groupBy('game_fees.payment_method')
    .sum('game_fees.amount as total')
    .count('game_fees.id as count')
    .select('game_fees.payment_method as method');

  const stats = {
    totalFees: {
      amount: parseFloat(totalFeesResult.total) || 0,
      count: parseInt(totalFeesResult.count) || 0
    },
    paidFees: {
      amount: parseFloat(paidFeesResult.total) || 0,
      count: parseInt(paidFeesResult.count) || 0
    },
    pendingFees: {
      amount: parseFloat(pendingFeesResult.total) || 0,
      count: parseInt(pendingFeesResult.count) || 0
    },
    overdueFees: {
      amount: parseFloat(overdueFeesResult.total) || 0,
      count: parseInt(overdueFeesResult.count) || 0
    },
    revenueByLevel: revenueByLevel.map(item => ({
      level: item.level,
      amount: parseFloat(item.total),
      gameCount: parseInt(item.count)
    })),
    paymentMethods: paymentMethods.map(item => ({
      method: item.method,
      amount: parseFloat(item.total),
      count: parseInt(item.count)
    })),
    collectionRate: totalFeesResult.total > 0 
      ? Math.round((paidFeesResult.total / totalFeesResult.total) * 100) 
      : 0,
    period: parseInt(period)
  };

  res.json(stats);
}));

module.exports = router;