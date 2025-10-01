import express, { Request, Response, Router } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { authenticateToken } from '../middleware/auth';
import { requireCerbosPermission } from '../middleware/requireCerbosPermission';
import { createResourceFromRequest } from '../utils/auth-context';
import db from '../config/database';

const router: Router = express.Router();

router.get(
  '/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'view',
    getResourceId: (req: any) => req.params.id,
    getResourceAttributes: async (req) => {
      const game = await (db as any)('games')
        .select('organization_id', 'region_id', 'created_by', 'status')
        .where('id', req.params.id)
        .first();

      if (!game) {
        return {};
      }

      return {
        organizationId: game.organization_id,
        regionId: game.region_id,
        createdBy: game.created_by,
        status: game.status,
      };
    },
  }),
  async (req: Request, res: Response) => {
    const gameId = req.params.id;

    const game = await (db as any)('games')
      .select('*')
      .where('id', gameId)
      .first();

    if (!game) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Game not found',
      });
    }

    res.json(game);
  }
);

router.post(
  '/',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'create',
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    const { homeTeam, awayTeam, date, time, location, level } = (req as any).body;

    const [gameId] = await (db as any)('games').insert({
      home_team_id: homeTeam,
      away_team_id: awayTeam,
      date_time: `${date}T${time}`,
      location,
      level,
      organization_id: (req.user as any).organizationId,
      region_id: (req.user as any).primaryRegionId,
      created_by: req.user!.id,
      status: 'scheduled',
    });

    const game = await (db as any)('games').where('id', gameId).first();

    res.status(201).json(game);
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'update',
    getResourceId: (req: any) => req.params.id,
    getResourceAttributes: async (req) => {
      const game = await (db as any)('games')
        .select('organization_id', 'region_id', 'created_by', 'status')
        .where('id', req.params.id)
        .first();

      if (!game) {
        throw new Error('Game not found');
      }

      return {
        organizationId: game.organization_id,
        regionId: game.region_id,
        createdBy: game.created_by,
        status: game.status,
      };
    },
  }),
  async (req: Request, res: Response) => {
    const gameId = req.params.id;
    const { date, time, location, level } = (req as any).body;

    await (db as any)('games')
      .where('id', gameId)
      .update({
        date_time: date && time ? `${date}T${time}` : undefined,
        location,
        level,
        updated_at: new Date(),
      });

    const game = await (db as any)('games').where('id', gameId).first();

    res.json(game);
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    action: 'delete',
    getResourceId: (req: any) => req.params.id,
    getResourceAttributes: async (req) => {
      const game = await (db as any)('games')
        .select('organization_id', 'region_id', 'created_by', 'status')
        .where('id', req.params.id)
        .first();

      if (!game) {
        throw new Error('Game not found');
      }

      return {
        organizationId: game.organization_id,
        regionId: game.region_id,
        createdBy: game.created_by,
        status: game.status,
      };
    },
    forbiddenMessage: 'You do not have permission to delete this game',
  }),
  async (req: Request, res: Response) => {
    const gameId = req.params.id;

    await (db as any)('games').where('id', gameId).delete();

    res.status(204).send();
  }
);

router.post(
  '/:id/assignments',
  authenticateToken,
  requireCerbosPermission({
    resource: 'game',
    actions: ['view', 'update'],
    getResourceId: (req: any) => req.params.id,
    getResourceAttributes: async (req) => {
      const game = await (db as any)('games')
        .select('organization_id', 'region_id', 'status')
        .where('id', req.params.id)
        .first();

      return game ? {
        organizationId: game.organization_id,
        regionId: game.region_id,
        status: game.status,
      } : {};
    },
  }),
  async (req: Request, res: Response) => {
    const gameId = req.params.id;
    const { refereeId, position } = (req as any).body;

    const [assignmentId] = await (db as any)('game_assignments').insert({
      game_id: gameId,
      referee_id: refereeId,
      position,
      status: 'pending',
      created_at: new Date(),
    });

    const assignment = await (db as any)('game_assignments')
      .where('id', assignmentId)
      .first();

    res.status(201).json(assignment);
  }
);

export default router;