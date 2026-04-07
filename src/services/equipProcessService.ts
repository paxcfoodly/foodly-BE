import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

// ─── List equipment mappings by process ───

export async function listEquipsByProcess(processCd: string) {
  const mappings = await prisma.tbEquipProcess.findMany({
    where: { process_cd: processCd },
    include: {
      equipment: {
        select: { equip_nm: true, equip_type: true },
      },
    },
    orderBy: { priority: 'asc' },
  });
  return mappings;
}

// ─── Add equipment to process ───

export async function addEquipToProcess(processCd: string, equipCd: string, priority: number = 1, userId?: string) {
  try {
    const mapping = await prisma.tbEquipProcess.create({
      data: {
        equip_cd: equipCd,
        process_cd: processCd,
        priority,
        create_by: userId ?? null,
        update_by: userId ?? null,
      },
      include: {
        equipment: {
          select: { equip_nm: true, equip_type: true },
        },
      },
    });
    return mapping;
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new AppError('이미 매핑된 설비입니다.', 409);
    }
    if (err?.code === 'P2003') {
      throw new AppError('존재하지 않는 설비 또는 공정입니다.', 400);
    }
    throw err;
  }
}

// ─── Remove equipment from process ───

export async function removeEquipFromProcess(processCd: string, equipCd: string) {
  try {
    await prisma.tbEquipProcess.delete({
      where: {
        equip_cd_process_cd: {
          equip_cd: equipCd,
          process_cd: processCd,
        },
      },
    });
    return { message: '설비 매핑이 삭제되었습니다.' };
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw new AppError('존재하지 않는 매핑입니다.', 404);
    }
    throw err;
  }
}

// ─── Update equipment mapping priority ───

export async function updateEquipProcessPriority(processCd: string, equipCd: string, priority: number, userId?: string) {
  try {
    const updated = await prisma.tbEquipProcess.update({
      where: {
        equip_cd_process_cd: {
          equip_cd: equipCd,
          process_cd: processCd,
        },
      },
      data: {
        priority,
        update_by: userId ?? null,
        update_dt: new Date(),
      },
      include: {
        equipment: {
          select: { equip_nm: true, equip_type: true },
        },
      },
    });
    return updated;
  } catch (err: any) {
    if (err?.code === 'P2025') {
      throw new AppError('존재하지 않는 매핑입니다.', 404);
    }
    throw err;
  }
}
