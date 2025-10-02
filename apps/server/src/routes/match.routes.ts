import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import {
  createMatch,
  getMatchById,
  getMatchByJoinCode,
  getUserMatches,
  updateMatchStatus,
  deleteMatch,
  getMatchSummary,
} from '../services/match.service';

const router = Router();

/**
 * Validation schema for creating a match
 */
const createMatchSchema = z.object({
  packId: z.string().min(1, 'Pack ID is required'),
  mode: z.enum(['NINE_INNINGS', 'BEST_OF_3', 'BEST_OF_5']).optional(),
  settings: z
    .object({
      grandSlam: z.boolean().optional(),
      speedBonus: z.boolean().optional(),
      timerSec: z.number().int().min(5).max(60).optional(),
      allowReactions: z.boolean().optional(),
      allowHeckles: z.boolean().optional(),
      showMap: z.boolean().optional(),
    })
    .optional(),
});

/**
 * POST /api/matches
 * Create a new match
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const hostId = req.user!.userId;

    // Validate request
    const validation = createMatchSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // Create match
    const result = await createMatch(hostId, validation.data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Match created successfully',
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create match',
    });
  }
});

/**
 * GET /api/matches/my
 * Get matches hosted by authenticated user
 */
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const hostId = req.user!.userId;
    const matches = await getUserMatches(hostId);

    res.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    console.error('Error fetching user matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your matches',
    });
  }
});

/**
 * GET /api/matches/:id
 * Get match details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const match = await getMatchById(id);

    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found',
      });
      return;
    }

    res.json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match',
    });
  }
});

/**
 * GET /api/matches/join/:code
 * Get match details by join code (for players joining)
 */
router.get('/join/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const match = await getMatchByJoinCode(code.toUpperCase());

    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found. Please check the join code.',
      });
      return;
    }

    // Only return necessary information for joining
    const pack = match.pack as { meta: { title: string; sport: string; team: string } };
    res.json({
      success: true,
      data: {
        matchId: match.id,
        joinCode: match.joinCode,
        status: match.status,
        mode: match.mode,
        pack: {
          title: pack.meta.title,
          sport: pack.meta.sport,
          team: pack.meta.team,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching match by join code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match',
    });
  }
});

/**
 * GET /api/matches/:id/summary
 * Get match summary (post-game statistics)
 */
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const summary = await getMatchSummary(id);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching match summary:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch match summary',
    });
  }
});

/**
 * PATCH /api/matches/:id/status
 * Update match status
 */
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['LOBBY', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be LOBBY, IN_PROGRESS, COMPLETED, or ABANDONED',
      });
      return;
    }

    // Verify host owns the match
    const match = await getMatchById(id);
    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found',
      });
      return;
    }

    if (match.hostId !== req.user!.userId) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized: You do not host this match',
      });
      return;
    }

    const updatedMatch = await updateMatchStatus(id, status);

    res.json({
      success: true,
      data: updatedMatch,
      message: `Match status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update match status',
    });
  }
});

/**
 * DELETE /api/matches/:id
 * Cancel/delete a match
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hostId = req.user!.userId;

    await deleteMatch(id, hostId);

    res.json({
      success: true,
      message: 'Match cancelled successfully',
    });
  } catch (error) {
    console.error('Error deleting match:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel match',
    });
  }
});

export default router;
