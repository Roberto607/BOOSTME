import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Calendar,
  Edit2,
  Save,
  Copy,
  Camera,
  X
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    joinDate: '',
    referralCode: '',
    totalEarnings: 0,
    completedTasks: 0,
    referralCount: 0,
    bio: '',
    location: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        joinDate: user.joinDate || new Date().toISOString().split('T')[0],
        referralCode: user.referralCode || 'BOOST123',
        totalEarnings: user.totalEarnings || 0,
        completedTasks: user.completedTasks || 0,
        referralCount: user.referralCount || 0,
        bio: user.bio || '',
        location: user.location || '',
        phone: user.phone || ''
      });
      setPreviewImage(user.photoURL || null);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateUserProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(profileData.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar el código:', err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        joinDate: user.joinDate || new Date().toISOString().split('T')[0],
        referralCode: user.referralCode || 'BOOST123',
        totalEarnings: user.totalEarnings || 0,
        completedTasks: user.completedTasks || 0,
        referralCount: user.referralCount || 0,
        bio: user.bio || '',
        location: user.location || '',
        phone: user.phone || ''
      });
      setPreviewImage(user.photoURL || null);
    }
  };

  return (
    <div className="profile-container">

      {/* 🧩 SECCIÓN 1 - PERFIL */}
      <section className="profile-section profile-main">
        <div className="profile-header">
          {/* Imagen */}
          <div className="profile-avatar-container">
            {previewImage ? (
              <img src={previewImage} alt="Profile" className="profile-avatar-image" />
            ) : (
              <div className="profile-avatar">
                <User size={40} />
              </div>
            )}
            {isEditing && (
              <label className="camera-overlay">
                <Camera size={20} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {/* Información */}
          <div className="profile-info">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  className="profile-input"
                  placeholder="Nombre de usuario"
                />
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="profile-input"
                  placeholder="Correo electrónico"
                />
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="profile-input profile-bio"
                  placeholder="Cuéntanos sobre ti..."
                  rows={3}
                />
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                  className="profile-input"
                  placeholder="Ubicación"
                />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="profile-input"
                  placeholder="Teléfono"
                />
              </>
            ) : (
              <>
                <h1>{profileData.username}</h1>
                <p className="profile-email">{profileData.email}</p>
                {profileData.bio && <p className="profile-bio-text">{profileData.bio}</p>}
                {profileData.location && (
                  <p className="profile-detail">📍 {profileData.location}</p>
                )}
                {profileData.phone && (
                  <p className="profile-detail">📱 {profileData.phone}</p>
                )}
              </>
            )}
            <p className="profile-join-date">
              <Calendar size={16} />
              Miembro desde: {profileData.joinDate}
            </p>
          </div>
        </div>

        {/* Botones solo en esta sección */}
        <div className="edit-buttons">
          {isEditing ? (
            <>
              <button className="save-button" onClick={handleSave}>
                <Save size={20} />
                Guardar
              </button>
              <button className="cancel-button" onClick={handleCancel}>
                <X size={20} />
                Cancelar
              </button>
            </>
          ) : (
            <button className="edit-button" onClick={() => setIsEditing(true)}>
              <Edit2 size={20} />
              Editar perfil
            </button>
          )}
        </div>
      </section>

      {/* 🧩 SECCIÓN 2 - ESTADÍSTICAS */}
      <section className="profile-section">
        <h2>Estadísticas</h2>
        <div className="profile-stats">
          <div className="stat-card">
            <h3>Ganancias Totales</h3>
            <p className="stat-value">{profileData.totalEarnings} BOOST</p>
          </div>
          <div className="stat-card">
            <h3>Tareas Completadas</h3>
            <p className="stat-value">{profileData.completedTasks}</p>
          </div>
          <div className="stat-card">
            <h3>Referidos</h3>
            <p className="stat-value">{profileData.referralCount}</p>
          </div>
        </div>
      </section>

      {/* 🧩 SECCIÓN 3 - CÓDIGO DE REFERIDO */}
      <section className="profile-section">
        <div className="profile-referral">
          <h2>Código de Referido</h2>
          <div className="referral-code-container">
            <input
              type="text"
              value={profileData.referralCode}
              readOnly
              className="referral-input"
            />
            <button className="copy-button" onClick={handleCopyCode}>
              <Copy size={20} />
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
