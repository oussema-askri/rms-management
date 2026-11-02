// Workers and vehicles on a demande d'accès.
//
// The form let the same employee or the same vehicle be added any number of
// times, and the server stored whatever it was sent, so a permit could list
// one person twice. Duplicates are now refused here, for every client.

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// "12 345 678" and "12345678" are the same CIN; "123 tu 4567" and "123 TU 4567"
// the same plate.
const identityKey = (value) => text(value).replace(/\s+/g, '').toUpperCase();

const normaliseWorkers = (workers) => {
  if (!Array.isArray(workers)) {
    throw badRequest('La liste des travailleurs est invalide.');
  }

  const seen = new Map();
  const result = [];
  workers.forEach((worker) => {
    const name = text(worker && worker.name);
    const cin = text(worker && worker.cin);
    if (!name && !cin) return; // an untouched empty row
    if (!name || !cin) {
      throw badRequest('Chaque travailleur doit avoir un nom et un CIN.');
    }

    const key = identityKey(cin);
    if (seen.has(key)) {
      throw badRequest(`${name} (CIN ${cin}) figure deux fois dans la liste des travailleurs.`);
    }
    seen.set(key, true);
    result.push({ name, cin });
  });

  if (result.length === 0) {
    throw badRequest('Ajoutez au moins un travailleur.');
  }
  return result;
};

const normaliseVehicles = (vehicles) => {
  if (vehicles === undefined || vehicles === null) return [];
  if (!Array.isArray(vehicles)) {
    throw badRequest('La liste des véhicules est invalide.');
  }

  const seen = new Set();
  const result = [];
  vehicles.forEach((vehicle) => {
    const type = text(vehicle && vehicle.type);
    const matricule = text(vehicle && vehicle.matricule);
    if (!type && !matricule) return;

    // Two vans whose plates are not known yet are two vehicles; the same plate
    // twice is one vehicle listed twice.
    if (matricule) {
      const key = identityKey(matricule);
      if (seen.has(key)) {
        throw badRequest(`Le véhicule ${matricule} figure deux fois dans la liste des véhicules.`);
      }
      seen.add(key);
    }
    result.push({ type, matricule });
  });
  return result;
};

module.exports = { normaliseWorkers, normaliseVehicles, identityKey };
