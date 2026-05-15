export class BomItemResponseDto {
  id!: string;
  itemType!: string;
  productId?: string;
  name!: string;
  brand?: string;
  specifications!: Record<string, unknown>;
  quantity!: number;
  unit!: string;
  unitPrice?: number;
  totalPrice?: number;
  gstRate?: number;
  gstAmount?: number;
  warrantyYears?: number;
  serialNumber?: string;
  groupKey?: string;
  unitIndex?: number;
  sortOrder!: number;
}

export class BomResponseDto {
  id!: string;
  bomNumber!: string;
  entityType!: string;
  entityId!: string;
  status!: string;
  allocationStatus!: string;
  /** Per-product allocation status: productId → 'allocated' | 'partial' | 'pending' */
  productAllocationStatus!: Record<string, 'allocated' | 'partial' | 'pending'>;
  totalItems!: number;
  totalUnits?: number;
  totalLineItems?: number;
  totalCost!: number;
  notes?: string;
  items!: BomItemResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
