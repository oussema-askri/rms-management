import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import './ProfilePage.css';

function ProfilePage() {
  const { user } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      rh: 'Ressources Humaines',
      employer: 'Employé',
      responsable: 'Responsable',
      comptable: 'Comptable',
    };
    return labels[role] || role;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: response.data.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors du changement de mot de passe' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-avatar-large">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{user?.name}</h2>
          <span className="profile-role-badge">{getRoleLabel(user?.role)}</span>
          <div className="profile-details">
            <div className="profile-detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user?.email}</span>
            </div>
            {user?.cin && (
              <div className="profile-detail-row">
                <span className="detail-label">CIN</span>
                <span className="detail-value">{user.cin}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="password-card">
        <div className="password-card-header">
          <h3>Changer le Mot de Passe</h3>
          <p>Saisissez votre mot de passe actuel puis choisissez un nouveau</p>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label>Mot de passe actuel</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="form-group">
            <label>Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="form-group">
            <label>Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-save" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
