const express = require('express');
const router = express.Router();
const Planning = require('../models/Planning');
const { protect, authorize } = require('../middleware/auth');
const { withDuplicateRetry } = require('../utils/retry');
const BonDeReception = require('../models/BonDeReception');
const Client = require('../models/Client');

// Put a completed task on its unit's open bon de réception, opening one if
// there is none. `planning` must have `client` populated.
const addTaskToBon = async (planning) => {
  // A task toggled completed -> pending -> completed would otherwise be
  // added to the bon twice.
  const alreadyOnBon = await BonDeReception.exists({
    'taches.planning': planning._id
  });

  if (!alreadyOnBon) {
    const tache = {
      planning: planning._id,
      description: planning.description,
      materielsNecessaires: planning.materielsNecessaires,
      quantite: planning.quantite,
      uniteQuantite: planning.uniteQuantite,
      dateCompleted: Date.now(),
      assignedWorkers: planning.assignedWorkers
    };

    // Append to the open slip for this unit if there is one. A conditional
    // update avoids the read-then-write window where two tasks completed at
    // once would each create their own slip.
    const appended = await BonDeReception.findOneAndUpdate(
      {
        client: planning.client._id,
        uniteNumber: planning.uniteNumber,
        status: 'active'
      },
      { $push: { taches: tache } },
      { new: true }
    );

    if (!appended) {
      // No open slip: create one. The number comes from a pre-validate hook
      // that reads the current maximum, so a fresh document is built on each
      // retry; reusing the same one would carry the rejected number forward.
      await withDuplicateRetry(async () => {
        const doc = new BonDeReception({
          client: planning.client._id,
          clientName: planning.clientName,
          clientNumber: planning.client.clientNumber,
          unite: planning.unite,
          uniteNumber: planning.uniteNumber,
          status: 'active',
          taches: [tache]
        });
        await doc.save();
        return doc;
      });
    }
  }
};

// Each worker once: the form allowed picking the same person twice, which
// doubled them on the bon and in the pointage pre-fill.
const uniqueWorkers = (workers) => {
  if (workers === undefined) return undefined;
  if (!Array.isArray(workers)) {
    const err = new Error('La liste des travailleurs est invalide.');
    err.status = 400;
    throw err;
  }
  return [...new Set(workers.filter(Boolean).map(String))];
};

// Get all planning entries
// Update the getAll route
router.get('/', protect, async (req, res, next) => {
  try {
    const planning = await Planning.find()
      .populate('createdBy', 'name email')
      .populate('assignedWorkers', 'name cin')
      .populate('client', 'name clientNumber email')  // ADD THIS
      .sort({ createdAt: -1 });

    res.json({ success: true, data: planning });
  } catch (error) {
    next(error);
  }
});

// Get single planning entry by ID
router.get('/materiels/distinct', protect, async (req, res, next) => {
  try {
    const materiels = await Planning.distinct('materielsNecessaires');
    const filtered = materiels.filter(m => m && m.trim() !== '');
    res.json({ success: true, data: filtered });
  } catch (error) {
    next(error);
  }
});

// Get single planning entry by ID
router.get('/:id', protect, async (req, res, next) => {
  try {
    const planning = await Planning.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedWorkers', 'name cin')
      .populate('client', 'name clientNumber email');

    if (!planning) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    res.json({ success: true, data: planning });
  } catch (error) {
    next(error);
  }
});

