import { Router, type Request, type Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  importPack,
  getPackById,
  listPacks,
  getUserPacks,
  updatePack,
  deletePack,
  togglePackFeatured,
} from '../services/pack.service';
import { packImportRequestSchema, packSchema } from '../validation/pack.validation';

const router = Router();

/**
 * GET /api/packs
 * List available packs with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      sport: req.query.sport as string | undefined,
      team: req.query.team as string | undefined,
      isFeatured: req.query.featured === 'true' ? true : undefined,
      isKidsSafe: req.query.kidsSafe === 'true' ? true : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const packs = await listPacks(filters);

    res.json({
      success: true,
      data: packs,
    });
  } catch (error) {
    console.error('Error listing packs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list packs',
    });
  }
});

/**
 * GET /api/packs/my
 * Get packs owned by authenticated user
 */
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const packs = await getUserPacks(userId);

    res.json({
      success: true,
      data: packs,
    });
  } catch (error) {
    console.error('Error fetching user packs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your packs',
    });
  }
});

/**
 * GET /api/packs/:id
 * Get pack details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pack = await getPackById(id);

    if (!pack) {
      res.status(404).json({
        success: false,
        error: 'Pack not found',
      });
      return;
    }

    res.json({
      success: true,
      data: pack,
    });
  } catch (error) {
    console.error('Error fetching pack:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pack',
    });
  }
});

/**
 * POST /api/packs/import
 * Import pack from JSON or CSV
 */
router.post('/import', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Validate request body
    const validation = packImportRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { format, data } = validation.data;

    // Import pack
    const result = await importPack(userId, format, data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Pack imported successfully',
    });
  } catch (error) {
    console.error('Error importing pack:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import pack',
    });
  }
});

/**
 * POST /api/packs/validate
 * Validate pack structure without importing
 */
router.post('/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const validation = packSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Pack validation failed',
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Pack structure is valid',
      data: validation.data,
    });
  } catch (error) {
    console.error('Error validating pack:', error);
    res.status(500).json({
      success: false,
      error: 'Validation error occurred',
    });
  }
});

/**
 * PUT /api/packs/:id
 * Update pack
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const pack = await updatePack(id, userId, req.body);

    res.json({
      success: true,
      data: pack,
      message: 'Pack updated successfully',
    });
  } catch (error) {
    console.error('Error updating pack:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update pack',
    });
  }
});

/**
 * DELETE /api/packs/:id
 * Delete pack
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await deletePack(id, userId);

    res.json({
      success: true,
      message: 'Pack deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pack:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete pack',
    });
  }
});

/**
 * PUT /api/packs/:id/feature
 * Feature/unfeature pack (admin only)
 */
router.put(
  '/:id/feature',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isFeatured } = req.body;

      if (typeof isFeatured !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isFeatured must be a boolean',
        });
        return;
      }

      const pack = await togglePackFeatured(id, isFeatured);

      res.json({
        success: true,
        data: pack,
        message: `Pack ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling pack featured status:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to update pack featured status',
      });
    }
  }
);

export default router;
