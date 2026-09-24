import React, { useState, useEffect, useContext } from 'react';
import { bonDeReceptionAPI, facturationAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './Facturation.css';

function Facturation() {
  const { user } = useContext(AuthContext);
  const [factures, setFactures] = useState([]);
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 0 = List of Factures, 1 = Select BDRs, 2 = Edit prices
  const [step, setStep] = useState(0); 

  const [selectedBonIds, setSelectedBonIds] = useState(new Set());
  const [prices, setPrices] = useState({}); // key: `${bonId}_${tacheIdx}` → prixUHT
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Invoice metadata
  const [factureNumber, setFactureNumber] = useState('');
  const [factureDate, setFactureDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientTel, setClientTel] = useState('');

  useEffect(() => {
    fetchFactures();
  }, []);

  const fetchFactures = async () => {
    setLoading(true);
    try {
      const res = await facturationAPI.getAll();
      setFactures(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startNewFacture = async () => {
    setLoading(true);
    try {
      // Load all available Bons that have NOT been billed yet
      const res = await bonDeReceptionAPI.getAll();
      // Filter logic: bons shouldn't have a facture assigned
      const availableBons = (res.data.data || []).filter(b => !b.facture && b.status === 'signed');
      setBons(availableBons);
      
      setSelectedBonIds(new Set());
      setPrices({});
      setFactureNumber('');
      setFactureDate(new Date().toISOString().slice(0, 10));
      setClientName('');
      setClientAddress('');
      setClientTel('');
      
      setStep(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── BDR selection ─────────────────────────────────────────
  const toggleBon = (id) => {
    setSelectedBonIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedBonIds(new Set(filteredBons.map(b => b._id)));
  const clearAll  = () => setSelectedBonIds(new Set());

  // ── Price helpers ─────────────────────────────────────────
  const getPrixUHT = (bonId, idx) => prices[`${bonId}_${idx}`] ?? '';
  const setPrixUHT = (bonId, idx, val) =>
    setPrices(prev => ({ ...prev, [`${bonId}_${idx}`]: val }));

  const getPrixTHT = (bonId, idx, quantite) => {
    const u = parseFloat(getPrixUHT(bonId, idx));
    if (isNaN(u) || u < 0) return null;
    return u * (quantite || 0);
  };

  const selectedBons = bons.filter(b => selectedBonIds.has(b._id));

  const lineItems = selectedBons.flatMap(bon =>
    (bon.taches || []).map((tache, idx) => ({ bon, tache, idx }))
  );

  const totalHT = lineItems.reduce((sum, { bon, tache, idx }) => {
    const t = getPrixTHT(bon._id, idx, tache.quantite);
    return sum + (t ?? 0);
  }, 0);

  const filteredBons = bons.filter(b => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      b.bonNumber?.toLowerCase().includes(s) ||
      b.clientName?.toLowerCase().includes(s) ||
      b.unite?.toLowerCase().includes(s)
    );
  });

  // ── Navigation ────────────────────────────────────────────
  const goToStep2 = () => {
    if (selectedBonIds.size === 0) return;
    const firstBon = bons.find(b => selectedBonIds.has(b._id));
    if (firstBon && !clientName) setClientName(firstBon.clientName || '');
    setStep(2);
    window.scrollTo(0, 0);
  };

  const backToStep1 = () => setStep(1);
  const cancelWizard = () => {
    setStep(0);
    fetchFactures();
  };

  // ── Create & Download Logic ─────────────────────────────────────────
  const triggerDownload = async (factureId, filenameNumber) => {
    try {
      const response = await facturationAPI.download(factureId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture-${filenameNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du téléchargement de la facture.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Les bons de réception liés seront débloqués.')) return;
    try {
      await facturationAPI.delete(id);
      fetchFactures();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression de la facture.');
    }
  };

  const handleGenerate = async () => {
    if (!factureNumber) {
      alert('Veuillez saisir le numéro de facture.');
      return;
    }
    setDownloading(true);
    try {
      const items = lineItems.map(({ bon, tache, idx }) => {
        const prixUHT = parseFloat(getPrixUHT(bon._id, idx)) || 0;
        const prixTHT = getPrixTHT(bon._id, idx, tache.quantite) || 0;
        return {
          description: [tache.description, tache.materielsNecessaires]
            .filter(Boolean).join(' - '),
          unite: tache.uniteQuantite || '',
          quantite: tache.quantite ?? 0,
          prixUHT,
          prixTHT
        };
      });

      const response = await facturationAPI.create({
        factureNumber,
        date: factureDate,
        clientName,
        clientAddress,
        clientTel,
        items,
        totalHT,
        bonIds: Array.from(selectedBonIds)
      });

      if (response.data.success) {
        const newFactureId = response.data.data._id;
        // Trigger download
        await triggerDownload(newFactureId, factureNumber);
        // Back to list
        cancelWizard();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur lors de la création de la facture.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="facturation-page">

      {/* ── Step 0: List View ── */}
      {step === 0 && (
        <>
          <div className="fact-section-header">
            <div>
              <h3>Historique de Facturation</h3>
              <p className="fact-hint">Gérez les factures générées et créez-en de nouvelles.</p>
            </div>
            <button className="btn-fact-primary" onClick={startNewFacture}>
              + Nouvelle Facture
            </button>
          </div>

          <div className="fact-table-wrapper">
            <table className="fact-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Bons Rattachés</th>
                  <th className="col-price">Total HT (TND)</th>
                  <th className="cell-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {factures.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                      Aucune facture générée.
                    </td>
                  </tr>
                ) : (
                  factures.map(fac => (
                    <tr key={fac._id}>
                      <td><span className="fact-bon-num-badge">{fac.factureNumber}</span></td>
                      <td>{new Date(fac.date).toLocaleDateString('fr-FR')}</td>
                      <td className="fact-desc-primary">{fac.clientName || '—'}</td>
                      <td className="cell-muted">{fac.bons?.length || 0} bon(s)</td>
                      <td className="col-price fact-prix-t has-value">{(fac.totalHT || 0).toFixed(3)}</td>
                      <td className="cell-center">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="btn-fact-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => triggerDownload(fac._id, fac.factureNumber)}
                          >
                            Télécharger Word
                          </button>
                          {user?.role === 'admin' && (
                            <button 
                              className="btn-fact-secondary btn-fact-delete" 
                              style={{ padding: '6px 12px', fontSize: '12px', color: '#EF4444', borderColor: '#FCA5A5' }}
                              onClick={() => handleDelete(fac._id)}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Step 1: Select BDRs ── */}
      {step === 1 && (
        <>
          <div className="fact-section-header">
            <div>
              <h3>Sélectionner les Bons de Réception</h3>
              <p className="fact-hint">
                {selectedBonIds.size === 0
                  ? 'Cochez un ou plusieurs bons à inclure dans la facture'
                  : `${selectedBonIds.size} bon(s) sélectionné(s) — ${lineItems.length} ligne(s)`}
              </p>
            </div>
            <div className="fact-step1-actions">
              <button className="btn-fact-secondary" onClick={cancelWizard} style={{ marginRight: '16px' }}>Annuler</button>
              <button className="btn-fact-secondary" onClick={selectAll}>Tout sélectionner</button>
              <button className="btn-fact-secondary" onClick={clearAll}>Tout désélectionner</button>
              <button
                className="btn-fact-primary"
                onClick={goToStep2}
                disabled={selectedBonIds.size === 0}
              >
                Continuer →
              </button>
            </div>
          </div>

          <div className="fact-search-bar">
            <input
              type="text"
              placeholder="Rechercher par numéro, client, unité..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredBons.length === 0 ? (
            <div className="no-data-card" style={{ textAlign: 'center', padding: '40px', background: '#f5f3ef', borderRadius: '16px' }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#003664' }}>Aucun bon de réception signé disponible à facturer.</p>
            </div>
          ) : (
            <div className="fact-bon-grid">
              {filteredBons.map(bon => {
                const selected = selectedBonIds.has(bon._id);
                return (
                  <div
                    key={bon._id}
                    className={`fact-bon-card ${selected ? 'selected' : ''}`}
                    onClick={() => toggleBon(bon._id)}
                  >
                    <div className="fact-bon-check">
                      <div className={`fact-checkbox ${selected ? 'checked' : ''}`}>
                        {selected && '✓'}
                      </div>
                    </div>
                    <div className="fact-bon-info">
                      <div className="fact-bon-number">{bon.bonNumber}</div>
                      <div className="fact-bon-client">{bon.clientName}</div>
                      <div className="fact-bon-meta">
                        <span className="fact-bon-unite">{bon.unite}</span>
                        <span className="fact-bon-taches">{bon.taches?.length || 0} tâche(s)</span>
                        <span
                          className="fact-bon-status"
                          style={{ color: bon.status === 'signed' ? '#27976A' : '#C26B1E' }}
                        >
                          {bon.status === 'signed' ? 'Signé' : 'Actif'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedBonIds.size > 0 && (
            <div className="fact-sticky-bar">
              <span>{selectedBonIds.size} bon(s) — {lineItems.length} ligne(s)</span>
              <button className="btn-fact-primary" onClick={goToStep2}>
                Continuer vers la facturation →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Step 2: Invoice info + prices ── */}
      {step === 2 && (
        <>
          <div className="fact-section-header">
            <div>
              <h3>Facturation</h3>
              <p className="fact-hint">
                {selectedBonIds.size} bon(s) · {lineItems.length} ligne(s)
              </p>
            </div>
            <div className="fact-step1-actions">
              <button className="btn-fact-secondary" onClick={backToStep1}>
                ← Retour
              </button>
              <button
                className="btn-fact-primary btn-fact-download"
                onClick={handleGenerate}
                disabled={downloading}
              >
                {downloading ? 'Enregistrement...' : 'Générer la Facture'}
              </button>
            </div>
          </div>

          {/* Invoice metadata form */}
          <div className="fact-meta-form">
            <div className="fact-meta-row">
              <div className="fact-meta-group required">
                <label>Facture N° *</label>
                <input
                  type="text"
                  value={factureNumber}
                  onChange={e => setFactureNumber(e.target.value)}
                  placeholder="Ex: CTN-LU3-008-2025"
                />
              </div>
              <div className="fact-meta-group">
                <label>Date</label>
                <input
                  type="date"
                  value={factureDate}
                  onChange={e => setFactureDate(e.target.value)}
                />
              </div>
              <div className="fact-meta-group">
                <label>Client</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Nom du client"
                />
              </div>
              <div className="fact-meta-group">
                <label>Adresse Client</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={e => setClientAddress(e.target.value)}
                  placeholder="Adresse"
                />
              </div>
              <div className="fact-meta-group">
                <label>Tél Client</label>
                <input
                  type="text"
                  value={clientTel}
                  onChange={e => setClientTel(e.target.value)}
                  placeholder="+216 ..."
                />
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="fact-table-wrapper">
            <table className="fact-table">
              <thead>
                <tr>
                  <th>N° Bon</th>
                  <th>Client</th>
                  <th>Désignation</th>
                  <th>Unité</th>
                  <th className="col-num">Qté</th>
                  <th className="col-price">Prix U HT (TND)</th>
                  <th className="col-price">Prix T HT (TND)</th>
                </tr>
              </thead>
              <tbody>
                {selectedBons.map(bon =>
                  (bon.taches || []).map((tache, idx) => {
                    const prixT = getPrixTHT(bon._id, idx, tache.quantite);
                    const hasPrice = getPrixUHT(bon._id, idx) !== '';
                    return (
                      <tr key={`${bon._id}_${idx}`} className={hasPrice ? 'row-priced' : ''}>
                        <td><span className="fact-bon-num-badge">{bon.bonNumber}</span></td>
                        <td className="cell-muted">{bon.clientName}</td>
                        <td>
                          {/* workType was removed from Planning; the fallback
                              chain it drove always resolved to description. */}
                          <div className="fact-desc-primary">
                            {tache.description || '—'}
                          </div>
                          {tache.materielsNecessaires && (
                            <div className="fact-desc-mat">{tache.materielsNecessaires}</div>
                          )}
                        </td>
                        <td className="cell-center">{tache.uniteQuantite || '—'}</td>
                        <td className="cell-center col-num">{tache.quantite ?? '—'}</td>
                        <td className="col-price">
                          <input
                            type="number"
                            className="fact-price-input"
                            value={getPrixUHT(bon._id, idx)}
                            onChange={e => setPrixUHT(bon._id, idx, e.target.value)}
                            placeholder="0.000"
                            step="0.001"
                            min="0"
                          />
                        </td>
                        <td className="col-price">
                          {prixT !== null ? (
                            <span className={`fact-prix-t ${prixT > 0 ? 'has-value' : ''}`}>
                              {prixT.toFixed(3)}
                            </span>
                          ) : (
                            <span className="cell-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="fact-total-row">
                  <td colSpan={6} className="fact-total-label">TOTAL NET</td>
                  <td className="fact-total-value">{totalHT.toFixed(3)} TND</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in words preview */}
          <div className="fact-words-preview">
            <span className="fact-words-label">Montant en lettres :</span>
            <span className="fact-words-value">{numberToFrenchWords(totalHT)}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── French number to words (client-side preview) ───────────────────────────
const ONES = [
  '', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf',
  'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize',
  'Dix-Sept', 'Dix-Huit', 'Dix-Neuf'
];
const TENS = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante'];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 7) { if (u === 0) return 'Soixante-Dix'; if (u === 1) return 'Soixante et Onze'; return 'Soixante-' + ONES[10 + u]; }
  if (t === 8) { if (u === 0) return 'Quatre-Vingts'; return 'Quatre-Vingt-' + ONES[u]; }
  if (t === 9) { if (u === 0) return 'Quatre-Vingt-Dix'; return 'Quatre-Vingt-' + ONES[10 + u]; }
  if (u === 0) return TENS[t];
  if (u === 1) return TENS[t] + ' et Un';
  return TENS[t] + '-' + ONES[u];
}

function belowThousand(n) {
  if (n < 100) return belowHundred(n);
  const h = Math.floor(n / 100), r = n % 100;
  const centWord = h === 1 ? 'Cent' : ONES[h] + ' Cent' + (r === 0 && h > 1 ? 's' : '');
  return r === 0 ? centWord : centWord + ' ' + belowHundred(r);
}

function integerToFrench(n) {
  if (n === 0) return 'Zéro';
  if (n < 1000) return belowThousand(n);
  if (n < 1000000) {
    const thou = Math.floor(n / 1000), rem = n % 1000;
    const w = thou === 1 ? 'Mille' : belowThousand(thou) + ' Mille';
    return rem === 0 ? w : w + ' ' + belowThousand(rem);
  }
  const mil = Math.floor(n / 1000000), rem = n % 1000000;
  const w = mil === 1 ? 'Un Million' : belowThousand(mil) + ' Millions';
  return rem === 0 ? w : w + ' ' + integerToFrench(rem);
}

function numberToFrenchWords(n) {
  const num = parseFloat(n) || 0;
  // Round to millimes before splitting. Rounding the fraction on its own turned
  // 1.9999 into "Un et Mille Millimes" instead of "Deux".
  // Kept in sync with backend/utils/generateFacturationDocument.js.
  const totalMillimes = Math.round(num * 1000);
  const intPart = Math.floor(totalMillimes / 1000);
  const milPart = totalMillimes % 1000;
  let result = integerToFrench(intPart);
  if (milPart > 0) result += ' et ' + integerToFrench(milPart) + ' Millimes';
  return result + ' Dinars HT';
}

export default Facturation;