// Create new planning entry.
// Was open to every signed-in role; employers are not given the action in
// either interface, so the server now says the same.
router.post('/', protect, authorize('rh', 'admin', 'responsable', 'comptable'), async (req, res, next) => {
  try {
    const { 
      client, clientName, unite, uniteNumber, 
      sousTitre, sousTitreRef, 
      description, materielsNecessaires,
      date, quantite, uniteQuantite, assignedWorkers, status 
    } = req.body;

    // An archived client has left the lists on purpose; new work for it is a
    // mistake, usually a form left open since before it was archived.
    if (client && await Client.exists({ _id: client, archived: true })) {
      return res.status(409).json({ message: 'Ce client est archivé. Restaurez-le avant de lui ajouter des tâches.' });
    }

    const planning = new Planning({
      client,
      clientName,
      unite,
      uniteNumber,
      sousTitre,
      sousTitreRef,
      description,
      materielsNecessaires: materielsNecessaires || '',
      date,
      quantite: quantite || 1,
      // 'FTF' matches the model default and the options offered by the forms.
      uniteQuantite: uniteQuantite || 'FTF',
      assignedWorkers: uniqueWorkers(assignedWorkers) || [],
      status: status || 'pending',
      createdBy: req.user.id
    });

    await planning.save();

    const populatedPlanning = await Planning.findById(planning._id)
      .populate('createdBy', 'name email')
      .populate('assignedWorkers', 'name cin')
      .populate('client', 'name clientNumber email');

    // A task created already completed used to skip the bon entirely, since
    // only the update route added work to one, so it could never be invoiced.
    if (populatedPlanning.status === 'completed' && populatedPlanning.client) {
      try {
        await addTaskToBon(populatedPlanning);
      } catch (bonError) {
        console.error('Adding new task to bon failed, keeping it pending:', bonError);
        await Planning.updateOne({ _id: planning._id }, { status: 'pending' });
        return res.status(500).json({
          message: "La tâche a été créée en attente: elle n'a pas pu être ajoutée au bon de réception. Marquez-la terminée pour réessayer.",
        });
      }
    }

    res.status(201).json({ success: true, data: populatedPlanning });
  } catch (error) {
    // A missing field is a validation error, which the central handler answers
    // as a 400; this used to be a 500 carrying the raw Mongoose message.
    next(error);
  }
});

// Delete planning entry
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    // A completed task is copied onto a receipt slip. Deleting it left the slip
    // holding a line that referenced nothing, which then flowed into invoices.
    const onBon = await BonDeReception.exists({ 'taches.planning': req.params.id });
    if (onBon) {
      return res.status(409).json({
        message: 'Impossible de supprimer cette tâche: elle figure sur un bon de réception.'
      });
    }

    const planning = await Planning.findByIdAndDelete(req.params.id);

    if (!planning) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    res.json({ success: true, message: 'Tâche supprimée' });
  } catch (error) {
    next(error);
  }
});


// Fields a client is allowed to change. Passing req.body straight to
// findByIdAndUpdate also let callers rewrite createdBy and createdAt.
const PLANNING_UPDATABLE = [
  'client', 'clientName', 'unite', 'uniteNumber', 'sousTitre', 'sousTitreRef',
  'description', 'materielsNecessaires', 'date', 'quantite',
  'uniteQuantite', 'status', 'assignedWorkers'
];

router.put('/:id', protect, authorize('rh', 'admin'), async (req, res, next) => {
  try {
    let planning = await Planning.findById(req.params.id);

    if (!planning) {
      return res.status(404).json({ message: 'Tâche introuvable' });
    }

    const previousStatus = planning.status;
    const wasCompleted = previousStatus === 'completed';
    const isNowCompleted = req.body.status === 'completed';

    const updates = { updatedAt: Date.now() };
    PLANNING_UPDATABLE.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (updates.assignedWorkers !== undefined) {
      updates.assignedWorkers = uniqueWorkers(updates.assignedWorkers);
    }

    // Update planning
    planning = await Planning.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('assignedWorkers', 'name cin')
     .populate('client', 'name clientNumber');

    // If status changed to 'completed', add to Bon de Réception
    if (!wasCompleted && isNowCompleted && planning.client) {
      // The status is already saved as completed at this point. If adding the
      // task to a bon fails, put the old status back: otherwise a retry sees
      // wasCompleted and skips this step, and the work never reaches a bon or
      // an invoice.
      try {
        await addTaskToBon(planning);
      } catch (bonError) {
        console.error('Adding task to bon failed, reverting status:', bonError);
        await Planning.updateOne({ _id: planning._id }, { status: previousStatus });
        return res.status(500).json({
          message: "La tâche n'a pas pu être ajoutée au bon de réception. Réessayez.",
        });
      }
    }

    res.json({ success: true, data: planning });
  } catch (error) {
    next(error);
  }
});
module.exports = router;