import { Request } from 'express';
import db from '../config/database';

export async function getGameResourceAttributes(gameId: string) {
  const game = await db('games')
    .select(
      'organization_id',
      'region_id',
      'created_by',
      'status',
      'level',
      'game_type',
      'date_time'
    )
    .where('id', gameId)
    .first();

  if (!game) {
    throw new Error('Game not found');
  }

  return {
    organizationId: game.organization_id,
    regionId: game.region_id,
    createdBy: game.created_by,
    status: game.status,
    level: game.level,
    gameType: game.game_type,
    dateTime: game.date_time,
  };
}

export async function getAssignmentResourceAttributes(assignmentId: string) {
  const assignment = await db('game_assignments as ga')
    .join('games as g', 'ga.game_id', 'g.id')
    .select(
      'ga.game_id',
      'ga.user_id as referee_id',
      'ga.status',
      'ga.created_by',
      'g.organization_id',
      'g.region_id as game_region_id'
    )
    .where('ga.id', assignmentId)
    .first();

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  return {
    organizationId: assignment.organization_id,
    gameId: assignment.game_id,
    gameRegionId: assignment.game_region_id,
    refereeId: assignment.referee_id,
    status: assignment.status,
    createdBy: assignment.created_by,
  };
}

export async function getRefereeResourceAttributes(refereeId: string) {
  const referee = await db('referees as r')
    .leftJoin('users as u', 'r.user_id', 'u.id')
    .select(
      'r.organization_id',
      'r.user_id',
      'r.certification_level',
      'r.primary_region_id',
      'r.is_available',
      'r.is_active',
      'u.profile_visibility'
    )
    .where('r.id', refereeId)
    .first();

  if (!referee) {
    throw new Error('Referee not found');
  }

  const activeAssignments = await db('game_assignments')
    .where('user_id', referee.user_id)
    .whereIn('status', ['pending', 'confirmed', 'offered'])
    .count('* as count')
    .first();

  return {
    organizationId: referee.organization_id,
    userId: referee.user_id,
    certificationLevel: referee.certification_level,
    primaryRegionId: referee.primary_region_id,
    isAvailable: referee.is_available,
    isActive: referee.is_active,
    profileVisibility: referee.profile_visibility || 'private',
    activeAssignments: parseInt(String(activeAssignments?.count || 0)),
  };
}

export function createCerbosResourceGetter<T extends Record<string, any>>(
  tableName: string,
  selectFields: string[],
  attributeMapper?: (row: any) => T
) {
  return async (resourceId: string): Promise<T> => {
    const resource = await db(tableName)
      .select(...selectFields)
      .where('id', resourceId)
      .first();

    if (!resource) {
      throw new Error(`${tableName} not found`);
    }

    if (attributeMapper) {
      return attributeMapper(resource);
    }

    return resource as T;
  };
}