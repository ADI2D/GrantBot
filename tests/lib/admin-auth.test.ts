import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAdminRole, AdminAuthorizationError } from '@/lib/admin-auth';

describe('Admin Authorization', () => {
  describe('isAdminRole', () => {
    it('should return true for valid admin roles', () => {
      expect(isAdminRole('super_admin')).toBe(true);
      expect(isAdminRole('support')).toBe(true);
      expect(isAdminRole('developer')).toBe(true);
      expect(isAdminRole('read_only')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isAdminRole('user')).toBe(false);
      expect(isAdminRole('admin')).toBe(false);
      expect(isAdminRole('')).toBe(false);
      expect(isAdminRole(null)).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
    });
  });

  describe('AdminAuthorizationError', () => {
    it('should create error with default message', () => {
      const error = new AdminAuthorizationError();
      expect(error.message).toBe('Forbidden');
      expect(error.name).toBe('AdminAuthorizationError');
    });

    it('should create error with custom message', () => {
      const error = new AdminAuthorizationError('Custom error');
      expect(error.message).toBe('Custom error');
      expect(error.name).toBe('AdminAuthorizationError');
    });

    it('should be instance of Error', () => {
      const error = new AdminAuthorizationError();
      expect(error).toBeInstanceOf(Error);
    });
  });
});
