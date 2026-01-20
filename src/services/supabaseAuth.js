/**
 * Supabase Authentication Service
 * Handles user authentication and profile management via Supabase
 *
 * Role-based access:
 * - admin: Full access to all features, all departments, can manage users
 * - user: Read-only access to assigned departments, limited features
 */

import { supabase } from '../lib/supabase';

export const supabaseAuthService = {
  /**
   * Sign up a new user
   * Note: New users get 'user' role by default. Admins must promote them.
   */
  async signUp({ email, password, username, role = 'user', departments = [] }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
          departments,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with email and password
   */
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Fetch full profile data
    const profile = await this.getProfile(data.user.id);

    if (!profile?.is_active) {
      await this.logout();
      throw new Error('User account is inactive');
    }

    return {
      ...data.user,
      profile,
    };
  },

  /**
   * Sign out current user
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Get current user with profile
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const profile = await this.getProfile(user.id);
    if (!profile) return null;

    return {
      id: user.id,
      email: user.email,
      username: profile.username,
      role: profile.role,
      departments: profile.departments || [],
      isActive: profile.is_active,
    };
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const session = await this.getSession();
    return !!session;
  },

  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      // Ignore AbortError - expected in React Strict Mode dev
      if (error.message?.includes('AbortError') || error.message?.includes('aborted')) {
        return null;
      }
      console.error('Error fetching profile:', error);
    }
    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all users (admin only - RLS enforced)
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Create a new user (admin only)
   * Uses Supabase Admin API via Edge Function or manual invite
   */
  async createUser({ email, password, username, role, departments }) {
    // For admin user creation, we use signUp which will create the auth user
    // and trigger the profile creation automatically
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
          departments,
        },
      },
    });

    if (error) throw error;

    // Note: The profile is created automatically via the database trigger.
    // If you need to immediately update the profile with admin privileges,
    // you'll need to use a Supabase Edge Function with service_role key.
    return data;
  },

  /**
   * Update another user's profile (admin only - RLS enforced)
   */
  async updateUser(userId, updates) {
    // Remove password from updates if empty (don't update)
    const profileUpdates = { ...updates };
    delete profileUpdates.password;

    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // If password needs to be updated, that requires admin auth API
    // which needs a server-side Edge Function with service_role key

    return data;
  },

  /**
   * Deactivate a user (admin only)
   * We don't delete users, just deactivate them
   */
  async deactivateUser(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check if user has access to a department
   */
  hasAccessToDepartment(userDepartments, targetDepartment) {
    if (!userDepartments || userDepartments.length === 0) {
      return false;
    }
    if (userDepartments.includes('ALL')) {
      return true;
    }
    return userDepartments.includes(targetDepartment);
  },

  /**
   * Filter employees based on user's department access
   */
  filterEmployeesByDepartment(employees, userDepartments) {
    if (!userDepartments || userDepartments.length === 0) {
      return [];
    }
    if (userDepartments.includes('ALL')) {
      return employees;
    }
    return employees.filter((emp) =>
      userDepartments.includes(emp.department)
    );
  },

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.getProfile(session.user.id);
        callback(event, { ...session, profile });
      } else {
        callback(event, session);
      }
    });
  },

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  /**
   * Update password (for logged-in user)
   */
  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },
};

// Standard department list
export const DEPARTMENTS = [
  'IT/SD-ED',
  'IT/CR-A',
  'IT/OER-KS',
  'IT/ITR-O',
  'IT/SKW',
  'IT/OKT-AB',
  'IT/SPN-H',
  'IT/SDU-CU',
  'IT/SBU-CV',
  'IT/SDU-CL',
  'IT/ONK-CV',
  'IT/MIA',
  'TH/CGX-S',
  'IT/SDS-PS',
  'IT/SDS-PG',
  'IT/SCX-PG',
  'IT/MTP',
  'TE/SBU-U',
  'IT/I',
  'IT/BLJ-F',
  'IT/SP-TM1',
  'TE/SML',
  'IT/PVK-1',
  'TE/SMZ-H',
];

export default supabaseAuthService;
