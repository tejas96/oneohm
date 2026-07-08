import { z } from 'zod';

export const gpsCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  altitude: z.number().optional(),
});

export type GpsCoordinatesFormData = z.infer<typeof gpsCoordinatesSchema>;
