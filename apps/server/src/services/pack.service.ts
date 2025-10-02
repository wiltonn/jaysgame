import { PrismaClient } from '@prisma/client';
import type { Pack as PrismaPack } from '@prisma/client';
import { packSchema, validatePack, type PackData } from '../validation/pack.validation';
import { parsePackCSV, generatePackPreview } from '../utils/csv-parser';

const prisma = new PrismaClient();

export interface PackImportResult {
  packId: string;
  meta: PackData['meta'];
  warnings: string[];
  preview: string;
}

export interface PackListFilters {
  sport?: string;
  team?: string;
  isFeatured?: boolean;
  isKidsSafe?: boolean;
  tags?: string[];
}

/**
 * Import pack from JSON or CSV format
 */
export async function importPack(
  ownerId: string,
  format: 'json' | 'csv',
  data: string
): Promise<PackImportResult> {
  let packData: PackData;

  // Parse based on format
  if (format === 'json') {
    try {
      const parsed = JSON.parse(data);
      packData = packSchema.parse(parsed);
    } catch (error) {
      throw new Error(
        `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } else {
    // CSV
    try {
      packData = parsePackCSV(data);
      // Validate parsed CSV against schema
      packData = packSchema.parse(packData);
    } catch (error) {
      throw new Error(
        `Invalid CSV format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Perform additional validation
  const validation = validatePack(packData);
  if (!validation.valid) {
    throw new Error(`Pack validation failed:\n${validation.errors.join('\n')}`);
  }

  // Store in database
  const pack = await prisma.pack.create({
    data: {
      ownerId,
      meta: packData.meta as object,
      innings: packData.innings as object,
      tags: packData.tags || [],
      isFeatured: false,
      isKidsSafe: packData.isKidsSafe || false,
    },
  });

  // Generate preview
  const preview = generatePackPreview(packData);

  return {
    packId: pack.id,
    meta: packData.meta,
    warnings: validation.warnings,
    preview,
  };
}

/**
 * Get pack by ID
 */
export async function getPackById(packId: string): Promise<PrismaPack | null> {
  return prisma.pack.findUnique({
    where: { id: packId },
  });
}

/**
 * List packs with filters
 */
export async function listPacks(filters?: PackListFilters): Promise<PrismaPack[]> {
  return prisma.pack.findMany({
    where: {
      ...(filters?.sport && {
        meta: {
          path: ['sport'],
          equals: filters.sport,
        },
      }),
      ...(filters?.team && {
        meta: {
          path: ['team'],
          equals: filters.team,
        },
      }),
      ...(filters?.isFeatured !== undefined && { isFeatured: filters.isFeatured }),
      ...(filters?.isKidsSafe !== undefined && { isKidsSafe: filters.isKidsSafe }),
      ...(filters?.tags &&
        filters.tags.length > 0 && {
          tags: {
            hasSome: filters.tags,
          },
        }),
    },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Get packs owned by user
 */
export async function getUserPacks(ownerId: string): Promise<PrismaPack[]> {
  return prisma.pack.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update pack
 */
export async function updatePack(
  packId: string,
  ownerId: string,
  updates: Partial<PackData>
): Promise<PrismaPack> {
  // Verify ownership
  const pack = await prisma.pack.findUnique({
    where: { id: packId },
  });

  if (!pack) {
    throw new Error('Pack not found');
  }

  if (pack.ownerId !== ownerId) {
    throw new Error('Unauthorized: You do not own this pack');
  }

  // Validate updates
  if (updates.meta || updates.innings) {
    const fullPack = {
      meta: updates.meta || (pack.meta as PackData['meta']),
      innings: updates.innings || (pack.innings as PackData['innings']),
      tags: updates.tags || pack.tags,
      isKidsSafe: updates.isKidsSafe ?? pack.isKidsSafe,
    };

    const validation = validatePack(packSchema.parse(fullPack));
    if (!validation.valid) {
      throw new Error(`Pack validation failed:\n${validation.errors.join('\n')}`);
    }
  }

  // Update pack
  return prisma.pack.update({
    where: { id: packId },
    data: {
      ...(updates.meta && { meta: updates.meta as object }),
      ...(updates.innings && { innings: updates.innings as object }),
      ...(updates.tags && { tags: updates.tags }),
      ...(updates.isKidsSafe !== undefined && { isKidsSafe: updates.isKidsSafe }),
    },
  });
}

/**
 * Delete pack
 */
export async function deletePack(packId: string, ownerId: string): Promise<void> {
  // Verify ownership
  const pack = await prisma.pack.findUnique({
    where: { id: packId },
  });

  if (!pack) {
    throw new Error('Pack not found');
  }

  if (pack.ownerId !== ownerId) {
    throw new Error('Unauthorized: You do not own this pack');
  }

  await prisma.pack.delete({
    where: { id: packId },
  });
}

/**
 * Feature/unfeature pack (admin only)
 */
export async function togglePackFeatured(packId: string, isFeatured: boolean): Promise<PrismaPack> {
  return prisma.pack.update({
    where: { id: packId },
    data: { isFeatured },
  });
}
