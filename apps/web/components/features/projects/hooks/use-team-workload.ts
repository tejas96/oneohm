'use client';

export interface TeamWorkloadItem {
  userId: string;
  firstName: string;
  lastName: string;
  activeProjectCount: number;
  totalTaskCount: number;
  inProgressTaskCount: number;
  notCompletedTaskCount: number;
}
