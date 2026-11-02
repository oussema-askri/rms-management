import React, { useState, useEffect, useContext } from 'react';
import { clientAPI, unwrapList } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import ClientForm from './ClientForm';
import UniteModal from './UniteModal';
import './ClientList.css';
import { openFile } from '../../services/files';
import useAutoRefresh from '../../hooks/useAutoRefresh';

function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUniteModal, setShowUniteModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [notice, setNotice] = useState(null);
  const { isRH, isAdmin, user } = useContext(AuthContext);
  // POST /clients is restricted to these roles on the server.
  const canCreateClient = ['admin', 'rh', 'responsable', 'comptable'].includes(user?.role);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const fetchClients = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await clientAPI.getAll(showArchived ? { archived: 'true' } : undefined);
      const clientsData = unwrapList(response);
      setClients(clientsData);
      return clientsData;
    } catch (error) {
      console.error('Error fetching clients:', error);
      // A failed background refresh keeps the list already on screen; only a
      // failed first load falls back to empty.
      if (!silent) setClients([]);
      return [];
    } finally {
      setLoading(false);
    }
  };
  useAutoRefresh(fetchClients);

  // The unite modal renders from the selectedClient snapshot, so refetching the
  // list alone left it showing stale unites until it was closed and reopened.
  const refreshAfterUniteChange = async () => {
    const fresh = await fetchClients();
    if (!selectedClient) return;
    const updated = (fresh || []).find(c => c._id === selectedClient._id);
    if (updated) setSelectedClient(updated);
  };

  const handleEdit = (client) => {
    setEditData(client);
    setShowForm(true);
  };

  // A client with tasks or bons is archived by the server rather than deleted,
  // so its history stays intact. Either way it leaves this list, and the
  // server's message says which happened. The old handler showed a bare
  // "Échec de la suppression" whatever the reason.
  const handleDelete = async (client) => {
    if (!window.confirm(
      `Supprimer le client « ${client.name} » ?\n\n` +
      "S'il a des tâches ou des bons de réception, il sera archivé : il disparaît des listes mais son historique est conservé."
    )) return;
    try {
      const response = await clientAPI.delete(client._id);
      setNotice({ type: 'success', text: response.data?.message || 'Client supprimé' });
      fetchClients();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Échec de la suppression' });
    }
  };

  const handleRestore = async (client) => {
    try {
      await clientAPI.restore(client._id);
      setNotice({ type: 'success', text: `Client « ${client.name} » restauré.` });
      fetchClients();
    } catch (error) {
      setNotice({ type: 'error', text: error.response?.data?.message || 'Échec de la restauration' });
    }
  };

  const handleManageUnites = (client) => {
    setSelectedClient(client);
    setShowUniteModal(true);
  };

  const viewDocument = (filePath) => openFile(filePath);

  const closeModals = () => {
    setShowForm(false);
    setShowUniteModal(false);
    setEditData(null);
    setSelectedClient(null);
  };

  const filteredClients = (clients || []).filter(client => {
    if (!client) return false;
    const search = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(search) ||
      client.clientNumber?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="loading">Chargement des clients...</div>;
  }

  return (
    <div className="client-list">
      {/* Header */}
      <div className="list-header">
        <div>
          <h2>{showArchived ? 'Clients archivés' : 'Fichier Clients'}</h2>
          <p className="subtitle">
            {showArchived ? `${clients.length} client(s) archivé(s)` : `${clients.length} client(s) enregistré(s)`}
          </p>
        </div>
        {canCreateClient && !showArchived && (
          <button onClick={() => setShowForm(true)} className="btn-new">
            <span className="material-symbols-outlined" style={{fontSize: 18}}>add</span>
            Nouveau Client
          </button>
        )}
      </div>

      {notice && (
        <div className={`client-notice client-notice--${notice.type}`} role="status">
          <span className="material-symbols-outlined">{notice.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Search and active/archived switch */}
      <div className="client-toolbar">
      <div className="search-bar">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder="Rechercher par nom, numéro, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      {(isRH || isAdmin) && (
        <div className="client-view-toggle" role="tablist">
          <button type="button" role="tab" aria-selected={!showArchived}
            className={!showArchived ? 'active' : ''} onClick={() => setShowArchived(false)}>
            Actifs
          </button>
          <button type="button" role="tab" aria-selected={showArchived}
            className={showArchived ? 'active' : ''} onClick={() => setShowArchived(true)}>
            Archivés
          </button>
        </div>
      )}
      </div>

      {/* Client Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="no-data-card">
          <p>{showArchived ? 'Aucun client archivé' : 'Aucun client trouvé'}</p>
          {canCreateClient && !showArchived && (
            <button onClick={() => setShowForm(true)} className="btn-create-first">
              Créer le Premier Client
            </button>
          )}
        </div>
      ) : (
        <div className="client-cards-grid">
          {filteredClients.map(client => (
            <div key={client._id} className={`client-card${client.archived ? ' is-archived' : ''}`}>
              {/* Card Header */}
              <div className="client-card-header">
                <div className="client-card-identity">
                  <div className="client-avatar">
                    {client.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="client-card-name">{client.name}</h3>
                    <span className="client-number-badge">#{client.clientNumber}</span>
                    {client.archived && <span className="client-archived-badge">Archivé</span>}
                  </div>
                </div>
                <div className="client-card-actions">
                  {client.archived ? (
                    (isRH || isAdmin) && (
                      <button
                        onClick={() => handleRestore(client)}
                        className="btn-restore"
                        title="Remettre ce client dans la liste active"
                      >
                        <span className="material-symbols-outlined">unarchive</span>
                        Restaurer
                      </button>
                    )
                  ) : (<>
                  <button
                    onClick={() => handleManageUnites(client)}
                    className="btn-icon"
                    title="Gérer les unités"
                  >
                    <span className="material-symbols-outlined">apartment</span>
                  </button>
                  {(isRH || isAdmin) && (
                    <button
                      onClick={() => handleEdit(client)}
                      className="btn-icon"
                      title="Modifier"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  )}
                  {(isRH || isAdmin) && (
                    <button
                      onClick={() => handleDelete(client)}
                      className="btn-icon btn-icon-danger"
                      title="Supprimer"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                  </>)}
                </div>
              </div>

              {/* Card Body */}
              <div className="client-card-body">
                <div className="client-detail-row">
                  <span className="material-symbols-outlined detail-icon">mail</span>
                  <span className="detail-text">{client.email || '—'}</span>
                </div>
                <div className="client-detail-row">
                  <span className="material-symbols-outlined detail-icon">call</span>
                  <span className="detail-text">{client.telephone || '—'}</span>
                </div>
                <div className="client-detail-row">
                  <span className="material-symbols-outlined detail-icon">location_on</span>
                  <span className="detail-text detail-truncate">{client.address || '—'}</span>
                </div>
                {client.departement && (
                  <div className="client-detail-row">
                    <span className="material-symbols-outlined detail-icon">business</span>
                    <span className="detail-text">{client.departement}</span>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="client-card-footer">
                <div className="client-tags">
                  <span className="tag tag-primary">{client.devise || 'TND'}</span>
                  <span className="tag tag-outline">{client.modePaiement || 'N/A'}</span>
                  <span className="tag tag-muted">TVA {client.tvaPercentage ?? 19}%</span>
                </div>
                <div className="client-footer-meta">
                  <div className="units-badge" onClick={() => handleManageUnites(client)} title="Voir les unités">
                    <span className="material-symbols-outlined" style={{fontSize: 14}}>apartment</span>
                    <span>{client.unites?.length || 0} unité(s)</span>
                  </div>
                  {client.pieceJointe?.length > 0 && (
                    <div className="docs-badge">
                      {client.pieceJointe.map((file, index) => (
                        <button
                          key={index}
                          onClick={() => viewDocument(file.filePath)}
                          className="doc-link"
                          title={file.fileName}
                        >
                          <span className="material-symbols-outlined" style={{fontSize: 14}}>description</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ClientForm
          onClose={closeModals}
          onSuccess={fetchClients}
          editData={editData}
        />
      )}

      {showUniteModal && (
        <UniteModal
          key={selectedClient?._id}
          client={selectedClient}
          onClose={closeModals}
          onSuccess={refreshAfterUniteChange}
        />
      )}
    </div>
  );
}

export default ClientList;
