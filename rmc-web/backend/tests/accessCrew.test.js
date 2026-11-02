const test = require('node:test');
const assert = require('node:assert');
const { normaliseWorkers, normaliseVehicles } = require('../utils/accessCrew');

const rejects400 = (fn, pattern) => {
  assert.throws(fn, (err) => err.status === 400 && pattern.test(err.message));
};

test('the same worker twice is refused, however the CIN is spaced', () => {
  rejects400(
    () => normaliseWorkers([
      { name: 'Ali Ben Salah', cin: '12345678' },
      { name: 'Ali Ben Salah', cin: '12 345 678' },
    ]),
    /figure deux fois/
  );
});

test('the same plate twice is refused, whatever the case or spacing', () => {
  rejects400(
    () => normaliseVehicles([
      { type: 'Camionnette', matricule: '123 TU 4567' },
      { type: 'Camion', matricule: '123tu4567' },
    ]),
    /123tu4567 figure deux fois/
  );
});

test('empty rows are dropped and values trimmed', () => {
  assert.deepStrictEqual(
    normaliseWorkers([{ name: ' Sami ', cin: ' 0987 ' }, { name: '', cin: '' }]),
    [{ name: 'Sami', cin: '0987' }]
  );
  assert.deepStrictEqual(
    normaliseVehicles([{ type: '', matricule: '' }, { type: 'Van', matricule: '' }, { type: 'Van', matricule: '' }]),
    [{ type: 'Van', matricule: '' }, { type: 'Van', matricule: '' }]
  );
});

test('a worker without a CIN, or no worker at all, is refused', () => {
  rejects400(() => normaliseWorkers([{ name: 'Sami', cin: '' }]), /nom et un CIN/);
  rejects400(() => normaliseWorkers([]), /au moins un travailleur/);
  rejects400(() => normaliseWorkers('Sami'), /invalide/);
});

test('non-string values are not trusted as names or plates', () => {
  rejects400(() => normaliseWorkers([{ name: { $ne: '' }, cin: '1' }]), /nom et un CIN/);
  assert.deepStrictEqual(normaliseVehicles([{ type: 'Van', matricule: { $gt: '' } }]), [{ type: 'Van', matricule: '' }]);
});
