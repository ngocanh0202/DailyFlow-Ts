import { PageType } from '../enums/PageType.enum.js';

export const PAGE_SIZES: Record<PageType, { width: number; height: number }> = {
  [PageType.MAIN]: { width: 1100, height: 750 },
  [PageType.TODOFLOW]: { width: 470, height: 800 },
  [PageType.ONTASK]: { width: 350, height: 50},
  [PageType.ONTASK_EXPANDED]: { width: 350, height: 200 },
  [PageType.SETTING]: { width: 450, height: 700 },
};

export const getPageSize = (pageType: string): { width: number; height: number } => {
  return PAGE_SIZES[pageType as PageType] || PAGE_SIZES[PageType.MAIN];
};
