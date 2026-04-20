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
  sortOrder!: number;
}

export class BomResponseDto {
  id!: string;
  bomNumber!: string;
  entityType!: string;
  entityId!: string;
  status!: string;
  totalItems!: number;
  totalCost!: number;
  notes?: string;
  items!: BomItemResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
