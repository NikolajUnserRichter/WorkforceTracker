/**
 * User Management Component
 * Admin interface to manage users and assign departments
 *
 * Supports both IndexedDB (legacy) and Supabase backends.
 * With Supabase:
 * - Uses profiles table for user metadata
 * - New users are invited via email (password set on first login)
 * - Profile updates require admin privileges
 */

import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Save, X, Shield, Users as UsersIcon, Building2, AlertCircle } from 'lucide-react';
import { authService, DEPARTMENTS } from '../services/authService';
import { supabaseAuthService, DEPARTMENTS as SUPABASE_DEPARTMENTS } from '../services/supabaseAuth';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Check if Supabase is configured
const useSupabase = () => {
  return !!import.meta.env.VITE_SUPABASE_URL;
};

const DepartmentsList = useSupabase() ? SUPABASE_DEPARTMENTS : DEPARTMENTS;

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user',
    departments: [],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      if (useSupabase()) {
        const data = await supabaseAuthService.getAllUsers();
        // Transform Supabase profile format to match expected UI format
        const transformedUsers = data.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          departments: u.departments || [],
          isActive: u.is_active,
          createdAt: u.created_at,
        }));
        setUsers(transformedUsers);
      } else {
        const allUsers = await authService.getAllUsers();
        setUsers(allUsers);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (useSupabase()) {
        if (editingUser) {
          // Update existing user profile
          const updates = {
            role: formData.role,
            departments: formData.departments,
          };

          // Note: Changing username/email requires Supabase Admin API
          await supabaseAuthService.updateUser(editingUser.id, updates);
          toast.success('User updated successfully');
        } else {
          // Create new user with Supabase Auth
          // The profile will be created automatically via database trigger
          await supabaseAuthService.createUser({
            email: formData.email,
            password: formData.password,
            username: formData.username,
            role: formData.role,
            departments: formData.departments,
          });
          toast.success('User created. They may need to verify their email.');
        }
      } else {
        // IndexedDB path
        if (editingUser) {
          await authService.updateUser(editingUser.id, formData);
          toast.success('User updated successfully');
        } else {
          await authService.addUser(formData);
          toast.success('User added successfully');
        }
      }

      resetForm();
      loadUsers();
    } catch (error) {
      console.error('User management error:', error);
      toast.error(error.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    // Prevent self-deletion
    if (userId === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      if (useSupabase()) {
        // With Supabase, we deactivate rather than delete
        await supabaseAuthService.deactivateUser(userId);
        toast.success('User deactivated');
      } else {
        await authService.deleteUser(userId);
        toast.success('User deleted');
      }
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error(error);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email,
      role: user.role,
      departments: user.departments || [],
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      role: 'user',
      departments: [],
    });
    setEditingUser(null);
    setShowAddModal(false);
  };

  const toggleDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept]
    }));
  };

  const selectAllDepartments = () => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.length === DepartmentsList.length ? [] : ['ALL']
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage users and assign department access
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Supabase Info Notice */}
      {useSupabase() && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Supabase Auth:</strong> New users will receive an email to verify their account.
            Deleting a user will deactivate their account (they can be reactivated later).
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Departments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {user.username}
                        {user.id === currentUser?.id && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            Admin
                          </span>
                        </>
                      ) : (
                        <>
                          <UsersIcon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            User
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.departments && user.departments.includes('ALL') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                        <Building2 className="w-3 h-3" />
                        All Departments
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.departments && user.departments.slice(0, 2).map((dept) => (
                          <span
                            key={dept}
                            className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded"
                          >
                            {dept}
                          </span>
                        ))}
                        {user.departments && user.departments.length > 2 && (
                          <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                            +{user.departments.length - 2} more
                          </span>
                        )}
                        {(!user.departments || user.departments.length === 0) && (
                          <span className="text-xs text-gray-500">No departments</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={
                      user.isActive
                        ? 'inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === currentUser?.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={user.id === currentUser?.id ? "Can't delete yourself" : 'Delete user'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white disabled:opacity-50"
                  required
                  disabled={editingUser && useSupabase()}
                />
                {editingUser && useSupabase() && (
                  <p className="text-xs text-gray-500 mt-1">Username cannot be changed with Supabase</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white disabled:opacity-50"
                  required
                  disabled={editingUser && useSupabase()}
                />
                {editingUser && useSupabase() && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed with Supabase</p>
                )}
              </div>

              {/* Password - only show for new users or IndexedDB */}
              {(!editingUser || !useSupabase()) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    required={!editingUser}
                    minLength={6}
                  />
                  {useSupabase() && !editingUser && (
                    <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                  )}
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  required
                >
                  <option value="user">User (Read-only)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'admin'
                    ? 'Admins have full access to all features and all departments'
                    : 'Users have read-only access to their assigned departments'
                  }
                </p>
              </div>

              {/* Departments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Department Access
                  </label>
                  <button
                    type="button"
                    onClick={selectAllDepartments}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                  >
                    {formData.departments.includes('ALL') ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {DepartmentsList.map((dept) => (
                      <label
                        key={dept}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.departments.includes('ALL') || formData.departments.includes(dept)}
                          onChange={() => toggleDepartment(dept)}
                          disabled={formData.departments.includes('ALL')}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {dept}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Selected: {formData.departments.includes('ALL') ? 'All Departments' : formData.departments.length + ' department(s)'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
