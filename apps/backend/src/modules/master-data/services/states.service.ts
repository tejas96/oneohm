import { Injectable } from '@nestjs/common';

import { INDIAN_STATES, type IndianState } from '../constants/states.constants';

/**
 * States Service
 * Handles retrieval and validation of Indian states
 * Cached in memory as this is static reference data
 *
 * @service
 */
@Injectable()
export class StatesService {
  /**
   * Get all Indian states
   * @returns Array of state names sorted alphabetically
   */
  getAllStates(): IndianState[] {
    return [...INDIAN_STATES];
  }

  /**
   * Get state by name (case-insensitive)
   * @param stateName State name (case-insensitive)
   * @returns State name if valid, null otherwise
   */
  getState(stateName: string): IndianState | null {
    return INDIAN_STATES.find(
      (state) => state.toLowerCase() === stateName.toLowerCase(),
    ) as IndianState | null;
  }

  /**
   * Validate if state exists
   * @param stateName State name
   * @returns True if state is valid
   */
  isValidState(stateName: string): boolean {
    return this.getState(stateName) !== null;
  }

  /**
   * Get states count
   * @returns Total number of states
   */
  getStatesCount(): number {
    return INDIAN_STATES.length;
  }
}
