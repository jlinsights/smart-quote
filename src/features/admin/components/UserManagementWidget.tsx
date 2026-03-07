import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Building2, UserCircle, Globe2, Mail, Shield, Edit2, Check, X, Trash2, Loader2, AlertCircle, Hash } from 'lucide-react';
import { listUsers, updateUser, deleteUser, AdminUser, UpdateUserParams } from '@/api/userApi';

export const UserManagementWidget: React.FC = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserParams>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await listUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user: AdminUser) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || '',
      company: user.company || '',
      nationality: user.nationality || '',
      role: user.role,
    });
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveClick = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await updateUser(editingId, editForm);
      setUsers(prev => prev.map(u => u.id === editingId ? updated : u));
      setEditingId(null);
      setEditForm({});
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDeleteConfirmId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete user');
    }
  };

  const handleFormChange = (key: keyof UpdateUserParams, value: string) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-jways-100 dark:bg-jways-500/20 rounded-lg">
            <Users className="w-5 h-5 text-jways-600 dark:text-jways-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('admin.userManagementTitle')}
          </h2>
        </div>
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300">
          Total Users: {users.length}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-jways-500" />
          <span className="ml-2 text-gray-500">Loading users...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
          <button onClick={fetchUsers} className="ml-3 text-sm underline hover:no-underline">
            Retry
          </button>
        </div>
      ) : (
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {t('admin.company')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-gray-400" />
                    {t('admin.name')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-gray-400" />
                    {t('admin.nationality')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {t('admin.email')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    {t('admin.role')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    Quotes
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">
                  {t('admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editingId === user.id;
                const isSelf = currentUser?.id === user.id;

                return (
                  <tr
                    key={user.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {isEditing ? (
                        <input
                          className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-jways-500 focus:border-jways-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                          value={editForm.company || ''}
                          onChange={(e) => handleFormChange('company', e.target.value)}
                        />
                      ) : (
                        user.company || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          className="w-[100px] bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-jways-500 focus:border-jways-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                          value={editForm.name || ''}
                          onChange={(e) => handleFormChange('name', e.target.value)}
                        />
                      ) : (
                        user.name || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          className="w-[120px] bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-jways-500 focus:border-jways-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                          value={editForm.nationality || 'South Korea'}
                          onChange={(e) => handleFormChange('nationality', e.target.value)}
                        >
                          <option value="South Korea" className="bg-white dark:bg-gray-800">South Korea</option>
                          <option value="United States" className="bg-white dark:bg-gray-800">United States</option>
                          <option value="China" className="bg-white dark:bg-gray-800">China</option>
                          <option value="Japan" className="bg-white dark:bg-gray-800">Japan</option>
                          <option value="Vietnam" className="bg-white dark:bg-gray-800">Vietnam</option>
                          <option value="Taiwan" className="bg-white dark:bg-gray-800">Taiwan</option>
                          <option value="Singapore" className="bg-white dark:bg-gray-800">Singapore</option>
                          <option value="Other" className="bg-white dark:bg-gray-800">Other</option>
                        </select>
                      ) : (
                        user.nationality || '-'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <a href={`mailto:${user.email}`} className="text-jways-600 dark:text-jways-400 hover:underline">
                        {user.email}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-jways-500 focus:border-jways-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                          value={editForm.role || 'user'}
                          onChange={(e) => handleFormChange('role', e.target.value)}
                        >
                          <option value="user">User</option>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : user.role === 'member'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {user.quoteCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={handleSaveClick}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg dark:text-green-400 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            aria-label={t('admin.save')}
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={handleCancelClick}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                            aria-label={t('admin.cancel')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                            aria-label={t('admin.edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteClick(user.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                deleteConfirmId === user.id
                                  ? 'text-white bg-red-500 hover:bg-red-600'
                                  : 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-gray-700'
                              }`}
                              aria-label={deleteConfirmId === user.id ? 'Click again to confirm' : 'Delete user'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No registered users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
