import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Calendar,
  Edit2,
  Camera,
  X,
  ShieldCheck,
  Sparkles,
  Copy,
  Gift,
  Clock3,
  BadgeCheck
} from 'lucide-react';
import { profileService } from '../../services/profileService';import { surveyMonkeyService } from '../../services/surveyMonkeyService';
const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [surveyMonkeyStatus, setSurveyMonkeyStatus] = useState('');

  const [profileData, setProfileData] = useState({
    username: 'Usuario',
    email: '',
    joinDate: '',
    totalEarnings: 0,
    completedTasks: 0,
    bio: '',
    country: '',
    city: '',
    phone: ''
  });

  useEffect(() => {
    console.log('=== Profile Component Loaded ===');
    console.log('Current user from context:', user?.username);
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User object from context:', user);
      const safeUser = {
        username: user.username || user.first_name || 'Usuario',
        email: user.email || '',
        joinDate: user.joinDate || user.join_date || new Date().toISOString().split('T')[0],
        totalEarnings: user.totalEarnings || user.earned_boost || 0,
        completedTasks: user.completedTasks || 0,
        bio: user.bio || '',
        country: user.country || '',
        city: user.city || '',
        phone: user.phone || ''
      };

      console.log('Safe user object to set:', safeUser);
      setProfileData(safeUser);

      const nextPreviewImage = user.photo_url || user.photoURL || user.photo || null;
      console.log('Photo available from user:', nextPreviewImage);
      console.log('Current user username:', user.username);
      setPreviewImage(nextPreviewImage);
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();
      Object.entries(profileData).forEach(([key, value]) => {
        // Excluir campos que no se deben actualizar
        if (!['joinDate', 'totalEarnings', 'completedTasks', 'username', 'email'].includes(key)) {
          formData.append(key, value);
        }
      });

      if (selectedImageFile) {
        console.log('Enviando foto:', selectedImageFile.name, selectedImageFile.size);
        formData.append('photo', selectedImageFile, selectedImageFile.name);
      } else {
        console.log('No hay foto seleccionada para guardar');
      }

      // Usar updateUserProfile del contexto para mantener el estado global sincronizado
      const result = await updateUserProfile(formData);
      console.log('Respuesta del servidor (updated profile):', result);

      const updatedUser = result?.user || result;
      if (updatedUser && typeof updatedUser === 'object') {
        const safeUser = {
          username: updatedUser.username || updatedUser.first_name || 'Usuario',
          email: updatedUser.email || '',
          joinDate: updatedUser.joinDate || updatedUser.join_date || new Date().toISOString().split('T')[0],
          totalEarnings: updatedUser.totalEarnings || updatedUser.earned_boost || 0,
          completedTasks: updatedUser.completedTasks || 0,
          bio: updatedUser.bio || '',
          country: updatedUser.country || '',
          city: updatedUser.city || '',
          phone: updatedUser.phone || ''
        };
        setProfileData(safeUser);
        setPreviewImage(updatedUser.photo_url || updatedUser.photoURL || updatedUser.photo || null);
      }

      setIsEditing(false);
      setSelectedImageFile(null);
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Error al actualizar el perfil');
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setIsEditing(false);
    // Reset profileData from user - useEffect will handle this
    const safeUser = {
      username: user.username || user.first_name || 'Usuario',
      email: user.email || '',
      joinDate: user.joinDate || user.join_date || new Date().toISOString().split('T')[0],
      totalEarnings: user.totalEarnings || user.earned_boost || 0,
      completedTasks: user.completedTasks || 0,
      bio: user.bio || '',
      country: user.country || '',
      city: user.city || '',
      phone: user.phone || ''
    };
    setProfileData(safeUser);
    setPreviewImage(user.photo_url || user.photoURL || user.photo || null);
    setSelectedImageFile(null);
  };

  const handleConnectSurveyMonkey = async () => {
    try {
      const response = await surveyMonkeyService.getAuthorizeUrl();
      if (response?.authorization_url) {
        window.location.href = response.authorization_url;
      } else {
        throw new Error('No se obtuvo la URL de autorización');
      }
    } catch (error) {
      console.error('Error al iniciar SurveyMonkey OAuth:', error);
      alert('No se pudo conectar con SurveyMonkey. Intenta de nuevo.');
    }
  };

  const handleCopyReferralLink = async () => {
    if (!user) return;
    const referralLink = `${window.location.origin}/register?ref=${user.username || user.id}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopyMessage('Enlace copiado');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch {
      setCopyMessage('No se pudo copiar');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString('es-ES');
  const referralLink = user ? `${window.location.origin}/register?ref=${user.username || user.id}` : '';
  const surveyMonkeyConnected = Boolean(user?.survey_monkey_connected || user?.surveymonkey_user_id);

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-6 lg:px-10 py-6">

      {/* HEADER */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Perfil
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Administra tu información personal
        </p>
      </div>

      {/* PROFILE CARD */}
      <section className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">

        <div className="flex flex-col md:flex-row gap-6">

          {/* AVATAR */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="text-gray-400 w-12 h-12" />
              )}

              {isEditing && (
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                  <Camera className="text-white w-6 h-6" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* INFO */}
          <div className="flex-1 space-y-3">

            {/* EDIT MODE */}
            <div style={{ display: isEditing ? 'block' : 'none' }} className="space-y-2">
              <div className="text-sm text-blue-600">Completa los campos que quieras actualizar.</div>
              <input
                disabled
                value={profileData.username || ''}
                placeholder="Usuario"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                title="El nombre de usuario no puede ser cambiado"
              />
              <input
                disabled
                value={profileData.email || ''}
                placeholder="Email"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100 text-gray-500 cursor-not-allowed"
                title="El email no puede ser cambiado desde aquí"
              />
              <textarea
                value={profileData.bio || ''}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Biografía"
                rows={3}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={profileData.country || ''}
                  onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                  placeholder="País"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  value={profileData.city || ''}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  placeholder="Ciudad"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <input
                value={profileData.phone || ''}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="Teléfono"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* VIEW MODE */}
            <div style={{ display: isEditing ? 'none' : 'block' }} className="space-y-2">
              <h2 className="text-xl font-bold text-gray-800">{profileData.username}</h2>
              <p className="text-gray-500">{profileData.email}</p>
              {profileData.bio ? <p className="text-gray-600">{profileData.bio}</p> : <p className="text-gray-400">Aún no agregaste una biografía.</p>}
              {(profileData.city || profileData.country) ? (
                <p className="text-gray-500">📍 {profileData.city}, {profileData.country}</p>
              ) : (
                <p className="text-gray-400">Agrega tu ciudad y país.</p>
              )}
              {profileData.phone ? (
                <p className="text-gray-500">📱 {profileData.phone}</p>
              ) : (
                <p className="text-gray-400">Comparte tu teléfono si lo deseas.</p>
              )}
            </div>

            <p className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar size={16} />
              Miembro desde {profileData.joinDate}
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-2 justify-end mt-6">
          <div style={{ display: isEditing ? 'flex' : 'none' }} className="gap-2">
            <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-base font-semibold">✓</span> Guardar
            </button>
            <button type="button" onClick={handleCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <X size={18} /> Cancelar
            </button>
          </div>

          <div style={{ display: isEditing ? 'none' : 'block' }}>
            <button type="button" onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Edit2 size={18} /> Editar perfil
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Stat title="Ganancias Totales" value={`${formatNumber(profileData.totalEarnings)} BOOST`} />
        <Stat title="Tareas Completadas" value={formatNumber(profileData.completedTasks)} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="text-blue-600" size={18} />
            <h3 className="font-semibold text-gray-800">Estado de cuenta</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Plan</span><span className="font-medium text-gray-800">{user?.user_plan?.plan_name || user?.plan_name || 'Free'}</span></div>
            <div className="flex justify-between"><span>Balance</span><span className="font-medium text-gray-800">{formatNumber(user?.boost_balance || 0)} BOOST</span></div>
            <div className="flex justify-between"><span>Email verificado</span><span className="font-medium text-gray-800">{user?.is_email_verified ? 'Sí' : 'No'}</span></div>
            <div className="flex justify-between"><span>Activación financiera</span><span className="font-medium text-gray-800">{user?.has_financial_activation ? 'Sí' : 'No'}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="text-emerald-600" size={18} />
            <h3 className="font-semibold text-gray-800">SurveyMonkey</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <div className="flex justify-between"><span>Conexión</span><span className="font-medium text-gray-800">{surveyMonkeyConnected ? 'Conectado' : 'No conectado'}</span></div>
            {surveyMonkeyConnected && (
              <div className="text-xs text-gray-500">Usuario SM: {user?.surveymonkey_user_id || '---'}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleConnectSurveyMonkey}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            {surveyMonkeyConnected ? 'Re-conectar SurveyMonkey' : 'Conectar SurveyMonkey'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="text-emerald-600" size={18} />
            <h3 className="font-semibold text-gray-800">Invita amigos</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Comparte tu enlace y gana recompensas por cada referencia activa.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReferralLink}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              <Copy size={16} /> Copiar enlace
            </button>
          </div>
          {copyMessage && <p className="text-xs text-emerald-600 mt-2">{copyMessage}</p>}
          <p className="text-xs text-gray-400 mt-3 break-all">{referralLink}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock3 className="text-amber-600" size={18} />
            <h3 className="font-semibold text-gray-800">Actividad reciente</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><BadgeCheck size={16} className="text-blue-500" /> Tu cuenta está lista para seguir avanzando</li>
            <li className="flex items-center gap-2"><Sparkles size={16} className="text-purple-500" /> Completa tareas para activar más bonos</li>
            <li className="flex items-center gap-2"><Gift size={16} className="text-emerald-500" /> Invita a nuevos usuarios para aumentar tus recompensas</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

/* =======================
   REUSABLES
======================= */

const Stat = ({ title, value }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="text-xl font-bold text-gray-800">{value}</p>
  </div>
);

export default Profile;
